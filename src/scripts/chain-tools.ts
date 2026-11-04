import { explainFit, gaugeName, pitchName, specKey, type BarSide, type ChainSide, type FitResult } from '../lib/fit-explain';
import { MATCHER_PATH, type ToolBar, type ToolChain, type ToolData, type ToolModel, type ToolPart, type ToolShop, type ToolSource, type ToolSpec } from '../lib/tool-types';

const el = (tag: string, cls?: string, text?: string) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
};
const link = (href: string, text: string) => {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  return a;
};
const opt = (value: string, text: string) => {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = text;
  return o;
};
const show = (node: HTMLElement) => { node.className = 'f-result show'; node.replaceChildren(); };

function readData(): ToolData | null {
  const node = document.getElementById('tool-data');
  if (!node?.textContent) return null;
  try { return JSON.parse(node.textContent) as ToolData; } catch { return null; }
}
function specIndex(data: ToolData) {
  return new Map(data.specs.map((s) => [s.key, s]));
}
function intIn(raw: string, min: number, max: number): number | null {
  const text = raw.trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const n = Number(text);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}
function allowed(sel: HTMLSelectElement, value: string) {
  return [...sel.options].some((o) => o.value === value);
}

function setEmail(models: { name: string; emailUrl: string }[]) {
  const hook = document.getElementById('email-hook');
  if (!hook) return;
  hook.replaceChildren();
  if (!models.length) {
    hook.textContent = 'Pick a saw in the tool and the link here opens that saw’s form. The form stores a request. It does not send email.';
    return;
  }
  const shown = models.slice(0, 6);
  hook.append('Open the form on ');
  shown.forEach((m, i) => {
    if (i) hook.append(i === shown.length - 1 ? ' or ' : ', ');
    hook.append(link(m.emailUrl, m.name));
  });
  if (models.length > shown.length) hook.append(`. ${models.length - shown.length} more saws are in the table above`);
  hook.append('. The form stores a request for that saw and a bar length. It does not send email.');
}

function strip(cells: [string, string][]) {
  const row = el('div', 'spec-strip');
  if (cells.length && cells.length < 5) row.style.gridTemplateColumns = `repeat(${cells.length},1fr)`;
  for (const [label, value] of cells) {
    const cell = el('div', 'spec-cell');
    cell.append(el('span', undefined, label));
    const b = el('b', undefined, value);
    if (value.length > 18) b.style.fontSize = '0.92rem';
    cell.append(b);
    row.append(cell);
  }
  return row;
}

function callout(host: HTMLElement, title: string, text: string, ok = false) {
  const box = el('div', ok ? 'oknote' : 'callout');
  box.append(el('b', undefined, title), el('p', undefined, text));
  host.append(box);
  return box;
}

function partTable(parts: ToolPart[], highlight?: string) {
  const wrap = el('div', 'tblwrap');
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const hr = document.createElement('tr');
  for (const label of ['Part number', 'Brand', 'On the row', 'Listed on']) {
    hr.append(el('th', undefined, label));
  }
  head.append(hr);
  const body = document.createElement('tbody');
  for (const part of parts) {
    const tr = document.createElement('tr');
    tr.append(el('td', 'num', part.partNo), el('td', undefined, part.brand), el('td', undefined, part.role === 'oem' ? 'OEM' : 'Equivalent'));
    const saws = document.createElement('td');
    part.saws.forEach((saw, i) => {
      if (i) saws.append(document.createTextNode('; '));
      saws.append(link(saw.url, saw.name), document.createTextNode(` (${saw.lengths.map((n) => `${n}″`).join(', ')})`));
      if (highlight && saw.id === highlight) {
        saws.append(document.createTextNode(' '));
        saws.append(el('span', 'tag', 'THIS SAW'));
      }
    });
    tr.append(saws);
    body.append(tr);
  }
  table.append(head, body);
  wrap.append(table);
  return wrap;
}

function oneCard(shop: ToolShop, rel: string, target: string): HTMLElement | null {
  let url: URL;
  try { url = new URL(shop.href); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'www.amazon.com' || !url.searchParams.get('tag')) return null;
  const card = el('article', 'product-card');
  card.append(
    el('p', 'product-card-name', shop.label),
    el('p', 'product-card-why', shop.why),
    el('p', 'product-card-kind', shop.kind === 'product' ? 'Amazon product page' : 'Amazon search'),
  );
  const btn = link(shop.href, 'Check price on Amazon');
  btn.className = 'product-card-btn';
  btn.target = target;
  btn.rel = rel;
  btn.append(el('span', 'sr-only', ' (opens in a new tab)'));
  card.append(btn);
  return card;
}

function disclose(host: HTMLElement) {
  const tpl = document.getElementById('shop-disclosure-tpl');
  if (tpl instanceof HTMLTemplateElement) host.append(tpl.content.cloneNode(true));
}

function shopCard(spec: ToolSpec, host: HTMLElement, rel: string, target: string) {
  if (!spec.shop) return;
  const card = oneCard(spec.shop, rel, target);
  if (!card) return;
  const cards = el('div', 'product-cards');
  cards.append(card);
  host.append(cards);
  disclose(host);
}

function shopLinks(shops: ToolShop[], host: HTMLElement, rel: string, target: string) {
  const cards = el('div', 'product-cards');
  const seen = new Set<string>();
  for (const shop of shops) {
    if (seen.has(shop.href)) continue;
    const card = oneCard(shop, rel, target);
    if (!card) continue;
    seen.add(shop.href);
    cards.append(card);
  }
  if (!cards.childElementCount) return;
  host.append(cards);
  disclose(host);
}

function codesPara(spec: ToolSpec) {
  if (!spec.codes) return null;
  const p = el('p');
  p.append(`Family codes for this pitch and gauge only, not a counted loop: Oregon ${spec.codes.oregon}; Stihl ${spec.codes.stihl}; Husqvarna ${spec.codes.husqvarna}; Carlton ${spec.codes.carlton}. `);
  if (spec.chainUrl) p.append(link(spec.chainUrl, 'Pitch and gauge page'), document.createTextNode('. '));
  p.append('n/a means this site has not verified that brand’s code for this pitch and gauge.');
  return p;
}

function renderSpec(spec: ToolSpec, host: HTMLElement, opts: { highlight?: string; length?: number | null; rel: string; target: string }) {
  host.append(strip([['Pitch', spec.pitchLabel], ['Gauge', spec.gaugeLabel], ['Drive links', String(spec.dl)], ['File', spec.file]]));
  const codes = codesPara(spec);
  if (codes) host.append(codes);
  const sawLine = el('p');
  sawLine.append('Verified on ');
  spec.saws.forEach((saw, i) => {
    if (i) sawLine.append(document.createTextNode(', '));
    sawLine.append(link(saw.url, saw.name));
    sawLine.append(document.createTextNode(` (${saw.lengths.map((n) => `${n}″`).join(', ')})`));
  });
  sawLine.append('.');
  host.append(sawLine);

  const length = opts.length ?? null;
  const sections: { title: string; parts: ToolPart[] }[] = [];
  if (length == null) sections.push({ title: 'Part numbers on verified rows', parts: spec.parts });
  else {
    const on: ToolPart[] = [];
    const other: ToolPart[] = [];
    for (const part of spec.parts) {
      const hit = part.saws.filter((s) => s.lengths.includes(length));
      const rest = part.saws.filter((s) => !s.lengths.includes(length));
      if (hit.length) on.push({ ...part, saws: hit });
      if (rest.length) other.push({ ...part, saws: rest });
    }
    sections.push({ title: `Listed on a ${length}″ bar`, parts: on }, { title: `Same three numbers, listed at another length`, parts: other });
  }
  let any = false;
  for (const section of sections) {
    if (!section.parts.length) continue;
    any = true;
    host.append(el('h3', undefined, section.title));
    host.append(partTable(section.parts, opts.highlight));
  }
  if (!any) host.append(el('p', undefined, 'This pitch, gauge and drive-link count is verified on a saw page, and that row does not store a part number. Use the saw link above.'));
  else host.append(el('p', 'src', 'Part numbers are copied from verified rows only. A descriptive line is shown when that is what the row stores. Rows marked verify or conflict are not in this list.'));
  shopCard(spec, host, opts.rel, opts.target);
}

function missingSpec(data: ToolData, host: HTMLElement, pitch: string, gauge: number, dl: number) {
  callout(host, 'No verified loop with those three numbers', `Nothing in the verified rows is ${pitchName(pitch)} pitch, ${gaugeName(gauge)} gauge and ${dl} drive links. This page does not invent a part number.`);
  const siblings = data.specs.filter((s) => s.pitch === pitch && s.gauge === gauge);
  if (!siblings.length) {
    host.append(el('p', undefined, 'This pitch and gauge pair is not on a verified row either. Read the stamp, then use the identification chart if you need the family codes.'));
    host.append(link('/guides/chain-size-chart/', 'Chain identification chart'));
    return;
  }
  const p = el('p');
  p.append(`Verified drive-link counts for ${pitchName(pitch)} pitch and ${gaugeName(gauge)} gauge are `);
  siblings.forEach((s, i) => {
    if (i) p.append(document.createTextNode(', '));
    const params = new URLSearchParams({ pitch, gauge: String(gauge), dl: String(s.dl) });
    p.append(link(`/tools/find-my-chain/?${params}`, String(s.dl)));
  });
  p.append('. None of them is the count you entered.');
  host.append(p);
  if (siblings[0].chainUrl) host.append(link(siblings[0].chainUrl, 'Pitch and gauge page'));
}

function renderSaw(data: ToolData, model: ToolModel, host: HTMLElement, rel: string, target: string) {
  host.append(el('h2', undefined, model.name));
  const meta = el('p', 'meta-line', `LAST VERIFIED ${model.lastVerified}`);
  host.append(meta);
  const index = specIndex(data);
  let anyOk = false;
  const groups = new Map<string, ToolBar[]>();
  model.bars.forEach((bar) => {
    if (bar.status === 'ok' && bar.pitch && bar.gauge != null && bar.dl) {
      anyOk = true;
      const key = specKey(bar.pitch, bar.gauge, bar.dl);
      const list = groups.get(key) ?? [];
      list.push(bar);
      groups.set(key, list);
    }
  });
  if (!anyOk) callout(host, 'No verified loop on this saw', 'Every bar row is marked conflict or verify, so this tool does not list a part number for it. The saw page prints what each source reported. The stamp on the bar is the tiebreaker.');
  for (const [key, bars] of groups) {
    host.append(el('h3', undefined, bars.map((b) => `${b.label} bar`).join(' · ')));
    const spec = index.get(key);
    if (spec) renderSpec(spec, host, { highlight: model.id, rel, target });
    else host.append(el('p', undefined, 'This verified row did not produce a part-number group. Open the saw page.'));
    const src = el('p', 'src');
    src.append(document.createTextNode('Saw page: '), link(model.url, model.name));
    host.append(src);
  }
  model.bars.forEach((bar, i) => {
    if (bar.status === 'ok' && bar.pitch && bar.gauge != null && bar.dl) return;
    const title = bar.status === 'conflict' ? 'Sources conflict' : 'Verify on the bar stamp';
    const box = callout(host, `${bar.label} bar: ${title}`, bar.note);
    if (bar.reported.length) {
      const list = el('ul', 'plain');
      for (const r of bar.reported) {
        const bits = [r.pitch ? `${pitchName(r.pitch)} pitch` : '', r.gauge != null ? `${gaugeName(r.gauge)} gauge` : '', r.dl != null ? `${r.dl} drive links` : ''].filter(Boolean);
        list.append(el('li', undefined, `${r.publisher} (${r.typeLabel}): ${bits.join(', ') || 'no pitch, gauge or drive links stored'}`));
      }
      box.append(list);
    }
    const p = el('p');
    const params = new URLSearchParams({ saw: model.id, bar: String(i) });
    p.append(link(model.url, 'Open the saw page'), document.createTextNode(' · '), link(`/tools/chain-compatibility/?${params}`, 'Check a chain against this bar'));
    box.append(p);
  });
  const more = el('p');
  more.append(link(`/tools/chain-compatibility/?saw=${encodeURIComponent(model.id)}`, 'Check a chain you are about to buy against this saw'));
  host.append(more);
  setEmail([{ name: model.name, emailUrl: model.emailUrl }]);
}

function renderNumbers(data: ToolData, host: HTMLElement, pitch: string, gauge: number, dl: number, length: number | null, rel: string, target: string) {
  host.append(el('h2', undefined, 'Part numbers for these numbers'));
  const spec = specIndex(data).get(specKey(pitch, gauge, dl));
  if (!spec) {
    missingSpec(data, host, pitch, gauge, dl);
    setEmail([]);
    return;
  }
  if (length != null) host.append(el('p', undefined, `Bar length ${length}″ narrows which rows are highlighted. It is not itself a chain size. The match is pitch, gauge and drive links.`));
  renderSpec(spec, host, { length, rel, target });
  const params = new URLSearchParams({ cp: pitch, cg: String(gauge), cd: String(dl), mode: 'stamp', bp: pitch, bg: String(gauge), bd: String(dl) });
  host.append(link(`/tools/chain-compatibility/?${params}`, 'Check these numbers as a bar-and-chain pair'));
  const emailModels = spec.saws.map((s) => ({ name: s.name, emailUrl: `${s.url}#email-specs` }));
  setEmail(emailModels);
}

function fitBlock(result: FitResult, host: HTMLElement) {
  const box = el('div', result.verdict === 'match' ? 'oknote' : 'callout');
  box.append(el('b', undefined, result.headline), el('p', undefined, result.detail));
  host.append(box);
  for (const line of result.lines) {
    host.append(el('h3', undefined, line.title));
    const p = el('p');
    if (line.ok === true) p.append(el('span', 'tag', 'MATCH'), document.createTextNode(' '));
    if (line.ok === false) p.append(el('span', 'tag verify', 'DOES NOT MATCH'), document.createTextNode(' '));
    p.append(document.createTextNode(line.text));
    host.append(p);
    if (line.links.length) {
      const src = el('p', 'src');
      src.append(document.createTextNode('Sources: '));
      line.links.forEach((item, i) => {
        if (i) src.append(document.createTextNode(' · '));
        const a = link(item.href, item.label);
        if (/^https?:/i.test(item.href)) { a.target = '_blank'; a.rel = 'nofollow noopener'; }
        src.append(a);
      });
      host.append(src);
    }
  }
}

export function mountFind() {
  const data = readData();
  const brandSel = document.getElementById('fc-brand') as HTMLSelectElement | null;
  const modelSel = document.getElementById('fc-model') as HTMLSelectElement | null;
  const sawForm = document.getElementById('find-saw-form') as HTMLFormElement | null;
  const specForm = document.getElementById('find-spec-form') as HTMLFormElement | null;
  const result = document.getElementById('find-result');
  const root = document.getElementById('find-chain');
  if (!data || !brandSel || !modelSel || !sawForm || !specForm || !result || !root) return;
  const rel = root.dataset.rel || 'sponsored nofollow noopener';
  const target = root.dataset.target || '_blank';

  const fillModels = (brandId: string) => {
    const brand = data.brands.find((b) => b.id === brandId);
    modelSel.replaceChildren(opt('', brand ? 'Choose a model…' : 'Pick a brand first'));
    modelSel.disabled = !brand;
    if (!brand) return;
    for (const id of brand.models) modelSel.append(opt(id, data.models[id].name));
  };
  brandSel.addEventListener('change', () => fillModels(brandSel.value));

  sawForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    show(result);
    const model = data.models[modelSel.value];
    if (!brandSel.value || !model) {
      callout(result, 'Pick a saw', 'Choose a brand and a model. The part numbers come from that saw’s verified bars.');
      return;
    }
    renderSaw(data, model, result, rel, target);
  });

  specForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    show(result);
    const pitchSel = specForm.querySelector<HTMLSelectElement>('#fs-pitch')!;
    const gaugeSel = specForm.querySelector<HTMLSelectElement>('#fs-gauge')!;
    const dlInput = specForm.querySelector<HTMLInputElement>('#fs-dl')!;
    const lenInput = specForm.querySelector<HTMLInputElement>('#fs-len')!;
    const pitch = pitchSel.value;
    const gauge = Number(gaugeSel.value);
    const dl = intIn(dlInput.value, 20, 200);
    const lenRaw = lenInput.value.trim();
    const length = lenRaw ? intIn(lenRaw, 8, 72) : null;
    if (!pitch || !gaugeSel.value || !Number.isFinite(gauge) || dl == null || (lenRaw && length == null)) {
      callout(result, 'Need the three numbers', 'Choose pitch and gauge, and enter a drive-link count from 20 to 200. Bar length is optional, from 8 to 72, and only labels the rows.');
      return;
    }
    renderNumbers(data, result, pitch, gauge, dl, length, rel, target);
  });

  const q = new URLSearchParams(location.search);
  const sawId = q.get('saw') || '';
  if (sawId && data.models[sawId]) {
    brandSel.value = data.models[sawId].brand;
    fillModels(brandSel.value);
    modelSel.value = sawId;
    show(result);
    renderSaw(data, data.models[sawId], result, rel, target);
    return;
  }
  const pitch = q.get('pitch') || '';
  const gauge = q.get('gauge') || '';
  const pitchSel = specForm.querySelector<HTMLSelectElement>('#fs-pitch')!;
  const gaugeSel = specForm.querySelector<HTMLSelectElement>('#fs-gauge')!;
  if (pitch && allowed(pitchSel, pitch)) pitchSel.value = pitch;
  if (gauge && allowed(gaugeSel, gauge)) gaugeSel.value = gauge;
  const dl = q.get('dl');
  if (dl) specForm.querySelector<HTMLInputElement>('#fs-dl')!.value = dl;
  const len = q.get('len');
  if (len) specForm.querySelector<HTMLInputElement>('#fs-len')!.value = len;
  if (pitch && gauge && dl && allowed(pitchSel, pitch) && allowed(gaugeSel, gauge)) {
    const count = intIn(dl, 20, 200);
    const length = len ? intIn(len, 8, 72) : null;
    if (count != null && (!len || length != null)) {
      show(result);
      renderNumbers(data, result, pitch, Number(gauge), count, length, rel, target);
    }
  }
}

export function mountCheck() {
  const data = readData();
  const form = document.getElementById('ck-form') as HTMLFormElement | null;
  const result = document.getElementById('ck-result');
  const root = document.getElementById('compat-check');
  const mode = document.getElementById('ck-mode') as HTMLSelectElement | null;
  const brandSel = document.getElementById('ck-brand') as HTMLSelectElement | null;
  const modelSel = document.getElementById('ck-model') as HTMLSelectElement | null;
  const barSel = document.getElementById('ck-bar') as HTMLSelectElement | null;
  if (!data || !form || !result || !root || !mode || !brandSel || !modelSel || !barSel) return;
  const rel = root.dataset.rel || 'sponsored nofollow noopener';
  const target = root.dataset.target || '_blank';
  const sawFields = document.getElementById('ck-saw-fields');
  const stampFields = document.getElementById('ck-stamp-fields');

  const applyMode = () => {
    const stamp = mode.value === 'stamp';
    if (sawFields) sawFields.hidden = stamp;
    if (stampFields) stampFields.hidden = !stamp;
  };
  const fillModels = (brandId: string) => {
    const brand = data.brands.find((b) => b.id === brandId);
    modelSel.replaceChildren(opt('', brand ? 'Choose a model…' : 'Pick a brand first'));
    modelSel.disabled = !brand;
    if (!brand) return;
    for (const id of brand.models) modelSel.append(opt(id, data.models[id].name));
  };
  const fillBars = (model: ToolModel | undefined, prefer?: string) => {
    barSel.replaceChildren(opt('', model ? 'Choose the bar…' : 'Pick a model first'));
    barSel.disabled = !model;
    if (!model) return;
    model.bars.forEach((bar, i) => barSel.append(opt(String(i), `${bar.label} bar`)));
    if (prefer && model.bars[Number(prefer)]) barSel.value = prefer;
    else if (model.bars.length === 1) barSel.value = '0';
  };

  mode.addEventListener('change', applyMode);
  brandSel.addEventListener('change', () => { fillModels(brandSel.value); fillBars(undefined); });
  modelSel.addEventListener('change', () => fillBars(data.models[modelSel.value]));
  applyMode();

  const chainFrom = (): ChainSide | null => {
    const pitch = (document.getElementById('ck-cp') as HTMLSelectElement).value;
    const gaugeRaw = (document.getElementById('ck-cg') as HTMLSelectElement).value;
    const dl = intIn((document.getElementById('ck-cd') as HTMLInputElement).value, 20, 200);
    if (!pitch || !gaugeRaw || dl == null) return null;
    return { pitch, gauge: Number(gaugeRaw), dl };
  };

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    show(result);
    const chain = chainFrom();
    if (!chain) {
      callout(result, 'Enter the chain', 'Choose the chain’s pitch and gauge, and a drive-link count from 20 to 200.');
      return;
    }
    let bar: BarSide | null = null;
    let model: ToolModel | undefined;
    let barIndex = -1;
    if (mode.value === 'stamp') {
      const pitch = (document.getElementById('ck-bp') as HTMLSelectElement).value;
      const gaugeRaw = (document.getElementById('ck-bg') as HTMLSelectElement).value;
      const dl = intIn((document.getElementById('ck-bd') as HTMLInputElement).value, 20, 200);
      if (!pitch || !gaugeRaw || dl == null) {
        callout(result, 'Enter the stamp', 'Choose the pitch and gauge stamped on the bar, and the drive-link count from 20 to 200.');
        return;
      }
      bar = { pitch, gauge: Number(gaugeRaw), dl, status: 'stamp' };
    } else {
      model = data.models[modelSel.value];
      barIndex = Number(barSel.value);
      const row = model?.bars[barIndex];
      if (!model || !row || !Number.isInteger(barIndex)) {
        callout(result, 'Pick the bar', 'Choose a brand, a model, and the bar length that is on the saw. The checker compares the chain with that published row.');
        return;
      }
      bar = {
        pitch: row.pitch,
        gauge: row.gauge,
        dl: row.dl,
        status: row.status,
        sawName: model.name,
        barLabel: row.label,
        sawUrl: model.url,
        gaugeNote: row.gaugeNote,
        dlRange: row.dlRange,
        note: row.note,
        sources: row.sources,
        reported: row.reported,
      };
    }
    const fit = explainFit(bar, chain);
    const unpublished = bar.status === 'conflict' ? 'Sources conflict' : 'Not published';
    result.append(strip([
      ['Bar pitch', bar.pitch ? pitchName(bar.pitch) : unpublished],
      ['Bar gauge', bar.gauge != null ? gaugeName(bar.gauge) : (bar.gaugeNote || unpublished)],
      ['Bar drive links', bar.dl != null ? String(bar.dl) : (bar.dlRange ? `${bar.dlRange[0]}–${bar.dlRange[1]}` : unpublished)],
      ['Chain', `${pitchName(chain.pitch)} · ${gaugeName(chain.gauge)} · ${chain.dl}`],
    ]));
    fitBlock(fit, result);
    if (model) {
      const others = model.bars.flatMap((row, i) => {
        if (i === barIndex || row.status !== 'ok' || !row.pitch || row.gauge == null || !row.dl) return [];
        if (row.pitch !== chain.pitch || row.gauge !== chain.gauge || row.dl !== chain.dl) return [];
        return [row];
      });
      if (others.length && fit.verdict !== 'match') {
        const p = el('p');
        p.append(`This chain does match a different published bar on the ${model.name}: `);
        others.forEach((row, i) => {
          if (i) p.append(document.createTextNode('; '));
          p.append(document.createTextNode(`${row.label} bar, ${pitchName(row.pitch)} pitch, ${gaugeName(row.gauge)} gauge, ${row.dl} drive links`));
        });
        p.append('. ');
        p.append(link(model.url, 'Saw page'));
        result.append(p);
      }
      const back = el('p');
      back.append(link(model.url, `${model.name} chain size`), document.createTextNode(' · '), link(model.emailUrl, 'Email me my chain specs'));
      result.append(back);
      setEmail([{ name: model.name, emailUrl: model.emailUrl }]);
    } else setEmail([]);

    const spec = specIndex(data).get(specKey(chain.pitch, chain.gauge, chain.dl));
    if (fit.verdict === 'match' && spec) {
      result.append(el('h3', undefined, 'Part numbers for this spec'));
      result.append(el('p', undefined, 'The three numbers match, and verified rows store these part numbers for that spec. Confirm the bar stamp before you buy.'));
      shopCard(spec, result, rel, target);
      const params = new URLSearchParams({ pitch: chain.pitch, gauge: String(chain.gauge), dl: String(chain.dl) });
      result.append(link(`/tools/find-my-chain/?${params}`, 'All part numbers for this spec'));
    } else if (fit.verdict === 'match') {
      result.append(el('p', undefined, 'The three numbers match each other. This dataset has no verified loop stored under that exact spec, so there is no part number and no buying link here.'));
    } else if (fit.verdict === 'nomatch') {
      result.append(el('p', undefined, 'No buying link is shown for a chain that does not match the bar.'));
    }
  });

  const q = new URLSearchParams(location.search);
  const setSel = (id: string, value: string | null) => {
    const sel = document.getElementById(id) as HTMLSelectElement | null;
    if (sel && value && allowed(sel, value)) sel.value = value;
  };
  if (q.get('mode') === 'stamp' || q.get('bp')) mode.value = 'stamp';
  applyMode();
  setSel('ck-bp', q.get('bp'));
  setSel('ck-bg', q.get('bg'));
  setSel('ck-cp', q.get('cp'));
  setSel('ck-cg', q.get('cg'));
  const bd = q.get('bd');
  const cd = q.get('cd');
  if (bd) (document.getElementById('ck-bd') as HTMLInputElement).value = bd;
  if (cd) (document.getElementById('ck-cd') as HTMLInputElement).value = cd;
  const sawId = q.get('saw') || '';
  if (sawId && data.models[sawId]) {
    mode.value = 'saw';
    applyMode();
    brandSel.value = data.models[sawId].brand;
    fillModels(brandSel.value);
    modelSel.value = sawId;
    fillBars(data.models[sawId], q.get('bar') || undefined);
  }
  const readyStamp = mode.value === 'stamp' && q.get('bp') && q.get('bg') && bd && q.get('cp') && q.get('cg') && cd;
  const readySaw = mode.value === 'saw' && sawId && barSel.value !== '';
  if ((readyStamp || readySaw) && q.get('cp') && cd) form.requestSubmit();
}

function sourceList(sources: ToolSource[], host: HTMLElement) {
  if (!sources.length) return;
  const p = el('p', 'src');
  p.append(document.createTextNode('Sources for this row: '));
  sources.forEach((s, i) => {
    if (i) p.append(document.createTextNode(' · '));
    const label = `${s.publisher}: ${s.title} (${s.typeLabel}, retrieved ${s.retrieved})`;
    if (s.url) {
      const a = link(s.url, label);
      a.target = '_blank';
      a.rel = 'nofollow noopener';
      p.append(a);
    } else p.append(document.createTextNode(label));
  });
  host.append(p);
}

function chainTable(chains: ToolChain[]) {
  const wrap = el('div', 'tblwrap');
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const hr = document.createElement('tr');
  for (const label of ['Part number', 'Brand', 'On the row']) hr.append(el('th', undefined, label));
  head.append(hr);
  const body = document.createElement('tbody');
  for (const part of chains) {
    const tr = document.createElement('tr');
    tr.append(el('td', 'num', part.partNo), el('td', undefined, part.brand), el('td', undefined, part.role === 'oem' ? 'OEM' : 'Equivalent'));
    body.append(tr);
  }
  table.append(head, body);
  wrap.append(table);
  return wrap;
}

function barChoiceLabel(bar: ToolBar): string {
  const spec = bar.status === 'ok' && bar.pitch && bar.gauge != null && bar.dl
    ? `${pitchName(bar.pitch)}, ${gaugeName(bar.gauge)}, ${bar.dl} drive links`
    : bar.status === 'conflict' ? 'sources conflict' : 'verify on the stamp';
  return `${bar.label} bar, ${spec}`;
}

function renderMatchedBar(data: ToolData, model: ToolModel, bar: ToolBar, host: HTMLElement, rel: string, target: string, length: number | null) {
  host.append(el('h3', undefined, `${model.name}, ${bar.label} bar`));
  host.append(el('p', 'meta-line', `LAST VERIFIED ${model.lastVerified}`));
  if (bar.status !== 'ok' || !bar.pitch || bar.gauge == null || !bar.dl) {
    const title = bar.status === 'conflict' ? 'Sources conflict on this bar' : 'This bar is not a single verified loop';
    const box = callout(host, title, `${bar.note} The matcher does not turn this row into a replacement chain or bar.`);
    if (bar.reported.length) {
      const list = el('ul', 'plain');
      for (const r of bar.reported) {
        const bits = [r.pitch ? `${pitchName(r.pitch)} pitch` : '', r.gauge != null ? `${gaugeName(r.gauge)} gauge` : '', r.dl != null ? `${r.dl} drive links` : ''].filter(Boolean);
        list.append(el('li', undefined, `${r.publisher} (${r.typeLabel}): ${bits.join(', ') || 'no pitch, gauge or drive links stored'}`));
      }
      box.append(list);
    }
    sourceList(bar.sources, host);
    const back = el('p');
    back.append(link(model.url, `${model.name} chain size`));
    host.append(back);
    return;
  }

  const lengthText = length != null ? `${length}″` : bar.lengths.map((n) => `${n}″`).join(' / ');
  host.append(strip([
    ['Bar length', lengthText],
    ['Pitch', pitchName(bar.pitch)],
    ['Gauge', gaugeName(bar.gauge)],
    ['Drive links', String(bar.dl)],
  ]));
  host.append(el('p', undefined, `File: ${bar.fileText}.`));
  host.append(el('p', undefined, bar.barPart
    ? `Bar part number stored on this row: ${bar.barPart}.`
    : 'This row does not store a bar part number. The bar spec is the length, pitch, gauge and drive-link count above.'));
  if (bar.note) host.append(el('p', undefined, bar.note));

  host.append(el('h3', undefined, 'Chain part numbers on this row'));
  if (bar.chains.length) host.append(chainTable(bar.chains));
  else host.append(el('p', undefined, 'This verified row does not store a chain part number. The three numbers above are still the spec.'));
  if (!bar.chains.some((c) => c.role === 'equivalent')) {
    host.append(el('p', undefined, 'No cross-brand equivalent part number is stored on this row.'));
  }
  sourceList(bar.sources, host);

  const spec = specIndex(data).get(specKey(bar.pitch, bar.gauge, bar.dl));
  const shown = new Set(bar.chains.map((c) => `${c.brand}|${c.partNo}`));
  const extra = (spec?.parts ?? []).filter((p) => !shown.has(`${p.brand}|${p.partNo}`));
  if (extra.length) {
    host.append(el('h3', undefined, 'Same three numbers on another verified row'));
    host.append(el('p', undefined, 'These part numbers were transcribed for other saws that share this pitch, gauge and drive-link count. They match this bar only when the stamp shows those three numbers.'));
    host.append(partTable(extra, model.id));
  }
  const codes = spec ? codesPara(spec) : null;
  if (codes) host.append(codes);

  const shops = bar.shops.filter((s) => length == null || s.length === length);
  const links: ToolShop[] = [];
  if (shops[0]) links.push(shops[0].chain, ...shops.map((s) => s.bar));
  if (links.length) {
    host.append(el('h3', undefined, 'Look up this chain and this bar'));
    shopLinks(links, host, rel, target);
  }
  const back = el('p');
  back.append(link(model.url, `${model.name} chain size`), document.createTextNode(' · '), link(model.emailUrl, 'Email me my chain specs'));
  host.append(back);
}

function renderSawMatch(data: ToolData, model: ToolModel, host: HTMLElement, rel: string, target: string, only: number | null) {
  host.append(el('h2', undefined, model.name));
  const bars = only != null && model.bars[only] ? [model.bars[only]] : model.bars;
  bars.forEach((bar) => renderMatchedBar(data, model, bar, host, rel, target, null));
  if (model.bars.length > 1 && only == null) {
    host.append(el('p', undefined, 'This saw has more than one published bar. A replacement has to match the bar that is mounted, not the model name.'));
  }
  setEmail([{ name: model.name, emailUrl: model.emailUrl }]);
}

function renderNumberMatch(data: ToolData, host: HTMLElement, pitch: string, gauge: number, dl: number, length: number, rel: string, target: string) {
  host.append(el('h2', undefined, `${length}″ bar, ${pitchName(pitch)}, ${gaugeName(gauge)}, ${dl} drive links`));
  const hits: { model: ToolModel; bar: ToolBar }[] = [];
  for (const model of Object.values(data.models)) {
    for (const bar of model.bars) {
      if (bar.status === 'ok' && bar.pitch === pitch && bar.gauge === gauge && bar.dl === dl && bar.lengths.includes(length)) hits.push({ model, bar });
    }
  }
  hits.sort((a, b) => a.model.name.localeCompare(b.model.name) || a.bar.label.localeCompare(b.bar.label));
  if (hits.length) {
    host.append(el('p', undefined, hits.length === 1
      ? 'One verified row has this bar length and these three numbers.'
      : `${hits.length} verified rows have this bar length and these three numbers. Each citation stays with its row.`));
    for (const hit of hits) renderMatchedBar(data, hit.model, hit.bar, host, rel, target, length);
    setEmail(hits.map((h) => ({ name: h.model.name, emailUrl: h.model.emailUrl })));
    return;
  }
  const spec = specIndex(data).get(specKey(pitch, gauge, dl));
  if (!spec) {
    missingSpec(data, host, pitch, gauge, dl);
    const note = el('p');
    note.append('Bar length was part of the question. With no verified loop at those three numbers, there is no replacement bar to name either.');
    host.append(note);
    setEmail([]);
    return;
  }
  callout(host, 'Those three numbers are verified, and not on this bar length', `Nothing in the verified rows is a ${length}″ bar at ${pitchName(pitch)} pitch, ${gaugeName(gauge)} gauge and ${dl} drive links. The matcher does not invent a bar for that length.`);
  const lengths = [...new Set(spec.saws.flatMap((s) => s.lengths))].sort((a, b) => a - b);
  const p = el('p');
  p.append('Verified lengths for this pitch, gauge and drive-link count: ');
  lengths.forEach((n, i) => {
    if (i) p.append(document.createTextNode(', '));
    const params = new URLSearchParams({ pitch, gauge: String(gauge), dl: String(dl), len: String(n) });
    p.append(link(`${MATCHER_PATH}?${params}`, `${n}″`));
  });
  p.append('. ');
  const find = new URLSearchParams({ pitch, gauge: String(gauge), dl: String(dl) });
  p.append(link(`/tools/find-my-chain/?${find}`, 'Part numbers for these three numbers'));
  host.append(p);
  setEmail(spec.saws.map((s) => ({ name: s.name, emailUrl: `${s.url}#email-specs` })));
}

export function mountMatch() {
  const data = readData();
  const brandSel = document.getElementById('rm-brand') as HTMLSelectElement | null;
  const modelSel = document.getElementById('rm-model') as HTMLSelectElement | null;
  const barSel = document.getElementById('rm-bar') as HTMLSelectElement | null;
  const sawForm = document.getElementById('rm-saw-form') as HTMLFormElement | null;
  const specForm = document.getElementById('rm-spec-form') as HTMLFormElement | null;
  const result = document.getElementById('rm-result');
  const root = document.getElementById('matcher');
  if (!data || !brandSel || !modelSel || !barSel || !sawForm || !specForm || !result || !root) return;
  const rel = root.dataset.rel || 'sponsored nofollow noopener';
  const target = root.dataset.target || '_blank';

  const fillModels = (brandId: string) => {
    const brand = data.brands.find((b) => b.id === brandId);
    modelSel.replaceChildren(opt('', brand ? 'Choose a model…' : 'Pick a brand first'));
    modelSel.disabled = !brand;
    if (!brand) return;
    for (const id of brand.models) modelSel.append(opt(id, data.models[id].name));
  };
  const fillBars = (model: ToolModel | undefined, prefer?: string) => {
    barSel.replaceChildren(opt('', model ? 'Choose the bar…' : 'Pick a model first'));
    barSel.disabled = !model;
    if (!model) return;
    model.bars.forEach((bar, i) => barSel.append(opt(String(i), barChoiceLabel(bar))));
    if (prefer && model.bars[Number(prefer)]) barSel.value = prefer;
    else if (model.bars.length === 1) barSel.value = '0';
  };
  brandSel.addEventListener('change', () => { fillModels(brandSel.value); fillBars(undefined); });
  modelSel.addEventListener('change', () => fillBars(data.models[modelSel.value]));

  sawForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    show(result);
    const model = data.models[modelSel.value];
    const index = Number(barSel.value);
    const bar = model?.bars[index];
    if (!model || !bar || !Number.isInteger(index)) {
      callout(result, 'Pick the saw and the bar', 'Choose a brand, a model, and the bar length that is on the saw. The result is that published row, with the sources stored on it.');
      setEmail([]);
      return;
    }
    renderSawMatch(data, model, result, rel, target, index);
  });

  specForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    show(result);
    const pitch = (document.getElementById('rm-pitch') as HTMLSelectElement).value;
    const gaugeRaw = (document.getElementById('rm-gauge') as HTMLSelectElement).value;
    const dl = intIn((document.getElementById('rm-dl') as HTMLInputElement).value, 20, 200);
    const length = intIn((document.getElementById('rm-len') as HTMLInputElement).value, 8, 72);
    if (!pitch || !gaugeRaw || dl == null || length == null) {
      callout(result, 'Need the bar length and the three numbers', 'Enter a bar length from 8 to 72, choose pitch and gauge, and enter a drive-link count from 20 to 200.');
      setEmail([]);
      return;
    }
    renderNumberMatch(data, result, pitch, Number(gaugeRaw), dl, length, rel, target);
  });

  const q = new URLSearchParams(location.search);
  const sawId = q.get('saw') || '';
  if (sawId && data.models[sawId]) {
    brandSel.value = data.models[sawId].brand;
    fillModels(brandSel.value);
    modelSel.value = sawId;
    const prefer = q.get('bar');
    fillBars(data.models[sawId], prefer && data.models[sawId].bars[Number(prefer)] ? prefer : undefined);
    show(result);
    const only = prefer && data.models[sawId].bars[Number(prefer)] ? Number(prefer) : null;
    renderSawMatch(data, data.models[sawId], result, rel, target, only);
    return;
  }
  const pitch = q.get('pitch') || '';
  const gauge = q.get('gauge') || '';
  const pitchSel = document.getElementById('rm-pitch') as HTMLSelectElement;
  const gaugeSel = document.getElementById('rm-gauge') as HTMLSelectElement;
  if (pitch && allowed(pitchSel, pitch)) pitchSel.value = pitch;
  if (gauge && allowed(gaugeSel, gauge)) gaugeSel.value = gauge;
  const dl = q.get('dl');
  const len = q.get('len');
  if (dl) (document.getElementById('rm-dl') as HTMLInputElement).value = dl;
  if (len) (document.getElementById('rm-len') as HTMLInputElement).value = len;
  if (pitch && gauge && dl && len && allowed(pitchSel, pitch) && allowed(gaugeSel, gauge)) {
    const count = intIn(dl, 20, 200);
    const length = intIn(len, 8, 72);
    if (count != null && length != null) {
      show(result);
      renderNumberMatch(data, result, pitch, Number(gauge), count, length, rel, target);
    }
  }
}
