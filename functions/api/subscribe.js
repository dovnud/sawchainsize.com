import { CONSENT, hashIp, originAllowed, parseRequest } from '../lib/subscribe.js';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_IN_WINDOW = 5;
const RETAIN_MS = 24 * 60 * 60 * 1000;

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

function wantsHtml(request) {
  const accept = request.headers.get('accept') || '';
  if (accept.includes('application/json')) return false;
  return accept.includes('text/html');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function respond(request, status, message, extra = {}) {
  if (wantsHtml(request)) {
    const back = typeof extra.page_url === 'string' && extra.page_url.startsWith('/saws/') ? extra.page_url : '/';
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Request</title><body style="font-family:system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem"><p>${escapeHtml(message)}</p><p><a href="${escapeHtml(back)}">Back</a></p></body></html>`;
    return new Response(html, {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      },
    });
  }
  const body = { ok: status < 400, message };
  if (typeof extra.stored === 'boolean') body.stored = extra.stored;
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function readFields(request) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > 8000) return { error: 'That request is too large.' };
  const type = (request.headers.get('content-type') || '').toLowerCase();
  if (type.includes('application/json')) {
    const text = await request.text();
    if (text.length > 8000) return { error: 'That request is too large.' };
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: 'That request could not be read.' };
      const fields = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') fields[key] = value;
        else if (typeof value === 'number' && Number.isFinite(value)) fields[key] = String(value);
      }
      return { fields };
    } catch {
      return { error: 'That request could not be read.' };
    }
  }
  try {
    const form = await request.formData();
    const fields = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string' && fields[key] === undefined) fields[key] = value;
    }
    return { fields };
  } catch {
    return { error: 'That request could not be read.' };
  }
}

async function turnstileOk(request, env, token) {
  const secret = env.TURNSTILE_SECRET;
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) body.set('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => null);
  if (!data?.success) return false;
  const host = String(data.hostname || '');
  return host === 'sawchainsize.com'
    || host === 'www.sawchainsize.com'
    || host === 'sawchainsize-site.pages.dev'
    || host.endsWith('.sawchainsize-site.pages.dev')
    || host === 'localhost'
    || host === '127.0.0.1';
}

async function noteHit(env, ipHash, nowIso, retainStart) {
  await env.DB.prepare('DELETE FROM subscribe_hits WHERE created_at < ?').bind(retainStart).run();
  await env.DB.prepare('INSERT INTO subscribe_hits (ip_hash, created_at) VALUES (?, ?)').bind(ipHash, nowIso).run();
}

export async function handleSubscribe(request, env) {
  if (!originAllowed(request.headers.get('origin'))) {
    return respond(request, 403, 'This request was refused.');
  }

  const read = await readFields(request);
  if (read.error) return respond(request, 400, read.error);

  const now = new Date();
  const nowIso = now.toISOString();
  const windowStart = new Date(now.getTime() - WINDOW_MS).toISOString();
  const retainStart = new Date(now.getTime() - RETAIN_MS).toISOString();
  const ipHash = await hashIp(request.headers.get('cf-connecting-ip') || '');

  const parsed = parseRequest(read.fields);
  if (parsed.ok && parsed.honeypot) {
    if (env.DB) {
      try {
        const count = await env.DB.prepare(
          'SELECT COUNT(*) AS n FROM subscribe_hits WHERE ip_hash = ? AND created_at > ?',
        ).bind(ipHash, windowStart).first('n');
        if (Number(count || 0) < MAX_IN_WINDOW) await noteHit(env, ipHash, nowIso, retainStart);
      } catch { /* still pretend success */ }
    }
    return respond(request, 200, `Request stored. ${CONSENT}`, { stored: true });
  }
  if (!parsed.ok) return respond(request, parsed.status, parsed.message);

  if (!env.DB) return respond(request, 503, 'Storage is not available yet.', { page_url: parsed.record.page_url });

  const count = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM subscribe_hits WHERE ip_hash = ? AND created_at > ?',
  ).bind(ipHash, windowStart).first('n');
  if (Number(count || 0) >= MAX_IN_WINDOW) {
    return respond(request, 429, 'Too many requests from this network. Try again later.', { page_url: parsed.record.page_url });
  }
  await noteHit(env, ipHash, nowIso, retainStart);

  const token = String(read.fields['cf-turnstile-response'] || '');
  if (!(await turnstileOk(request, env, token))) {
    return respond(request, 400, 'Verification did not complete. Reload the page and try again.', { page_url: parsed.record.page_url });
  }

  const { email, page_url, purpose, extra, consent_text } = parsed.record;
  let stored = false;
  try {
    const inserted = await env.DB.prepare(
      `INSERT INTO subscribers (email, page_url, purpose, extra, consent_text, created_at, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (email, purpose, extra) DO NOTHING`,
    ).bind(email, page_url, purpose, extra, consent_text, nowIso, ipHash).run();
    stored = Number(inserted?.meta?.changes || 0) > 0;
  } catch (err) {
    if (!/UNIQUE/i.test(String(err?.message || err))) throw err;
  }

  const message = stored
    ? `Request stored. ${CONSENT}`
    : `This request is already stored. ${CONSENT}`;
  return respond(request, 200, message, { stored, page_url });
}

export async function onRequestPost(context) {
  try {
    return await handleSubscribe(context.request, context.env || {});
  } catch {
    return respond(context.request, 500, 'Could not store the request.');
  }
}
