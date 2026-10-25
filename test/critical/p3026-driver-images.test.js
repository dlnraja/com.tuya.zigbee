'use strict';
// P3026: driver images stay valid PNGs with the sizes Homey requires (small 75x75, large 500x500,
// xlarge 1000x1000) after the lossless recompression (scripts/maintenance/png-lossless-recompress.py,
// pixel-identical check). Guards against a re-encode that would break the store or pairing UI.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SIZES = { 'small.png': 75, 'large.png': 500, 'xlarge.png': 1000 };
const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('every driver image is a PNG with the Homey size for its name', () => {
  const drivers = path.join(ROOT, 'drivers');
  const bad = [];
  let n = 0;
  for (const d of fs.readdirSync(drivers)) {
    const dir = path.join(drivers, d, 'assets', 'images');
    if (!fs.existsSync(dir)) continue;
    for (const [name, px] of Object.entries(SIZES)) {
      const f = path.join(dir, name);
      if (!fs.existsSync(f)) continue;
      const head = Buffer.alloc(24);
      const fd = fs.openSync(f, 'r'); fs.readSync(fd, head, 0, 24, 0); fs.closeSync(fd);
      n += 1;
      if (!head.subarray(0, 8).equals(SIG)) { bad.push(`${d}/${name}: not a PNG`); continue; }
      const w = head.readUInt32BE(16); const h = head.readUInt32BE(20);
      if (w !== px || h !== px) bad.push(`${d}/${name}: ${w}x${h}`);
    }
  }
  assert.ok(n > 0, 'no driver images found');
  assert.deepStrictEqual(bad, []);
});
