'use strict';
/** P-KB3 profile generator: KB couples (data/kb/couples.json) that sit EXACTLY (mfr+pid) in one driver -> profile stubs
 *  (match + source only, no DP guessing). DP maps are added only from a cited source by hand/review.
 *  Usage: node scripts/kb/generate-profiles.js [outDir]  (default data/profiles/generated, excluded from bundle via review). */
const fs = require('fs'); const path = require('path'); const ROOT = path.join(__dirname, '../..');
function clean(s) { return String(s).replace(/\u0000+$/g, ''); }
function generate(couples, byCouple, limit = 5000) {
  const out = [];
  for (const [key, refs] of Object.entries(couples || {})) {
    if (out.length >= limit) break;
    const [mfrRaw, pidRaw] = key.split('|'); const mfr = clean(mfrRaw), pid = clean(pidRaw || '');
    if (!mfr || !pid) continue;
    const drv = byCouple.get(`${mfr}|${pid}`.toLowerCase()); if (!drv || drv.size !== 1) continue;
    const r = (refs || [])[0] || [];
    out.push({ id: `gen_${[...drv][0]}_${mfr}_${pid}`.replace(/[^\w]+/g, '_').toLowerCase(), driver: [...drv][0], match: [{ mfr, pid }], dps: {}, generated: true,
      source: { name: r[0] || 'kb', model: r[1] || null, url: r[2] || null } });
  }
  return out;
}
module.exports = { generate, clean };
if (require.main === module) {
  const { driverMap } = require('./assign-drivers'); const dm = driverMap();
  const out = generate(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/kb/couples.json'), 'utf8')).couples, dm.byCouple);
  const dir = process.argv[2] || path.join(ROOT, 'data/kb/profiles-generated'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'stubs.json'), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ stubs: out.length, dir }));
}
