'use strict';

/**
 * P2643 — Contre quoi: complementary Homey apps catalog must cite peers
 * (tuyalocal / Johan / our tracks) with Homey Store Live+Test + GitHub.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2643 complementary Homey apps catalog', () => {
  it('SSOT lists tuyalocal + Johan + our three tracks with store URLs', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/complementary-homey-apps-ssot.json'), 'utf8'),
    );
    assert.ok(['P2643', 'P2647', 'P2656', 'P2657'].includes(ssot._meta.patch) || (ssot._meta.extends || []).includes('P2643'));
    assert.ok(Array.isArray(ssot.ourTracks) && ssot.ourTracks.length >= 3);
    const ids = ssot.ourTracks.map((t) => t.appId);
    assert.ok(ids.includes('com.dlnraja.tuya.zigbee'));
    assert.ok(ids.includes('com.dlnraja.tuya.zigbee.stable'));
    assert.ok(ids.includes('com.dlnraja.tuya.zigbee.bastien'));

    const peers = ssot.homeyPeers || [];
    const tuyalocal = peers.find((p) => p.appId === 'com.tuyalocal');
    assert.ok(tuyalocal);
    assert.ok(String(tuyalocal.storeTest).includes('com.tuyalocal'));
    assert.equal(tuyalocal.github, 'https://github.com/andiwirz/com.tuyalocal');
    assert.ok(tuyalocal.homeyTest);

    const johan = peers.find((p) => p.appId === 'com.tuya.zigbee');
    assert.ok(johan);
    assert.ok(String(johan.github).includes('JohanBendz'));
    assert.ok(johan.homeyLive);

    assert.ok(ssot.athomTipSnapshot['com.tuyalocal'].test);
    assert.ok(ssot.externalNonHomey.some((e) => e.id === 'ha-tuya-local'));
  });

  it('human doc + SourceCredits credit tuyalocal and Johan', () => {
    const doc = fs.readFileSync(
      path.join(ROOT, 'docs/architecture/COMPLEMENTARY_HOMEY_APPS.md'),
      'utf8',
    );
    assert.ok(doc.includes('com.tuyalocal'));
    assert.ok(doc.includes('1.0.237'));
    assert.ok(doc.includes('JohanBendz'));
    assert.ok(doc.includes('com.dlnraja.tuya.zigbee.bastien'));

    const credits = require('../../lib/data/SourceCredits');
    assert.ok(credits.SOURCES.TUYA_LOCAL_ANDIWIRZ);
    assert.ok(credits.SOURCES.TUYA_LOCAL_ANDIWIRZ.website.includes('com.tuyalocal'));
    assert.ok(credits.SOURCES.JOHAN_TUYA_ZIGBEE);
    assert.ok(credits.SOURCES.HA_TUYA_LOCAL);
    assert.ok(
      (credits.COMMUNITY_CONTRIBUTORS || []).some((c) => c.github === 'andiwirz'),
    );
    assert.ok(
      (credits.COMMUNITY_CONTRIBUTORS || []).some((c) => c.github === 'JohanBendz'),
    );
  });

  it('dual-app classifies P2643 as MASTER_ONLY', () => {
    const tracks = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/dual-app-tracks.json'), 'utf8'),
    );
    assert.equal(tracks.domains.p2643_complementary_homey_apps_catalog.tag, 'MASTER_ONLY');
  });
});
