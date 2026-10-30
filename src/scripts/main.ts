/* Site behaviour. Everything here is progressive enhancement: pages are complete static HTML. */
import { GA4_ID, GA_OPTOUT_COOKIE } from '../config/analytics';
import { AMAZON_DISCLOSURE, amazonSearchUrl } from '../config/affiliate';

/* ---------- legacy hash-route redirect (old single-page site used #/model/... URLs) ---------- */
(function legacy() {
  if (location.pathname !== '/' || !location.hash.startsWith('#/')) return;
  const h = location.hash.slice(2).replace(/\/$/, '');
  const map: Record<string, string> = {
    chart: '/guides/chain-size-chart/', verify: '/guides/how-to-verify-chain-size/', models: '/saws/',
    about: '/about/', 'how-we-verify': '/how-we-verify/', disclosure: '/affiliate-disclosure/',
    privacy: '/privacy/', terms: '/terms/', contact: '/contact/',
  };
  const models: Record<string, string> = {
    'stihl-ms250': 'stihl-ms-250', 'stihl-ms170': 'stihl-ms-170-180', 'husqvarna-455-rancher': 'husqvarna-455-rancher',
    'husqvarna-450-rancher': 'husqvarna-450-rancher', 'echo-cs590': 'echo-cs-590', 'echo-cs400': 'echo-cs-400', 'poulan-2150': 'poulan-2150',
  };
  let to = map[h];
  if (!to && h.startsWith('model/')) to = models[h.slice(6)] ? `/saws/${models[h.slice(6)]}/` : '/saws/';
  if (to) location.replace(to);
})();

/* ---------- cookie note (compact; dismissal remembered in one functional cookie) ---------- */
(function cookie() {
  const note = document.getElementById('cookieNote');
  if (!note) return;
  if (document.cookie.split('; ').some((c) => c.startsWith('scs_note=1'))) return;
  setTimeout(() => { note.hidden = false; }, 1200);
  document.getElementById('cookieOk')?.addEventListener('click', () => {
    note.hidden = true;
    document.cookie = 'scs_note=1; max-age=15552000; path=/; SameSite=Lax; Secure';
  });
  document.getElementById('cookieOptOut')?.addEventListener('click', () => {
    note.hidden = true;
    document.cookie = 'scs_note=1; max-age=15552000; path=/; SameSite=Lax; Secure';
    setAnalytics(false);
  });
})();

/* ---------- analytics opt-out (first-party cookie; the loader in Base.astro checks it) ---------- */
function analyticsOff() { return document.cookie.split('; ').some((c) => c === GA_OPTOUT_COOKIE + '=0'); }
function setAnalytics(on: boolean) {
  const flag = 'ga-disable-' + GA4_ID;
  if (on) {
    document.cookie = GA_OPTOUT_COOKIE + '=; max-age=0; path=/; SameSite=Lax; Secure';
    (window as any)[flag] = false;
  } else {
    document.cookie = GA_OPTOUT_COOKIE + '=0; max-age=31536000; path=/; SameSite=Lax; Secure';
    (window as any)[flag] = true;
    // remove Google Analytics cookies already set on this site
    const host = location.hostname.split('.').slice(-2).join('.');
    document.cookie.split('; ').map((c) => c.split('=')[0]).filter((n) => n === '_ga' || n.startsWith('_ga_')).forEach((n) => {
      document.cookie = `${n}=; max-age=0; path=/`;
      document.cookie = `${n}=; max-age=0; path=/; domain=.${host}`;
    });
  }
  syncToggle();
}
function syncToggle() {
  document.querySelectorAll<HTMLElement>('[data-ga-status]').forEach((el) => { el.textContent = analyticsOff() ? 'off' : 'on'; });
  document.querySelectorAll<HTMLButtonElement>('[data-ga-toggle]').forEach((b) => { b.textContent = analyticsOff() ? 'Turn analytics on for this browser' : 'Turn analytics off for this browser'; });
}
document.querySelectorAll<HTMLButtonElement>('[data-ga-toggle]').forEach((b) => b.addEventListener('click', () => setAnalytics(analyticsOff())));
syncToggle();

/* ---------- throttle for the running saw: rewrites the SVG motion timing in place ---------- */
(function saw() {
  const svg = document.getElementById('sawStage') as unknown as SVGSVGElement | null;
  if (!svg) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced && svg.pauseAnimations) svg.pauseAnimations();
  const read = document.getElementById('rpmRead');
  const btns = document.querySelectorAll<HTMLButtonElement>('.rpm-btn');
  btns.forEach((btn) =>
    btn.addEventListener('click', () => {
      const dur = parseFloat(btn.dataset.dur!);
      const motions = svg.querySelectorAll('animateMotion');
      motions.forEach((am, i) => {
        am.setAttribute('dur', dur + 's');
        am.setAttribute('begin', (-(i * dur / motions.length)).toFixed(3) + 's');
      });
      if (svg.pauseAnimations && svg.setCurrentTime) {
        svg.pauseAnimations(); svg.setCurrentTime(0);
        if (!reduced) svg.unpauseAnimations();
      }
      document.documentElement.style.setProperty('--vibe', btn.dataset.vibe!);
      btns.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      if (read) read.textContent = 'LOOP ' + dur.toFixed(2).replace(/0$/, '') + ' s \u00B7 ' + btn.textContent!.trim();
    }),
  );
})();

/* ---------- chain finder ---------- */
(function finder() {
  const dataEl = document.getElementById('finder-data');
  const fBrand = document.getElementById('fBrand') as HTMLSelectElement | null;
  const fModel = document.getElementById('fModel') as HTMLSelectElement | null;
  const fBar = document.getElementById('fBar') as HTMLSelectElement | null;
  const fResult = document.getElementById('fResult');
  const fGo = document.getElementById('fGo');
  if (!dataEl || !fBrand || !fModel || !fBar || !fResult || !fGo) return;
  type Bar = { label: string; pitch: string; gauge: string; dl: string; file: string; oregon: string; note: string; status: string; shop: { href: string; kind: 'product' | 'search' } | null };
  type Model = { name: string; url: string; conflict: boolean; bars: Bar[] };
  const DB: Record<string, { label: string; models: Record<string, Model> }> = JSON.parse(dataEl.textContent!);

  const el = (tag: string, cls?: string, text?: string) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  const clear = () => { fResult.className = 'f-result'; fResult.replaceChildren(); };
  const opt = (v: string, t: string) => { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; };

  fBrand.addEventListener('change', () => {
    clear();
    fBar.replaceChildren(opt('', 'Pick a model first')); fBar.disabled = true;
    if (!fBrand.value) { fModel.replaceChildren(opt('', 'Pick a brand first')); fModel.disabled = true; return; }
    const ms = DB[fBrand.value].models;
    fModel.replaceChildren(opt('', 'Choose a model…'), ...Object.keys(ms).map((k) => opt(k, ms[k].name)));
    fModel.disabled = false;
  });
  fModel.addEventListener('change', () => {
    clear();
    if (!fModel.value) { fBar.replaceChildren(opt('', 'Pick a model first')); fBar.disabled = true; return; }
    const bars = DB[fBrand.value].models[fModel.value].bars;
    fBar.replaceChildren(opt('', 'Choose the bar on your saw…'), ...bars.map((b, i) => opt(String(i), b.label + ' bar')));
    fBar.disabled = false;
  });
  fBar.addEventListener('change', clear);

  const cell = (label: string, val: string) => {
    const c = el('div', 'spec-cell'); c.append(el('span', undefined, label));
    const b = el('b', undefined, val); b.style.fontSize = val.length > 14 ? '0.92rem' : '1.28rem'; c.append(b); return c;
  };
  fGo.addEventListener('click', () => {
    fResult.className = 'f-result show';
    fResult.replaceChildren();
    if (!fBrand.value || !fModel.value || fBar.value === '') {
      const d = el('div', 'callout'); d.append(el('b', undefined, 'Almost there'));
      d.append(el('p', undefined, 'Pick a brand, a model, and the bar length that is actually on your saw — all three are needed, because the bar is what decides the chain.'));
      fResult.append(d); return;
    }
    const m = DB[fBrand.value].models[fModel.value];
    const b = m.bars[parseInt(fBar.value, 10)];
    if (b.status === 'conflict') {
      const d = el('div', 'callout'); d.append(el('b', undefined, 'Sources disagree — read the stamp'));
      const p = el('p', undefined, `Published sources give different specs for the ${m.name}. The numbers below are what is reported; the stamp on your bar tail is the version that fits your saw. `);
      const a = el('a', undefined, 'How to read it →'); a.setAttribute('href', '/guides/how-to-verify-chain-size/'); p.append(a); d.append(p); fResult.append(d);
    }
    const strip = el('div', 'spec-strip');
    strip.append(cell('Pitch', b.pitch), cell('Gauge', b.gauge), cell('Drive links', b.dl), cell('File size', b.file), cell('Oregon type', b.oregon));
    fResult.append(strip, el('p', 'result-note', b.note));
    if (b.status === 'ok' && b.shop) {
      const btn = el('a', 'shop-btn');
      btn.setAttribute('href', b.shop.href);
      btn.setAttribute('target', '_blank');
      btn.setAttribute('rel', 'sponsored nofollow noopener');
      btn.append(el('span', 'shop-btn-verb', b.shop.kind === 'search' ? 'Search on Amazon' : 'See on Amazon'), el('span', 'shop-btn-spec', `${b.pitch} · ${b.gauge} · ${b.dl}`));
      const disc = el('p', 'shop-disclosure');
      disc.append(el('strong', undefined, AMAZON_DISCLOSURE));
      fResult.append(btn, disc);
    }
    const src = el('p', 'src', 'Full table, OEM part numbers and buying options: ');
    const a = el('a', undefined, `${m.name} chain size page →`); a.setAttribute('href', m.url); src.append(a); fResult.append(src);
  });
})();


/* ---------- stamp search: Amazon search built only through amazonSearchUrl (tag stays in affiliate.ts) ---------- */
document.querySelectorAll('form.stamp-search').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form as HTMLFormElement);
    const pitch = String(data.get('pitch') || '');
    const gauge = String(data.get('gauge') || '');
    const dl = parseInt(String(data.get('dl') || ''), 10);
    if (!pitch || !gauge || !Number.isInteger(dl) || dl < 20 || dl > 200) return;
    window.open(amazonSearchUrl(`Oregon chainsaw chain ${pitch} pitch ${gauge} gauge ${dl} drive links`), '_blank', 'noopener');
  });
});

/* ---------- contact form: compose a mailto in the visitor's own mail app (no server, nothing stored) ---------- */
(function contact() {
  const f = document.getElementById('contactForm') as HTMLFormElement | null;
  if (!f) return;
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
    const body = `${v('cMsg')}\n\n— ${v('cName')}${v('cEmail') ? ` <${v('cEmail')}>` : ''}`;
    location.href = `mailto:contact@sawchainsize.com?subject=${encodeURIComponent(v('cTopic'))}&body=${encodeURIComponent(body)}`;
  });
})();

/* ---------- motion layer (GSAP + Lenis), loaded after first paint ---------- */
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
if (!reduced) {
  const start = () => import('./motion.ts');
  if (document.readyState === 'complete') requestIdleCallback ? requestIdleCallback(start) : setTimeout(start, 200);
  else window.addEventListener('load', () => (window.requestIdleCallback ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 200)));
}
