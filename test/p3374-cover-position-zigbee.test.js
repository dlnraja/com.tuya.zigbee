'use strict';
/* eslint-env mocha */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { CoverPositionSource } = require('../lib/tuya-local/CoverPositionSource');

describe('P3374 Zigbee covers use the P2952 target vs actual rule (forum 154077 #487)', () => {
  it('CoverPositionSource still prefers DP3 once seen', () => {
    const s = new CoverPositionSource();
    assert.strictEqual(s.accept(2, 40), true);
    assert.strictEqual(s.accept(3, 63), true);
    assert.strictEqual(s.accept(2, 0), false);
  });

  it('UnifiedCoverBase wires CoverPositionSource', () => {
    const src = fs.readFileSync(path.join(__dirname, '../lib/devices/UnifiedCoverBase.js'), 'utf8');
    assert.match(src, /CoverPositionSource/);
    assert.match(src, /getCoverWriteDps/);
  });
});
