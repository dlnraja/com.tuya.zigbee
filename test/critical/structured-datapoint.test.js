'use strict';
// Every datapoint write must use the argument set declared by TuyaSpecificCluster; legacy
// `value`/`type` keys make zigbee-clusters refuse the command ("value is an unexpected property").
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { sendStructuredDatapoint } = require('../../lib/helpers/UniversalDriverInit');

const ALLOWED = new Set(['status', 'transid', 'dp', 'datatype', 'length', 'data']);

test('builds full args for bool / value / enum / raw-hex', async () => {
  const sent = [];
  const c = { datapoint: async (a) => { sent.push(a); } };
  await sendStructuredDatapoint(c, 1, true, 'bool');
  await sendStructuredDatapoint(c, 4, 215, 'value');
  await sendStructuredDatapoint(c, 2, 1, 4);
  await sendStructuredDatapoint(c, 5, '00f003e803e8', 'raw');
  for (const a of sent) { assert.deepStrictEqual(Object.keys(a).sort(), [...ALLOWED].sort()); }
  assert.deepStrictEqual([...sent[0].data], [1]);
  assert.strictEqual(sent[1].data.readInt32BE(0), 215);
  assert.strictEqual(sent[2].datatype, 4);
  assert.strictEqual(sent[3].data.length, 6);
});

test('no driver or lib file passes legacy keys to datapoint()', () => {
  const root = path.join(__dirname, '..', '..');
  const files = execSync("git ls-files 'lib/**/*.js' 'drivers/**/*.js'", { cwd: root }).toString().trim().split('\n');
  const bad = [];
  for (const f of files) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of s.matchAll(/\.datapoint\(\s*\{([^{}]*)\}/g)) {
      const body = m[1].replace(/\/\/[^\n]*/g, '');
      const keys = [...body.matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*(?=[:,]|$)/g)].map((x) => x[1]);
      if (keys.some((k) => !ALLOWED.has(k))) { bad.push(`${f}: ${keys.join(',')}`); }
    }
  }
  assert.deepStrictEqual(bad, []);
});
