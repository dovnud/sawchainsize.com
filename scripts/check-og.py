#!/usr/bin/env python3
"""Every built page needs og:image + twitter:image that exist in dist as a 1200x630 PNG. Optional: --live <origin> HEADs each URL."""
import re, sys, glob, struct, os, urllib.request
dist = 'dist'; live = sys.argv[sys.argv.index('--live') + 1] if '--live' in sys.argv else None
bad = []; n = 0; seen = {}
for f in sorted(glob.glob(f'{dist}/**/*.html', recursive=True)):
    h = open(f, encoding='utf8').read(); n += 1
    og = re.search(r'<meta property="og:image" content="([^"]+)"', h); tw = re.search(r'<meta name="twitter:image" content="([^"]+)"', h)
    if not og or not tw: bad.append((f, 'missing og/twitter image tag')); continue
    if og.group(1) != tw.group(1): bad.append((f, 'og != twitter image'))
    u = og.group(1); p = u.replace('https://sawchainsize.com', dist)
    if not os.path.exists(p): bad.append((f, 'file missing ' + u)); continue
    if p not in seen:
        b = open(p, 'rb').read(32); w, ht = struct.unpack('>II', b[16:24]); seen[p] = (w, ht, b[:8] == b'\x89PNG\r\n\x1a\n')
    w, ht, ok = seen[p]
    if (w, ht) != (1200, 630) or not ok: bad.append((f, f'{u} is {w}x{ht} png={ok}'))
    if 'og:image:width" content="1200"' not in h or 'og:image:height" content="630"' not in h: bad.append((f, 'og:image:width/height'))
if live:
    for p in seen:
        u = live + p[len(dist):]
        try: r = urllib.request.urlopen(urllib.request.Request(u, method='HEAD', headers={'User-Agent': 'og-check'})); c, t = r.status, r.headers.get('content-type')
        except Exception as e: c, t = getattr(e, 'code', str(e)), ''
        if c != 200 or 'image/png' not in (t or ''): bad.append((u, f'{c} {t}'))
print(f'{n} pages, {len(seen)} distinct og images, problems: {len(bad)}')
for b in bad[:30]: print(' ', b)
sys.exit(1 if bad else 0)
