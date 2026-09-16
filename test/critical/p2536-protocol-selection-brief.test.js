'use strict';

/**
 * P2536 — Protocol selection brief Contre quoi (silent enrich).
 * Locks EU Zigbee 2.4 GHz + mesh range + Z-Wave sub-GHz vs Wi-Fi battery anti-pattern.
 * Dual-app: BOTH (RF helper / troubleshooting doctrine).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const rf = require(path.join(ROOT, 'lib', 'utils', 'rf-channel-coexistence.js'));

describe('P2536 protocol selection brief (Zigbee vs Wi-Fi/BT/Z-Wave)', () => {
  it('exposes protocolSelectionBrief with Zigbee EU 2.4 GHz mesh facts', () => {
    assert.equal(typeof rf.protocolSelectionBrief, 'function');
    const brief = rf.protocolSelectionBrief();
    assert.equal(brief.zigbee.bandEu, '2.4 GHz');
    assert.equal(brief.zigbee.mesh, true);
    assert.equal(brief.zigbee.meshExtendsCoverage, true);
    assert.equal(brief.zigbee.approxThroughputKbps, 250);
    assert.equal(brief.zigbee.typicalIndoorRangeM.min, 10);
    assert.equal(brief.zigbee.typicalIndoorRangeM.max, 20);
    assert.equal(brief.zwave.bandEu, '868 MHz');
    assert.equal(brief.zwave.approxThroughputKbps, 100);
    assert.match(brief.wifi.bestFor, /avoid battery/i);
    assert.match(brief.thread.coexistenceRisk, /Zigbee/i);
    assert.ok(brief.tips.some((t) => /Matter/i.test(t)));
  });

  it('RF guide documents protocol roles table (no invent pid)', () => {
    const md = fs.readFileSync(
      path.join(ROOT, 'docs', 'guides', 'RF_CHANNEL_COEXISTENCE.md'),
      'utf8'
    );
    assert.match(md, /Protocol roles/);
    assert.match(md, /protocolSelectionBrief/);
    assert.match(md, /868 MHz/);
    assert.doesNotMatch(md, /_TZ[E0-9]{4}_[a-z0-9]{8}\+TS\d{4}/);
  });

  it('coexistence tips still warn numbering mismatch', () => {
    const tips = rf.formatCoexistenceTips();
    assert.ok(tips.some((t) => /≠|different numbering/i.test(t)));
  });
});
