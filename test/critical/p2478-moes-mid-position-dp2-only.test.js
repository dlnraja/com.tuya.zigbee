'use strict';

/**
 * P2478 — Moes ZTS mid-slider % must be DP2-only (#533 Salvagr).
 * Contre quoi: dual DP1+DP2 on mid-travel runs motor to full open/close.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const cover = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'UnifiedCoverBase.js'), 'utf8');
const curtain = fs.readFileSync(path.join(ROOT, 'drivers', 'curtain_motor', 'device.js'), 'utf8');

assert.ok(cover.includes('_sendMoesZtsPositionOnly'), 'P2478: mid-position helper');
assert.ok(cover.includes('P2478'), 'P2478 marker');
assert.ok(/isExtreme[\s\S]{0,200}_sendMoesZtsMotion/.test(cover), 'P2478: extremes still dual TX');
assert.ok(/else \{\s*await this\._sendMoesZtsPositionOnly/.test(cover)
  || cover.includes('await this._sendMoesZtsPositionOnly(value)'),
  'P2478: mid path calls position-only');
assert.ok(!/_sendMoesZtsMotion\(motion, value\)[\s\S]{0,80}else if \(this\._isMoesZtsCover/.test(cover),
  'P2478: no unconditional dual TX for all positions');

assert.ok(curtain.includes('safeSetTimeout') && curtain.includes('_syncMoesSettingFromDp'),
  'P2478: deferred Moes setSettings (settings UI hang)');

assert.ok(/\/timeout\/i\.test/.test(cover),
  'P2478: case-insensitive timeout soft-fail (Homey "timeout after 10000ms")');

console.log('P2478 Moes mid-position DP2-only + settings defer: PASS');
