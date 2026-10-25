'use strict';
// P3036c (25/10/2026 Paris): ONE source for the publish Zigbee caps, config/publish-caps.json, read through
// scripts/lib/publish-caps.cjs by prepare-publish, the compactor defaults, the platform budget gate, the
// KB coverage matrix, the tests and the workflows (platform-budget.yml exports it to $GITHUB_ENV).
// Before: workflows said 15500, a simulation said 17000, tests parsed YAML. Now nothing hard-codes it.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner'); // P3020: node --test and mocha

const ROOT = path.join(__dirname, '..', '..');
const L = require(path.join(ROOT, 'scripts', 'lib', 'publish-caps.cjs'));
const CAPS = L.loadPublishCaps({ root: ROOT, env: {} });
const WF = path.join(ROOT, '.github', 'workflows');
const CAP_ENV = /HOMEY_ZIGBEE_(MAX_TOTAL_COMBOS|MAX_DRIVER_COMBOS|MAX_CASE_FORMS|TOPUP_MAX_TOTAL|TOPUP_MAX_DRIVER|KB_TOPUP_MAX_TOTAL|KB_TOPUP_MAX_DRIVER)\s*:\s*["']?\d+/;

describe('P3036c single publish cap source', () => {
  it('config/publish-caps.json has every cap, all from config', () => {
    for (const k of Object.keys(L.ENV)) {
      assert.ok(Number.isFinite(CAPS[k]) && CAPS[k] >= 0, k);
      assert.strictEqual(CAPS.from[k], 'config', k);
    }
    assert.ok(CAPS.maxTotalCombos > 0 && CAPS.maxDriverCombos > 0 && CAPS.maxCaseForms > 0);
  });

  it('caps stay within what Athom accepted (measured block)', () => {
    const m = CAPS.measured;
    assert.ok(m.acceptedMaxTotalCombos > 0 && m.acceptedMaxDriverCombos > 0);
    assert.ok(CAPS.maxTotalCombos <= m.acceptedMaxTotalCombos, `base ${CAPS.maxTotalCombos}`);
    if (CAPS.allowAboveMeasuredCombos === 1) {
      // P3036d (owner decision 25/10/2026 17:29 Paris): the binding limit is the uploaded app.json size;
      // top-ups keep >= 10 % margin under the only combo rejection and the upload cap is <= 90 % of the
      // largest accepted app.json. The previous caps are kept in the config for the rollback.
      const d = L.readFile(ROOT).decision;
      assert.ok(d && d.rollback && d.rollback.caps, 'decision + rollback caps recorded');
      assert.ok(d.rollback.caps.kbTopupMaxTotal <= m.acceptedMaxTotalCombos && d.rollback.caps.maxDriverCombos <= m.acceptedMaxDriverCombos);
      assert.ok(L.payloadCeiling(CAPS) <= 0.9 * m.rejectedMinTotalCombos, `ceiling ${L.payloadCeiling(CAPS)}`);
      assert.ok(CAPS.maxUploadAppJsonBytes > 0 && CAPS.maxUploadAppJsonBytes <= 0.9 * m.acceptedMaxUploadAppJsonBytes, `upload ${CAPS.maxUploadAppJsonBytes}`);
    } else {
      assert.ok(L.payloadCeiling(CAPS) <= m.acceptedMaxTotalCombos, `ceiling ${L.payloadCeiling(CAPS)}`);
      for (const k of ['maxDriverCombos', 'kbTopupMaxDriver', 'ts0601TopupMaxDriver']) {
        assert.ok(CAPS[k] <= m.acceptedMaxDriverCombos, `${k} ${CAPS[k]}`);
      }
    }
    assert.ok(CAPS.maxTotalCombos <= CAPS.kbTopupMaxTotal || CAPS.kbTopupMaxTotal === 0);
  });

  it('no workflow hard-codes a Zigbee cap', () => {
    for (const f of fs.readdirSync(WF).filter((x) => /\.ya?ml$/.test(x))) {
      const y = fs.readFileSync(path.join(WF, f), 'utf8');
      assert.ok(!CAP_ENV.test(y), `${f} sets a HOMEY_ZIGBEE_* cap; edit config/publish-caps.json instead`);
    }
  });

  it('platform budget gate and workflow read the same file', () => {
    const lim = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'platform-limits.json'), 'utf8'));
    const lf = lim.limits.zigbee_combos.limitFrom;
    assert.strictEqual(lf.capsFile, 'config/publish-caps.json');
    assert.deepStrictEqual([...lf.keys].sort(), ['kbTopupMaxTotal', 'maxTotalCombos', 'ts0601TopupMaxTotal']);
    const bw = path.join(WF, 'platform-budget.yml');
    if (fs.existsSync(bw)) assert.match(fs.readFileSync(bw, 'utf8'), /scripts\/lib\/publish-caps\.cjs --github-env/);
    const lines = L.toEnvLines(CAPS);
    assert.ok(lines.includes(`HOMEY_ZIGBEE_MAX_TOTAL_COMBOS=${CAPS.maxTotalCombos}`));
  });

  it('prepare-publish and compactor defaults use the config values', () => {
    const pp = fs.readFileSync(path.join(ROOT, 'scripts', 'prepare-publish.js'), 'utf8');
    assert.match(pp, /publish-caps\.cjs/);
    assert.match(pp, /publishCaps\.kbTopupMaxTotal/);
    const C = require(path.join(ROOT, 'scripts', 'maintenance', 'compact-zigbee-identifiers.cjs'));
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'maintenance', 'compact-zigbee-identifiers.cjs'), 'utf8');
    assert.match(src, /publish-caps\.cjs/);
    if (C.DEFAULT_MAX_TOTAL_COMBOS !== undefined) assert.strictEqual(C.DEFAULT_MAX_TOTAL_COMBOS, CAPS.maxTotalCombos);
  });

  it('an env var with the historical name still overrides for a manual run', () => {
    const c = L.loadPublishCaps({ root: ROOT, env: { HOMEY_ZIGBEE_MAX_TOTAL_COMBOS: '12345' } });
    assert.strictEqual(c.maxTotalCombos, 12345);
    assert.strictEqual(c.from.maxTotalCombos, 'env');
  });

  it('SPM02V1-GT exact TS0601 couples are pinned on power_meter (owner request, P3039a)', () => {
    const f = path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json');
    const pins = JSON.parse(fs.readFileSync(f, 'utf8')).couples || [];
    const z = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'power_meter', 'driver.compose.json'), 'utf8')).zigbee;
    const want = (z.manufacturerName || []).filter((m) => /wjk6rurm$/i.test(m) && m === m.replace(/[A-Z]+$/, (x) => x.toLowerCase()) && /^_TZE/.test(m));
    if (!want.length || !(z.productId || []).includes('TS0601')) return; // branch without the P3039a power_meter mapping
    for (const mfr of want) {
      const hit = pins.filter((p) => p.mfr === mfr && (p.pid || p.productId) === 'TS0601');
      assert.strictEqual(hit.length, 1, mfr);
      assert.strictEqual(hit[0].driverId, 'power_meter', mfr);
    }
  });
});
