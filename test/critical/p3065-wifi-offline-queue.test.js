'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const TuyaLocalClient = require(path.join(__dirname, '..', '..', 'lib/tuya-local/TuyaLocalClient'));

function mk() {
  const c = Object.create(TuyaLocalClient.prototype);
  c._offlineCommandQueue = []; c._offlineCommandLimit = 2; c._commandQueue = []; c._log = () => {};
  c.disconnect = async () => {}; c.removeAllListeners = () => {}; c.id = 'x';
  return c;
}

test('P3065 offline queue overflow rejects the dropped command instead of leaving it pending', async () => {
  const c = mk();
  const p1 = c._queueOfflineCommand({ type: 'set', dp: 1, value: true });
  c._queueOfflineCommand({ type: 'set', dp: 2, value: true }).catch(() => {});
  c._queueOfflineCommand({ type: 'set', dp: 3, value: true }).catch(() => {});
  await assert.rejects(p1, /Offline queue full/);
  assert.strictEqual(c._offlineCommandQueue.length, 2);
});

test('P3065 destroy settles every offline-queued command', async () => {
  const c = mk();
  const ps = [c._queueOfflineCommand({ type: 'set', dp: 1 }), c._queueOfflineCommand({ type: 'set', dp: 2 })];
  await c.destroy();
  for (const p of ps) { await assert.rejects(p, /Device destroyed/); }
  assert.strictEqual(c._offlineCommandQueue.length, 0);
});
