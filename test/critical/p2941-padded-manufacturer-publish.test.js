'use strict';
// P2941 / GH#570 (edwinvdp): AOYAN AY-303Z reports Basic manufacturerName "AOYAN  "
// (two trailing spaces; Z2M hobeian.ts whiteLabel fingerprint). The publish compactor
// trimmed identifiers, so the padded exact string vanished from the uploaded manifest
// and Homey (byte-exact match) showed "Unknown Zigbee device".
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const c = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');

test('limitCaseForms keeps padded wire forms beyond the case cap', () => {
  const out = c.limitCaseForms(['AOYAN', 'AOYAN  ', 'aoyan', 'Aoyan'], 2);
  assert.ok(out.includes('AOYAN  '));
  assert.ok(out.includes('AOYAN'));
});

test('compactor keeps "AOYAN  " on soil_sensor (no trim)', () => {
  const manifest = {
    drivers: [{
      id: 'soil_sensor',
      zigbee: { manufacturerName: ['HOBEIAN', 'AOYAN', 'AOYAN  ', 'aoyan', 'COOLO'], productId: ['ZG-303Z', 'AY-303Z', 'AY-302Z', 'CS-201Z'] },
    }],
  };
  c.compactZigbeeIdentifiers(manifest, { repoRoot: path.join(__dirname, '../..') });
  const d = manifest.drivers.find((x) => x.id === 'soil_sensor');
  assert.ok(d, 'driver kept');
  assert.ok(d.zigbee.manufacturerName.includes('AOYAN  '), JSON.stringify(d.zigbee.manufacturerName));
  assert.ok(d.zigbee.productId.includes('AY-303Z'));
});

test('source soil_sensor declares the padded AOYAN form', () => {
  const j = require('../../drivers/soil_sensor/driver.compose.json');
  assert.ok(j.zigbee.manufacturerName.includes('AOYAN  '));
  assert.ok(j.zigbee.productId.includes('AY-303Z'));
});
