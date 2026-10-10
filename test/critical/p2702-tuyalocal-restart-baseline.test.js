'use strict';
/**
 * P2702 — Contre quoi (forum 154077 #454): false "changed" trigger on the first report after an
 * app restart, because the persisted capability value predates the restart.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'tuya-local', 'TuyaLocalDevice.js'), 'utf8');

describe('P2702 restart baseline', () => {
  it('first value per capability since init does not fire the generic changed trigger', async () => {
    const m = SRC.match(/async safeSetCapabilityValue\(capability, value\) \{[\s\S]*?\n {2}\}\n/);
    assert.ok(m, 'safeSetCapabilityValue found');
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return { ${m[0]} }`)().safeSetCapabilityValue;
    const fired = [];
    const stored = { feed_state: 'feeding' };
    const dev = {
      _destroyed: false,
      hasCapability: () => true,
      getCapabilityValue: (c) => stored[c],
      setCapabilityValue: async (c, v) => { stored[c] = v; },
      getData: () => ({ id: 'd1' }),
      homey: { app: { featureFlowCards: { triggerCapabilityChanged: (...a) => fired.push(a) } } },
      error: () => {},
    };
    await fn.call(dev, 'feed_state', 'standby');
    assert.equal(fired.length, 0, 'no trigger against pre-restart value');
    await fn.call(dev, 'feed_state', 'feeding');
    assert.equal(fired.length, 1, 'later real changes still trigger');
    await fn.call(dev, 'feed_state', 'feeding');
    assert.equal(fired.length, 1, 'unchanged value does not trigger');
  });
});
