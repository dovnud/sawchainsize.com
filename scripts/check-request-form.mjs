import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { handleSubscribe } from '../functions/api/subscribe.js';

const rows = [];
const hits = [];
const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first(col) {
            if (!sql.includes('COUNT')) return null;
            const [ip, since] = args;
            const n = hits.filter((hit) => hit.ip_hash === ip && hit.created_at > since).length;
            return col ? n : { n };
          },
          async run() {
            if (sql.includes('DELETE FROM subscribe_hits')) {
              const [cutoff] = args;
              for (let i = hits.length - 1; i >= 0; i -= 1) if (hits[i].created_at < cutoff) hits.splice(i, 1);
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes('INSERT INTO subscribe_hits')) {
              hits.push({ ip_hash: args[0], created_at: args[1] });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes('INSERT INTO subscribers')) {
              const rec = {
                email: args[0], page_url: args[1], purpose: args[2], extra: args[3],
                consent_text: args[4], created_at: args[5], ip_hash: args[6],
              };
              if (rows.some((row) => row.email === rec.email && row.purpose === rec.purpose && row.extra === rec.extra)) {
                return { success: true, meta: { changes: 0 } };
              }
              rows.push(rec);
              return { success: true, meta: { changes: 1 } };
            }
            throw new Error(sql);
          },
        };
      },
    };
  },
};

const root = path.resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

function fileFor(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const rel = clean.replace(/^\/+/, '');
  const candidates = [path.join(root, rel), path.join(root, rel, 'index.html')];
  return candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) || null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/api/subscribe') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value);
    }
    headers.set('origin', 'http://localhost');
    headers.set('cf-connecting-ip', '203.0.113.50');
    const request = new Request('http://localhost/api/subscribe', { method: 'POST', headers, body });
    const response = await handleSubscribe(request, { DB: db });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  const file = req.method === 'GET' ? fileFor(url.pathname) : null;
  if (!file) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const thirdParty = [];
const logs = [];
page.on('console', (msg) => logs.push(`${msg.type()}: ${msg.text()}`));
page.on('requestfailed', (request) => logs.push(`failed ${request.url()} ${request.failure()?.errorText || ''}`));
page.on('request', (request) => {
  const host = new URL(request.url()).hostname;
  if (host && host !== '127.0.0.1') thirdParty.push(request.url());
});

try {
  // The challenge host did not resolve in this environment (Turnstile error 600010),
  // so this check fulfills the widget script locally. Production still loads Turnstile on submit.
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'window.turnstile={render:function(el,opts){window.turnstile._cb=opts.callback;return "local";},execute:function(){if(window.turnstile._cb)window.turnstile._cb("local-token");},reset:function(){},remove:function(){}};',
    });
  });
  await page.goto(`${base}/saws/stihl-ms-261/`, { waitUntil: 'networkidle' });
  const cookie = page.locator('#cookieOk');
  if (await cookie.isVisible()) await cookie.click();
  const before = thirdParty.filter((url) => url.includes('turnstile') || url.includes('challenges.cloudflare.com'));
  if (before.length) throw new Error(`Turnstile loaded before submit: ${before.join(' ')}`);
  const heading = page.locator('#email-specs-title');
  await heading.scrollIntoViewIfNeeded();
  if ((await heading.textContent())?.trim() !== 'Email me my chain specs') throw new Error(`missing hook: ${await heading.textContent()}`);
  if (await page.locator('#email-specs dialog, #email-specs [role="dialog"]').count()) throw new Error('form is a popup');
  const formPosition = await page.locator('#email-specs').evaluate((el) => getComputedStyle(el).position);
  if (formPosition === 'fixed' || formPosition === 'sticky') throw new Error(`form position ${formPosition}`);
  await page.locator('#req-bar').selectOption('16');
  await page.locator('input[name="purpose"][value="chain-specs"]').check();
  await page.locator('#req-email').fill('saw-request@example.com');
  await page.locator('input[name="consent"]').check();
  await page.screenshot({ path: '/tmp/request-form.png' });
  await page.locator('#email-specs-form button[type="submit"]').click();
  await page.waitForFunction(() => {
    const el = document.querySelector('#email-specs-form [data-status]');
    return el && /Request stored|Could not store|Verification/.test(el.textContent || '');
  }, null, { timeout: 20000 });
  const status = await page.locator('#email-specs-form [data-status]').innerText();
  if (!status.includes("We'll only use your email for this request.")) {
    throw new Error(`unexpected status: ${status}\n${logs.join('\n')}\n${thirdParty.join('\n')}`);
  }
  if (!rows.some((row) => row.email === 'saw-request@example.com' && row.purpose === 'chain-specs' && row.extra.includes('"bar_length":"16"'))) {
    throw new Error(`row missing ${JSON.stringify(rows)}`);
  }
  await page.locator('input[name="purpose"][value="sharpen-replace"]').check();
  await page.locator('input[name="kind"][value="replace"]').check();
  await page.locator('#req-email').fill('reminder@example.com');
  await page.locator('#email-specs-form button[type="submit"]').click();
  await page.waitForFunction(() => /Request stored/.test(document.querySelector('#email-specs-form [data-status]')?.textContent || ''), null, { timeout: 20000 });
  if (!rows.some((row) => row.purpose === 'sharpen-replace' && row.extra.includes('"kind":"replace"'))) {
    throw new Error(`reminder missing ${JSON.stringify(rows)}`);
  }
  await page.screenshot({ path: '/tmp/request-stored.png', fullPage: false });
  await page.goto(`${base}/privacy/`, { waitUntil: 'domcontentloaded' });
  const privacy = await page.locator('body').innerText();
  if (!privacy.includes('contact@sawchainsize.com')) throw new Error('privacy missing contact address');
  if (!privacy.includes('only deletion path')) throw new Error('privacy missing deletion path');
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  if (await page.locator('#email-specs').count()) throw new Error('form on home');
  console.log(JSON.stringify({ ok: true, port, rows: rows.length, thirdPartyAfter: thirdParty.length, status }));
} finally {
  await browser.close();
  server.close();
}
