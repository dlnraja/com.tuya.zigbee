'use strict';

/**
 * P2696 — Homey build-failed emails (2026-09-23) + Unified CI Fleetwood
 *
 * Emails (noreply@homey.app):
 * - processing_failed + "socket hang up" on Universal #3340, Stable #225,
 *   Bastien #77/#78/#80 — Athom transient (P139), NOT app content.
 * - Later siblings recovered: #3341/#3342, #227/#228, #79 testing.
 * - Stable crash 5.12.288/290: missing TuyaRadarRangeScale (already P2650).
 *
 * Contre quoi:
 * 1) ZigBeeDriverFlowCardPatch Illegal return → Fleetwood exit 1 (Unified CI)
 * 2) PRE_COMMIT dumps 2600 NAN warnings from scripts/ and hides fatals
 * 3) Three publish workflows race Athom without shared concurrency group
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2696 Homey socket-hang + Fleetwood CI harden', () => {
  it('ZigBeeDriverFlowCardPatch parses under vm.Script (no Illegal return)', () => {
    const src = read('lib/drivers/ZigBeeDriverFlowCardPatch.js');
    assert.doesNotThrow(() => new vm.Script(src, { filename: 'ZigBeeDriverFlowCardPatch.js' }));
    assert.ok(src.includes('P2696') || src.includes('if (!ZigBeeDriver)'));
  });

  it('PRE_COMMIT_CHECKS scopes soft NaN/identity to lib+drivers and caps warn print', () => {
    const src = read('scripts/PRE_COMMIT_CHECKS.js');
    assert.ok(src.includes('SOFT_SANITY_ROOTS'));
    assert.ok(src.includes("lib/") && src.includes("drivers/"));
    assert.ok(src.includes('isSoftSanityPath'));
    assert.ok(src.includes('MAX_WARN_PRINT'));
    assert.ok(src.includes('by type:'));
    assert.ok(src.includes('more suppressed'));
  });

  it('publish workflows share Athom API concurrency group (P139 anti-flood)', () => {
    const files = [
      '.github/workflows/auto-publish-on-push.yml',
      '.github/workflows/publish-stable.yml',
      '.github/workflows/bastien-publish.yml',
    ];
    for (const f of files) {
      const yml = read(f);
      assert.ok(
        /group:\s*athom-developer-api-publish/.test(yml),
        `${f} must use concurrency group athom-developer-api-publish`,
      );
      assert.ok(
        /cancel-in-progress:\s*false/.test(yml),
        `${f} must never cancel mid-Athom publish`,
      );
    }
  });

  it('TuyaRadarRangeScale still ships (crash mail 5.12.288/290 Contre quoi)', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/tuya/TuyaRadarRangeScale.js')));
    const radar = read('drivers/presence_sensor_radar/device.js');
    assert.ok(/try\s*\{[\s\S]*TuyaRadarRangeScale[\s\S]*\}\s*catch/.test(radar));
  });
});
