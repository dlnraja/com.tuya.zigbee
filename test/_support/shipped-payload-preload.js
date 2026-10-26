'use strict';
// P3068: `node -r` preload for perf harnesses — the shipped app has no files the .homeyignore excludes
// under data/ (mfs_db.json 5 MB, community-sync, kb, leads...). In the source tree they exist, so loaders
// parse them and the heap/GC numbers become load-dependent (P3065 harness flake under parallel CI:
// "heap after delete grows per cycle 37 -> 51.6 MB"). Hide them exactly like a real Homey install.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
let IGN = [];
try {
  IGN = fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8').split(/\r?\n/)
    .map((l) => l.trim()).filter((l) => /^data\/[^*!#\s]+$/.test(l))
    .map((l) => path.join(ROOT, l.replace(/\/$/, '')));
} catch (_e) { IGN = []; }

function hidden(p) {
  const s = String(p);
  return IGN.some((i) => s === i || s.startsWith(i + path.sep));
}

const ex = fs.existsSync;
fs.existsSync = (p) => (hidden(p) ? false : ex(p));

module.exports = { hidden, IGNORED: IGN };
