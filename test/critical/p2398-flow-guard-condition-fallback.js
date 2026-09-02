'use strict';

/**
 * P2398 — FLOW-GUARD sibling alias + BaseZigBeeDriver condition/action order
 * WHY: meter91 diag 2b0b4e4f (9.0.743) logged
 *   getDeviceConditionCard water_valve_garden_is_open not a function — noop
 * while getConditionCard existed; Device* preference swallowed real cards.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function testAppJsGuard() {
  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  assert.match(app, /P2398/);
  assert.match(app, /__flowGuardNoop/);
  assert.match(app, /getDeviceConditionCard:\s*'getConditionCard'/);
  assert.match(app, /noop \(once\)/);
  assert.doesNotMatch(app, /not a function on this SDK — noop'/);
}

function testBaseOrder() {
  const base = fs.readFileSync(path.join(ROOT, 'lib', 'drivers', 'BaseZigBeeDriver.js'), 'utf8');
  assert.match(base, /P2398/);
  assert.match(base, /__flowGuardNoop/);
  // conditions: getConditionCard before getDeviceConditionCard
  const cond = base.match(/type === 'action'[\s\S]*?\? \[([^\]]+)\][\s\S]*?: \[([^\]]+)\]/);
  assert.ok(cond, 'method lists present');
  assert.match(cond[1], /getActionCard.*getDeviceActionCard/);
  assert.match(cond[2], /getConditionCard.*getDeviceConditionCard/);
}

function testRuntimeFallback() {
  // Simulate SDK without getDeviceConditionCard but with getConditionCard
  const realCards = new Map();
  const flow = {
    getConditionCard(id) {
      return {
        id,
        registerRunListener(fn) { this._fn = fn; return this; },
      };
    },
  };
  // Apply same preference order as BaseZigBeeDriver
  const methods = ['getConditionCard', 'getDeviceConditionCard'];
  let got = null;
  for (const method of methods) {
    if (typeof flow[method] !== 'function') continue;
    const card = flow[method]('water_valve_garden_is_open');
    if (!card || card.__flowGuardNoop) continue;
    got = card;
    break;
  }
  assert.ok(got, 'resolves via getConditionCard');
  assert.strictEqual(got.id, 'water_valve_garden_is_open');

  // Device* noop must be skipped
  flow.getDeviceConditionCard = () => ({ __flowGuardNoop: true });
  got = null;
  for (const method of ['getConditionCard', 'getDeviceConditionCard']) {
    const card = flow[method]('water_valve_garden_is_open');
    if (!card || card.__flowGuardNoop) continue;
    got = card;
    break;
  }
  assert.ok(got && !got.__flowGuardNoop);
}

function testPresenceEnum2() {
  const { transformPresence } = require(path.join(ROOT, 'drivers', 'presence_sensor_radar', 'configs.js'));
  assert.strictEqual(transformPresence(2, 'presence_enum_gkfbdvyx', false), true);
  assert.strictEqual(transformPresence(0, 'presence_enum_gkfbdvyx', false), false);
  assert.strictEqual(transformPresence(2, 'presence_enum', false), true);
}

testAppJsGuard();
testBaseOrder();
testRuntimeFallback();
testPresenceEnum2();
console.log('p2398-flow-guard-condition-fallback: ok');
