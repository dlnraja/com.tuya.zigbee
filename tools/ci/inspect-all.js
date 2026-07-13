// inspect-all.js
const fs = require('fs');
const path = require('path');

function walk(d) {
  const out = [];
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const base = '.github/state/all-diagnostics-2026-07-13';
const files = walk(base);
console.log('=== ALL FILES ===');
for (const f of files) {
  const s = fs.statSync(f);
  console.log((s.size + '').padStart(10) + '  ' + f.replace(base, ''));
}

console.log('\n=== BIG JSON FILES ANALYSIS ===');
for (const f of files) {
  if (!f.endsWith('.json')) continue;
  const s = fs.statSync(f);
  if (s.size < 1000) continue;
  console.log('\n--- ' + f.replace(base, '') + ' (' + s.size + ' bytes) ---');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log('Type:', Array.isArray(d) ? 'array[' + d.length + ']' : typeof d);
  if (Array.isArray(d) && d.length) {
    console.log('First entry keys:', Object.keys(d[0]).join(', '));
    console.log('Sample:', JSON.stringify(d[0], null, 2).substring(0, 800));
  } else if (typeof d === 'object') {
    const keys = Object.keys(d);
    console.log('Top keys (' + keys.length + '):', keys.slice(0, 10).join(', '));
    for (const k of keys.slice(0, 3)) {
      const v = d[k];
      console.log('  ' + k + ':', typeof v, Array.isArray(v) ? '[' + v.length + ']' : '');
      if (typeof v === 'string' && v.length > 0) console.log('    ' + v.substring(0, 200));
      else if (Array.isArray(v) && v.length) console.log('    sample:', JSON.stringify(v[0]).substring(0, 200));
      else if (typeof v === 'object' && v) console.log('    ' + JSON.stringify(v).substring(0, 200));
    }
  }
}
