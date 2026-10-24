// Renders public/favicon.svg to PNG/ICO sizes using Playwright's Chromium (dev-only tool).
import { chromium } from 'playwright';
import fs from 'node:fs';
const svg = fs.readFileSync('public/favicon.svg', 'utf8');
const b = await chromium.launch(); 
const render = async (size) => {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  const buf = await p.screenshot({ omitBackground: true }); await p.close(); return buf;
};
fs.writeFileSync('public/apple-touch-icon.png', await render(180));
fs.writeFileSync('public/icon-192.png', await render(192));
fs.writeFileSync('public/icon-512.png', await render(512));
const png32 = await render(32);
// ICO with embedded PNG
const hdr = Buffer.alloc(22); hdr.writeUInt16LE(0, 0); hdr.writeUInt16LE(1, 2); hdr.writeUInt16LE(1, 4);
hdr[6] = 32; hdr[7] = 32; hdr.writeUInt16LE(1, 10); hdr.writeUInt16LE(32, 12); hdr.writeUInt32LE(png32.length, 14); hdr.writeUInt32LE(22, 18);
fs.writeFileSync('public/favicon.ico', Buffer.concat([hdr, png32]));
await b.close(); console.log('icons ok');
