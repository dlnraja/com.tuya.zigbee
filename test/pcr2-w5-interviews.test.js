'use strict';
// PCr2-2 (W5) and PCr2-4: normalized interview facts feed the native matrix (Green Power 0x0021,
// SONOFF 0xFC57, Philips 0xFC00 ...), the W5 audit tool runs, and the one exact couple applied
// from it (eWeLight TS0502B -> light_cct_ts0502b) is present. File reads happen inside the tests.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

describe('PCr2 W5 interview facts', function () {
  this.timeout(60000);
  it('new interview facts carry no IEEE address or user field', () => {
    const dir = path.join(ROOT, 'docs', 'data', 'interviews');
    const mine = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
      .map((f) => { try { return readJson(`docs/data/interviews/${f}`); } catch (_) { return {}; } })
      .filter((j) => /pc-harvest-r2/.test(j.source || ''));
    assert.ok(mine.length >= 100, `only ${mine.length}`);
    for (const j of mine) {
      const s = JSON.stringify(j);
      assert.ok(!/ieee|"user"|[0-9a-f]{2}(:[0-9a-f]{2}){7}/i.test(s), j.manufacturerName);
      assert.ok(j.endpoints && Object.keys(j.endpoints).length, j.manufacturerName);
    }
  });
  it('native matrix counts the observed non-native clusters from interviews', () => {
    const m = readJson('data/native-matrix.json').clusters;
    assert.ok(m['0x0021'] && m['0x0021'].interviews > 0 && m['0x0021'].native === false);
    assert.match(m['0x0021'].name, /Green Power/);
    assert.ok(m['0xFC57'] && m['0xFC57'].interviews > 0);
    assert.ok(m['0xFC00'] && /Philips|Signify/.test(m['0xFC00'].name));
  });
  it('W5 audit tool runs and reports every interview couple', () => {
    const r = spawnSync(process.execPath, ['tools/audit/w5-interview-clusters.js', '--json'], { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.ok(out.summary.interviews >= 100);
    const ew = out.rows.find((x) => x.mfr === 'eWeLight' && x.pid === 'TS0502B');
    assert.strictEqual(ew && ew.driver, 'light_cct_ts0502b');
  });
  it('eWeLight / TS0502B is in light_cct_ts0502b (exact CCT driver, rule M4)', () => {
    const z = readJson('drivers/light_cct_ts0502b/driver.compose.json').zigbee;
    assert.ok(z.manufacturerName.includes('eWeLight'));
    assert.ok(z.productId.includes('TS0502B'));
    assert.ok(z.manufacturerName.includes('_TZ3210_jtifm80b'), 'existing couple kept');
  });
});
