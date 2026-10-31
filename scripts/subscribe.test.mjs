import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { CONSENT, canonicalExtra, parseRequest } from '../functions/lib/subscribe.js';
import { handleSubscribe } from '../functions/api/subscribe.js';

const CONSENT_MARK = "We'll only use your email for this request.";

function memoryDb() {
  const rows = [];
  const hits = [];
  return {
    rows,
    hits,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first(col) {
              if (sql.includes('COUNT')) {
                const [ip, since] = args;
                const n = hits.filter((hit) => hit.ip_hash === ip && hit.created_at > since).length;
                return col ? n : { n };
              }
              return null;
            },
            async run() {
              if (sql.includes('DELETE FROM subscribe_hits')) {
                const [cutoff] = args;
                for (let i = hits.length - 1; i >= 0; i -= 1) {
                  if (hits[i].created_at < cutoff) hits.splice(i, 1);
                }
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
                const dup = rows.some((row) => row.email === rec.email && row.purpose === rec.purpose && row.extra === rec.extra);
                if (dup) return { success: true, meta: { changes: 0 } };
                rows.push(rec);
                return { success: true, meta: { changes: 1 } };
              }
              throw new Error(`unexpected sql ${sql}`);
            },
          };
        },
      };
    },
  };
}

function fields(over = {}) {
  return {
    email: 'Owner@Example.com',
    purpose: 'chain-specs',
    page_url: '/saws/stihl-ms-261/',
    saw: 'STIHL MS 261',
    saw_id: 'stihl-ms-261',
    bar_length: '18',
    consent: 'yes',
    consent_text: CONSENT,
    ...over,
  };
}

function post(body, { ip = '203.0.113.8', accept = 'application/json', origin = 'https://sawchainsize.com', json = true } = {}) {
  const headers = { origin, accept, 'cf-connecting-ip': ip };
  let payload;
  if (json) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  } else {
    payload = new URLSearchParams(body);
    headers['content-type'] = 'application/x-www-form-urlencoded';
  }
  return new Request('https://sawchainsize.com/api/subscribe', { method: 'POST', headers, body: payload });
}

test('consent sentence is the stored-request line', () => {
  assert.equal(CONSENT, CONSENT_MARK);
  const form = fs.readFileSync('src/components/RequestCapture.astro', 'utf8');
  const privacy = fs.readFileSync('src/pages/privacy.astro', 'utf8');
  assert.ok(form.includes('Email me my chain specs'));
  assert.ok(form.includes('Request a sharpen or replace reminder'));
  assert.ok(form.includes(CONSENT_MARK));
  assert.ok(form.includes('This form does not send email.'));
  assert.ok(privacy.includes(CONSENT_MARK));
  assert.ok(privacy.includes('contact@sawchainsize.com') || privacy.includes('<Email />'));
  assert.ok(privacy.includes('<Email />'));
  for (const file of [form, privacy]) {
    assert.equal(/gmail/i.test(file), false);
    assert.equal(/newsletter/i.test(form) && file === form, false);
  }
  assert.equal(/popup|modal/i.test(form), false);
  assert.match(privacy, /do not sell/i);
  assert.match(privacy, /only deletion path/i);
});

test('parse builds extra JSON and rejects a bad request', () => {
  const ok = parseRequest(fields());
  assert.equal(ok.ok, true);
  assert.equal(ok.record.email, 'owner@example.com');
  assert.equal(ok.record.extra, canonicalExtra({ bar_length: '18', saw: 'STIHL MS 261', saw_id: 'stihl-ms-261' }));
  assert.equal(parseRequest(fields({ purpose: 'sharpen-replace' })).message, 'Choose sharpen or replace.');
  const reminder = parseRequest(fields({ purpose: 'sharpen-replace', kind: 'replace' }));
  assert.equal(JSON.parse(reminder.record.extra).kind, 'replace');
  assert.equal(parseRequest(fields({ email: 'not-an-email' })).status, 400);
  assert.equal(parseRequest(fields({ saw_id: 'other-saw' })).status, 400);
  assert.equal(parseRequest(fields({ fax_number: '555' })).honeypot, true);
});

test('stores, dedupes, rate-limits, and drops the honeypot', async () => {
  const db = memoryDb();
  const env = { DB: db };
  const first = await handleSubscribe(post(fields()), env);
  const firstBody = await first.json();
  assert.equal(first.status, 200);
  assert.equal(firstBody.stored, true);
  assert.match(firstBody.message, /Request stored/);
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].consent_text, CONSENT);
  assert.equal(db.rows[0].ip_hash.length, 64);
  assert.equal(db.rows[0].email, 'owner@example.com');

  const again = await handleSubscribe(post(fields({ email: 'OWNER@example.com' })), env);
  const againBody = await again.json();
  assert.equal(againBody.stored, false);
  assert.match(againBody.message, /already stored/);
  assert.equal(db.rows.length, 1);

  const otherBar = await handleSubscribe(post(fields({ bar_length: '20' })), env);
  assert.equal((await otherBar.json()).stored, true);
  assert.equal(db.rows.length, 2);

  const reminder = await handleSubscribe(post(fields({ purpose: 'sharpen-replace', kind: 'sharpen', email: 'other@example.com' })), env);
  assert.equal((await reminder.json()).stored, true);
  assert.equal(JSON.parse(db.rows[2].extra).kind, 'sharpen');

  const honeypot = await handleSubscribe(post(fields({ fax_number: '1', email: 'bot@example.com' })), env);
  assert.equal((await honeypot.json()).stored, true);
  assert.equal(db.rows.some((row) => row.email === 'bot@example.com'), false);

  const fresh = memoryDb();
  for (let i = 0; i < 5; i += 1) {
    const res = await handleSubscribe(post(fields({ email: `p${i}@example.com` }), { ip: '203.0.113.9' }), { DB: fresh });
    assert.equal(res.status, 200);
  }
  const limited = await handleSubscribe(post(fields({ email: 'p6@example.com' }), { ip: '203.0.113.9' }), { DB: fresh });
  assert.equal(limited.status, 429);
  assert.equal(fresh.rows.length, 5);
});

test('refuses a missing database, a bad origin, and a missing Turnstile token', async () => {
  const missing = await handleSubscribe(post(fields()), {});
  assert.equal(missing.status, 503);

  const foreign = await handleSubscribe(post(fields(), { origin: 'https://example.com' }), { DB: memoryDb() });
  assert.equal(foreign.status, 403);

  const db = memoryDb();
  const blocked = await handleSubscribe(post(fields()), { DB: db, TURNSTILE_SECRET: 'test-secret' });
  assert.equal(blocked.status, 400);
  assert.equal(db.rows.length, 0);

  const htmlRes = await handleSubscribe(post(fields(), { accept: 'text/html', json: false }), { DB: memoryDb() });
  const html = await htmlRes.text();
  assert.equal(htmlRes.status, 200);
  assert.match(html, /Request stored/);
  assert.match(html, /href="\/saws\/stihl-ms-261\/"/);
  assert.equal(html.includes('203.0.113.8'), false);
});
