#!/usr/bin/env python3
"""Measure text overlap between sibling saw pages in dist/.
Text = visible text of <main> (nav, header, footer, scripts and the Amazon link block excluded).
Overlap(A,B) = |S(A) ∩ S(B)| / min(|S(A)|, |S(B)|) over word 5-shingles (containment of the smaller page),
and Jaccard is reported too. A pair counts as 'overlapping' when containment > 0.5.
Sibling = two saw pages of the same brand OR sharing at least one chain spec (pitch+gauge).
Usage: python3 scripts/overlap.py [dist] [--list] [--json out.json]
"""
import re, sys, glob, json, html, itertools, os
dist = next((a for a in sys.argv[1:] if not a.startswith('--') and os.path.isdir(a)), 'dist')
K = 5
def text_of(path):
    h = open(path, encoding='utf8').read()
    m = re.search(r'<main[^>]*>(.*?)</main>', h, re.S); h = m.group(1) if m else h
    h = re.sub(r'<aside class="buy shop".*?</aside>', ' ', h, flags=re.S)
    h = re.sub(r'<(script|style|nav)[^>]*>.*?</\1>', ' ', h, flags=re.S)
    h = re.sub(r'<[^>]+>', ' ', h); h = html.unescape(h)
    return re.findall(r"[a-z0-9.\"″/'’-]+", h.lower())
def shingles(w): return {' '.join(w[i:i+K]) for i in range(len(w)-K+1)}
pages = {}
for f in glob.glob(f'{dist}/saws/*/index.html'):
    slug = f.split('/')[-2]; pages[slug] = shingles(text_of(f))
slugs = sorted(pages)
import subprocess
meta = {}
for f in glob.glob('src/content/models/*.json'):
    d = json.load(open(f)); slug = os.path.basename(f)[:-5]
    meta[slug] = (d['brand'], {(b['pitch'], b['gauge']) for b in d['bars'] if b['pitch'] and b['gauge']})
rows = []
for a, b in itertools.combinations(slugs, 2):
    sib = meta[a][0] == meta[b][0] or (meta[a][1] & meta[b][1])
    if not sib: continue
    i = len(pages[a] & pages[b]); u = len(pages[a] | pages[b])
    rows.append((i / min(len(pages[a]), len(pages[b])), i / u, a, b))
rows.sort(reverse=True)
over = [r for r in rows if r[0] > .5]
print(f'saw pages: {len(slugs)}  sibling pairs: {len(rows)}  pairs with containment > 50%: {len(over)}  (Jaccard > 50%: {sum(r[1] > .5 for r in rows)})')
vals = [r[0] for r in rows]; print(f'mean containment {sum(vals)/len(vals):.3f}  max {max(vals):.3f}')
if '--list' in sys.argv:
    for c, j, a, b in rows[:60]: print(f'{c:.2f} {j:.2f} {a} | {b}')
if '--json' in sys.argv:
    json.dump([dict(containment=round(c, 3), jaccard=round(j, 3), a=a, b=b) for c, j, a, b in rows], open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1)
