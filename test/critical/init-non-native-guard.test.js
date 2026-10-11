'use strict';
// Guard for the rule "non-native clusters are never mandatory for base operation".
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scanFile } = require('../../scripts/gates/init-non-native-guard.js');

function tmp(src) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'inng-')), 'device.js');
  fs.writeFileSync(f, src);
  return f;
}

test('flags init that throws when the Tuya cluster is missing', () => {
  const f = tmp(`class D { async onNodeInit({ zclNode }) {\n const t = zclNode.endpoints[1].clusters.tuya;\n if (!t) throw new Error('no tuya');\n } }`);
  assert.strictEqual(scanFile(f).length, 1);
});

test('flags init that returns early without the EF00 cluster', () => {
  const f = tmp(`class D { async onNodeInit({ zclNode }) {\n if (!zclNode.endpoints[1].clusters.tuya)\n return;\n this.registerCapability('onoff', 6);\n } }`);
  assert.strictEqual(scanFile(f).length, 1);
});

test('ignores throws in nested helpers and try blocks', () => {
  const f = tmp(`class D { async onNodeInit() {\n this.send = async () => { if (!this.tuya) throw new Error('no tuya'); };\n try { if (!this.tuya) throw new Error('tuya'); } catch (e) { this.log(e); }\n } }`);
  assert.strictEqual(scanFile(f).length, 0);
});

test('current tree passes', () => {
  const r = require('child_process').spawnSync(process.execPath, [path.join(__dirname, '../../scripts/gates/init-non-native-guard.js')]);
  assert.strictEqual(r.status, 0, String(r.stderr));
});
