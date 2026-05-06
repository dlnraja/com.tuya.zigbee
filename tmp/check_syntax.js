const fs = require('fs'), p = require('path'), { execSync } = require('child_process');
const d = p.join(__dirname, '..', 'drivers');
let ok = 0, err = 0, errs = [];
for (const f of fs.readdirSync(d)) {
  const df = p.join(d, f, 'device.js');
  if (!fs.existsSync(df)) continue;
  try { execSync(`node -c "${df}"`, { stdio: 'pipe' }); ok++; }
  catch (e) { err++; if (errs.length < 15) errs.push(f); }
}
console.log(JSON.stringify({ ok, err, errDrivers: errs }));
