// inspect-dashboard.js — inspect the deep diag data
const fs = require('fs');
const path = require('path');
const base = path.join('.github', 'state', 'all-diagnostics-2026-07-13', 'Tuya Deep Diagnostics Recovery');
console.log('Files in:', base);
console.log(fs.readdirSync(base).map(f => fs.statSync(path.join(base, f)).size + '  ' + f).join('\n'));

// Try the main files
for (const f of ['dashboard-monitor-report.json', 'version-intelligence-report.json']) {
  const full = path.join(base, f);
  if (!fs.existsSync(full)) continue;
  console.log('\n=== ' + f + ' ===');
  const d = JSON.parse(fs.readFileSync(full, 'utf8'));
  console.log('Type:', Array.isArray(d) ? 'array[' + d.length + ']' : typeof d);
  if (Array.isArray(d) && d.length) {
    console.log('First entry keys:', Object.keys(d[0]));
    console.log('Sample:', JSON.stringify(d[0], null, 2).substring(0, 1500));
  } else if (typeof d === 'object') {
    const keys = Object.keys(d);
    console.log('Top keys:', keys.slice(0, 20).join(', '));
    for (const k of keys.slice(0, 3)) {
      const v = d[k];
      console.log('  ' + k + ':', typeof v, Array.isArray(v) ? '[' + v.length + ']' : '');
      if (typeof v === 'string') console.log('    ' + v.substring(0, 200));
      else if (Array.isArray(v) && v.length) console.log('    sample:', JSON.stringify(v[0]).substring(0, 200));
    }
  }
}
