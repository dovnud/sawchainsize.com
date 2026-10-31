/** Stored-request capture. Nothing in this module sends mail. */

export const CONSENT = "We'll only use your email for this request.";

const HONEYPOTS = ['fax_number', 'company', 'website'];

export function isHoneypot(fields) {
  return HONEYPOTS.some((key) => String(fields?.[key] ?? '').trim() !== '');
}

export function isEmail(value) {
  if (typeof value !== 'string') return false;
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return false;
  if (email.includes(' ') || email.includes('..')) return false;
  const at = email.indexOf('@');
  if (at < 1 || at !== email.lastIndexOf('@')) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || domain.length > 253) return false;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false;
  if (!/^[a-z0-9.-]+$/.test(domain)) return false;
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  if (labels.some((label) => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-'))) return false;
  return true;
}

export function originAllowed(origin) {
  if (!origin) return false;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const host = url.hostname;
  if (url.protocol === 'https:') {
    return host === 'sawchainsize.com'
      || host === 'www.sawchainsize.com'
      || host === 'sawchainsize-site.pages.dev'
      || host.endsWith('.sawchainsize-site.pages.dev');
  }
  if (url.protocol === 'http:') return host === 'localhost' || host === '127.0.0.1';
  return false;
}

export function normalizePage(input) {
  let raw = String(input ?? '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    let url;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }
    if (!originAllowed(url.origin)) return null;
    raw = url.pathname;
  }
  if (!raw.startsWith('/')) raw = `/${raw}`;
  if (!raw.endsWith('/')) raw = `${raw}/`;
  if (!/^\/saws\/[a-z0-9-]+\/$/.test(raw)) return null;
  return raw;
}

export function canonicalExtra(obj) {
  const sorted = {};
  for (const key of Object.keys(obj).sort()) sorted[key] = obj[key];
  return JSON.stringify(sorted);
}

/**
 * @returns {{ ok: true, honeypot: true } | { ok: true, honeypot: false, record: { email: string, page_url: string, purpose: string, extra: string, consent_text: string } } | { ok: false, status: number, message: string }}
 */
export function parseRequest(fields) {
  if (isHoneypot(fields)) return { ok: true, honeypot: true };

  const email = String(fields?.email ?? '').trim().toLowerCase();
  if (!isEmail(email)) return { ok: false, status: 400, message: 'Enter an email address.' };

  const purpose = String(fields?.purpose ?? '').trim();
  if (purpose !== 'chain-specs' && purpose !== 'sharpen-replace') {
    return { ok: false, status: 400, message: 'Choose a request type.' };
  }

  const page_url = normalizePage(fields?.page_url);
  const saw_id = String(fields?.saw_id ?? '').trim();
  const slug = page_url ? page_url.slice('/saws/'.length, -1) : '';
  if (!page_url || !/^[a-z0-9-]{1,80}$/.test(saw_id) || saw_id !== slug) {
    return { ok: false, status: 400, message: 'This form only stores a request from a saw page.' };
  }

  const saw = String(fields?.saw ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (saw.length < 1 || saw.length > 80 || /[<>]/.test(saw)) {
    return { ok: false, status: 400, message: 'The saw name on this page could not be read.' };
  }

  const barRaw = String(fields?.bar_length ?? '').trim();
  if (!/^\d{1,2}$/.test(barRaw)) return { ok: false, status: 400, message: 'Choose a bar length.' };
  const barNum = Number(barRaw);
  if (barNum < 4 || barNum > 72) return { ok: false, status: 400, message: 'Choose a bar length.' };

  const extra = { bar_length: String(barNum), saw, saw_id };
  if (purpose === 'sharpen-replace') {
    const kind = String(fields?.kind ?? '').trim();
    if (kind !== 'sharpen' && kind !== 'replace') {
      return { ok: false, status: 400, message: 'Choose sharpen or replace.' };
    }
    extra.kind = kind;
  }

  if (String(fields?.consent ?? '').trim() !== 'yes' || String(fields?.consent_text ?? '') !== CONSENT) {
    return { ok: false, status: 400, message: 'Confirm the consent line to store this request.' };
  }

  return {
    ok: true,
    honeypot: false,
    record: {
      email,
      page_url,
      purpose,
      extra: canonicalExtra(extra),
      consent_text: CONSENT,
    },
  };
}

export async function hashIp(ip) {
  const data = new TextEncoder().encode(`sawchainsize-subscribers\n${ip || 'unknown'}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
