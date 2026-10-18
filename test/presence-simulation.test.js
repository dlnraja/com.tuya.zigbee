'use strict';

/**
 * Tests — PresenceSimulationManager (v9.0.403, P92.106)
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const PresenceSimulationManager = require('../lib/managers/PresenceSimulationManager');

function fakeDevice(id, onoff = false) {
  return {
    id,
    getData: () => ({ id }),
    getName: () => `Light ${id}`,
    getCapabilityValue: () => onoff,
  };
}

describe('PresenceSimulationManager', () => {
  it('starts and stops a session', async () => {
    const states = [];
    const mgr = new PresenceSimulationManager(null, {
      setDeviceState: async (d, v) => { states.push(v); },
    });
    assert.strictEqual(mgr.start('a', fakeDevice('a'), { startHour: 0, endHour: 23 }), true);
    assert.strictEqual(mgr.isActive('a'), true);
    assert.strictEqual(mgr.getReport().active_count, 1);

    assert.strictEqual(await mgr.stop('a'), true);
    assert.strictEqual(mgr.isActive('a'), false);
    assert.strictEqual(await mgr.stop('a'), false);
    await mgr.destroy();
  });

  it('restores original state on stop', async () => {
    const states = [];
    const mgr = new PresenceSimulationManager(null, {
      setDeviceState: async (d, v) => { states.push(v); },
    });
    mgr.start('a', fakeDevice('a', true), { startHour: 0, endHour: 23 });
    const session = mgr._sessions.get('a');
    session.originalState = true;
    await mgr.stop('a');
    assert.strictEqual(states[states.length - 1], true);
    await mgr.destroy();
  });

  it('window detection handles overnight windows', () => {
    const mgr = new PresenceSimulationManager(null);
    const overnight = { startHour: 22, endHour: 6 };
    const at23 = new Date('2026-01-01T23:00:00');
    const atNoon = new Date('2026-01-01T12:00:00');
    assert.strictEqual(mgr._inWindow(overnight, at23), true);
    assert.strictEqual(mgr._inWindow(overnight, atNoon), false);
    const day = { startHour: 8, endHour: 20 };
    assert.strictEqual(mgr._inWindow(day, atNoon), true);
    assert.strictEqual(mgr._inWindow(day, at23), false);
    mgr.destroy();
  });

  it('run cycle turns device ON inside window then schedules OFF', async () => {
    const states = [];
    const mgr = new PresenceSimulationManager(null, {
      setDeviceState: async (d, v) => { states.push(v); },
    });
    mgr.start('a', fakeDevice('a'), { startHour: 0, endHour: 23 });
    await mgr._runCycle('a');
    assert.strictEqual(states[0], true); // ON dans la fenêtre
    assert.ok(mgr._sessions.get('a').timer, 'OFF programmé');
    await mgr.destroy();
  });

  it('stays OFF outside window and re-checks later', async () => {
    const states = [];
    const mgr = new PresenceSimulationManager(null, {
      setDeviceState: async (d, v) => { states.push(v); },
    });
    const currentHour = new Date().getHours();
    // Fenêtre qui exclut l'heure courante : [h+2, h+3] si possible
    const cfg = { startHour: (currentHour + 2) % 24, endHour: (currentHour + 3) % 24 };
    if (cfg.startHour > cfg.endHour) { cfg.startHour = 0; cfg.endHour = 0; }
    mgr.start('a', fakeDevice('a'), cfg);
    // force out-of-window deterministically
    const session = mgr._sessions.get('a');
    session.config.startHour = (currentHour + 5) % 24;
    session.config.endHour = (currentHour + 6) % 24;
    const inW = mgr._inWindow(session.config);
    if (!inW) {
      await mgr._runCycle('a');
      assert.strictEqual(states[states.length - 1], false);
    }
    await mgr.destroy();
  });
});
