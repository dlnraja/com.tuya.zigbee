'use strict';

/**
 * P2498 — Contre quoi: Homey/alt-app pairing doctrine drifts; learnmode gaps.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { buildLearnmode, resolveTemplateKey } = require('../../lib/pairing/LearnmodeTemplates');

const ROOT = path.join(__dirname, '..', '..');

describe('P2498 pairing discovery SSOT', () => {
  it('SSOT + human + templates exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'config/architecture/pairing-discovery-ssot.json')));
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/architecture/PAIRING_DISCOVERY_SSOT.md')));
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/pairing/LearnmodeTemplates.js')));
  });

  it('Athom: Zigbee pairing owned by Homey; identity is mfr+productId', () => {
    const ssot = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/pairing-discovery-ssot.json'), 'utf8'));
    assert.equal(ssot.athomOfficial.zigbee.pairingOwnedByHomey, true);
    assert.equal(ssot.athomOfficial.zigbee.customPairViewsForbidden, true);
    assert.deepEqual(ssot.athomOfficial.zigbee.identityKeys, ['manufacturerName', 'productId']);
    assert.ok(ssot.alternativeApps.johanBendzTuyaZigbee);
    assert.ok(ssot.alternativeApps.tuyaLocalHomey.discovery.includes('UDP 6666/6667'));
  });

  it('learnmode templates cover sensor/button/curtain', () => {
    assert.equal(resolveTemplateKey('climate_sensor', 'sensor'), 'sensor');
    assert.equal(resolveTemplateKey('scene_switch_4', 'button'), 'button');
    assert.equal(resolveTemplateKey('curtain_motor', 'windowcoverings'), 'windowcoverings');
    const lm = buildLearnmode('soil_sensor', 'sensor');
    assert.match(lm.instruction.en, /pairing|LED/i);
    assert.ok(lm.instruction.fr && lm.instruction.nl && lm.instruction.de);
  });

  it('climate_sensor has learnmode after P2498 enrich', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'), 'utf8'));
    assert.ok(j.zigbee.learnmode?.instruction?.en);
  });

  it('gate script exits 0', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/ci/p2498-pairing-discovery-gate.js')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /PASS/);
  });
});
