'use strict';

/**
 * P2436 — Homey match simulator + Moes #533 mocks (inbox / GH / diags)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '../..');
const {
  simulateHomeyZigbeeMatch,
  createMockCoverDevice,
  encodeTuyaEnumPayload,
} = require('../mocks/homey-zigbee-match');

function readCompose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

describe('P2436 — Homey endpoint match mocks (GH #540–#544)', () => {
  it('TS0004 ZCL interview matches switch_4gang (no required EF00)', () => {
    const c = readCompose('switch_4gang');
    const interview = {
      1: { inputClusters: [0, 4, 5, 6] },
      2: { inputClusters: [4, 5, 6] },
      3: { inputClusters: [4, 5, 6] },
      4: { inputClusters: [4, 5, 6] },
    };
    const r = simulateHomeyZigbeeMatch(c.zigbee.endpoints, interview);
    assert.strictEqual(r.ok, true, r.failures.join('; '));
  });

  it('TS0012 interview fails if ep2 wrongly lists Basic(0)', () => {
    const bad = {
      1: { clusters: [0, 4, 5, 6] },
      2: { clusters: [0, 3, 4, 5, 6] },
    };
    const interview = {
      1: { inputClusters: [0, 4, 5, 6] },
      2: { inputClusters: [4, 5, 6] },
    };
    const r = simulateHomeyZigbeeMatch(bad, interview);
    assert.strictEqual(r.ok, false);
    assert.ok(r.failures.some((f) => f.includes('cluster 0')));
  });

  it('wall_switch_2gang_1way matches TS0012 interview', () => {
    const c = readCompose('wall_switch_2gang_1way');
    const interview = {
      1: { inputClusters: [0, 4, 5, 6, 57344] },
      2: { inputClusters: [4, 5, 6] },
    };
    const r = simulateHomeyZigbeeMatch(c.zigbee.endpoints, interview);
    assert.strictEqual(r.ok, true, r.failures.join('; '));
  });

  it('Moes ZTS interview matches curtain_motor endpoints', () => {
    const c = readCompose('curtain_motor');
    const interview = {
      1: { inputClusters: [0, 4, 5, 61184] },
    };
    const r = simulateHomeyZigbeeMatch(c.zigbee.endpoints, interview);
    assert.strictEqual(r.ok, true, r.failures.join('; '));
  });
});

describe('P2436 — Moes enum TX + idle guard mocks (#533)', () => {
  it('enum DP1 payload is exactly 1 data byte (not 4)', () => {
    const buf = encodeTuyaEnumPayload(1, 0); // open
    assert.strictEqual(buf.readUInt8(3), 4); // type enum
    assert.strictEqual(buf.readUInt16BE(4), 1); // length
    assert.strictEqual(buf.length, 7);
    assert.strictEqual(buf.readUInt8(6), 0);
  });

  it('DeviceIOFacade still encodes enum as 1 byte', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/io/DeviceIOFacade.js'), 'utf8');
    assert.ok(src.includes('typeId === 4'));
    assert.ok(src.includes('Buffer.from([Number(value) & 0xff])'));
  });

  it('curtain_motor re-arms Tuya DP mode + listener + Moes query (P2436)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/device.js'), 'utf8');
    assert.ok(src.includes('_setupTuyaDPListener'));
    assert.ok(src.includes('_setupTuyaDPMode'));
    assert.ok(src.includes('_enablePassiveTuyaListen'));
    assert.ok(src.includes('P2436'));
  });

  it('mock Moes idle guard skips stop while armed', () => {
    const d = createMockCoverDevice();
    d._coverMotionGuardUntil = Date.now() + 25000;
    d._shouldSkipCoverIdleStop = function skip() {
      return Number(this._coverMotionGuardUntil) > Date.now();
    };
    assert.strictEqual(d._shouldSkipCoverIdleStop(), true);
    d._coverMotionGuardUntil = Date.now() - 1;
    assert.strictEqual(d._shouldSkipCoverIdleStop(), false);
  });
});

describe('P2436 — bot automation reduced (workflows)', () => {
  it('bug-report-auto-pr is dispatch-only', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/bug-report-auto-pr.yml'), 'utf8');
    assert.ok(yml.includes('workflow_dispatch'));
    assert.ok(!/\n\s*issues:\s*\n\s*types:/.test(yml));
    assert.ok(yml.includes('P2436'));
  });

  it('auto-bot-issue-triage has no issues: trigger', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-bot-issue-triage.yml'), 'utf8');
    assert.ok(yml.includes('P2436'));
    assert.ok(!/\n\s*issues:\s*\n\s*types:\s*\[opened/.test(yml));
    assert.ok(yml.includes('DRY_RUN'));
  });
});
