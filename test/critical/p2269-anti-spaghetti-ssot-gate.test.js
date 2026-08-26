'use strict';

/**
 * P2269 — Anti-spaghetti SSOT gate
 * WHY: Ensure SSOT docs, PathFinder, DeviceFusionHooks split, and parser quarantine stay wired.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { describe, it } = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function exists(...parts) {
  return fs.existsSync(path.join(ROOT, ...parts));
}

describe('P2269 anti-spaghetti SSOT', () => {
  it('SSOT architecture docs exist', () => {
    assert.ok(exists('docs', 'architecture', 'SPAGHETTI_MAP.md'));
    assert.ok(exists('docs', 'architecture', 'PROTOCOL_TX_RX_SSOT.md'));
    assert.ok(exists('docs', 'architecture', 'BATTERY_SSOT.md'));
    assert.ok(exists('docs', 'architecture', 'TIME_SYNC_SSOT.md'));
    assert.ok(exists('docs', 'architecture', 'PARSER_SSOT.md'));
    assert.ok(exists('docs', 'architecture', 'COMM_PATHFINDING.md'));
    assert.ok(exists('reports', 'anti-spaghetti-2026-08-26', 'ARCHITECTURE_HISTORY.md'));
  });

  it('CommunicationPathFinder + PROTOCOL_PATHS meta exist', () => {
    assert.ok(exists('lib', 'protocol', 'CommunicationPathFinder.js'));
    const chain = fs.readFileSync(path.join(ROOT, 'lib', 'layers', 'ProtocolRxTxChain.js'), 'utf8');
    assert.ok(chain.includes('sleepySafe') || chain.includes('needsMagic'), 'PROTOCOL_PATHS meta expected');
  });

  it('DeviceIOFacade delegates fusion to DeviceFusionHooks', () => {
    assert.ok(exists('lib', 'io', 'DeviceFusionHooks.js'));
    const facade = fs.readFileSync(path.join(ROOT, 'lib', 'io', 'DeviceIOFacade.js'), 'utf8');
    assert.ok(facade.includes("require('./DeviceFusionHooks')"));
    assert.ok(facade.includes('attachDeviceFusionHooks'));
    assert.ok(!facade.includes('async fuseBattery('), 'fuseBattery must not remain inlined');
  });

  it('UniversalTuyaParser is quarantined stub', () => {
    assert.ok(exists('lib', 'tuya', '_quarantine', 'UniversalTuyaParser.legacy.js'));
    const stub = fs.readFileSync(path.join(ROOT, 'lib', 'tuya', 'UniversalTuyaParser.js'), 'utf8');
    assert.ok(/QUARANTINED|quarantined/i.test(stub));
    assert.ok(!stub.includes('DEVICE PROFILES: Context-aware'), 'legacy body must not be at stub path');
  });

  it('BatteryMasterEngine LowLevelBridge path is parent-relative', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'battery', 'BatteryMasterEngine.js'), 'utf8');
    assert.ok(src.includes("require('../LowLevelBridge')"));
  });
});
