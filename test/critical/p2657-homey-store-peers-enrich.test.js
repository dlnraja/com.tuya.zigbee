'use strict';

/**
 * P2657 — Contre quoi: Homey Store peer catalog + CREDITS + Fix It TCP note
 * must stay complementary (no wipe, no invent pid, skip Bastien for catalog).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2657 Homey Store peers complementary enrich', () => {
  it('SSOT lists Johan + Lidl + tuyalocal + cloud + Drenso + rebtor + OSS', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/homey-store-peers-ssot.json'), 'utf8'),
    );
    assert.equal(ssot._meta.id, 'P2657-homey-store-peers-enrich');
    assert.equal(ssot.mandate.complementaryOnly, true);
    assert.equal(ssot.mandate.skipBastienUnlessHouseDevices, true);
    assert.equal(ssot.mandate.noForumPost, true);
    const ids = (ssot.homeyPeers || []).map((p) => p.id);
    for (const id of [
      'johan-tuya-zigbee',
      'lidl-smart-home',
      'tuyalocal',
      'tuya-cloud-heine',
      'tuya2-drenso',
      'rebtor-tuya',
      'heszegi-ledvance-wifi',
    ]) {
      assert.ok(ids.includes(id), `missing peer ${id}`);
    }
    const oss = (ssot.externalOss || []).map((p) => p.id);
    assert.ok(oss.includes('zigbee2mqtt'));
    assert.ok(oss.includes('zha'));
    assert.ok(oss.includes('tuyapi'));
  });

  it('CREDITS.md thanks peers and Fix It mentions single TCP session', () => {
    const credits = fs.readFileSync(path.join(ROOT, 'docs/CREDITS.md'), 'utf8');
    assert.ok(/Johan Bendz/i.test(credits));
    assert.ok(/Andi Wirz/i.test(credits));
    assert.ok(/Jurgen Heine/i.test(credits));
    assert.ok(/Rens Brandwijk/i.test(credits));
    assert.ok(/Zigbee2MQTT/i.test(credits));

    const { LAN_LIMITATION_NOTES } = require('../../lib/wifi/WifiFixIt');
    assert.ok(LAN_LIMITATION_NOTES.some((n) => /one LAN TCP|phone app/i.test(n)));

    const src = require('../../lib/data/SourceCredits');
    assert.ok(src.SOURCES.JOHAN_LIDL);
    assert.ok(src.SOURCES.REBTOR_TUYA);
    assert.ok(src.SOURCES.HESZEGI_LEDVANCE);
    assert.ok(src.SOURCES.DRENSO_TUYA2);
  });

  it('dual-app classifies P2657 MASTER_ONLY and human doc exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/architecture/HOMEY_STORE_PEERS_ENRICH.md')));
    assert.ok(fs.existsSync(path.join(ROOT, 'reports/homey-store-peers-2026-09-21/PAIN_MAP.md')));
    const tracks = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/dual-app-tracks.json'), 'utf8'),
    );
    assert.equal(tracks.domains.p2657_homey_store_peers_enrich.tag, 'MASTER_ONLY');
    assert.ok(tracks.domains.p2657_homey_store_peers_enrich.skipBastien);
  });

  it('probe script uses apps-api.athom.com', () => {
    const probe = fs.readFileSync(
      path.join(ROOT, 'tools/ci/homey-store-peer-probe.js'),
      'utf8',
    );
    assert.ok(probe.includes('apps-api.athom.com'));
    assert.ok(probe.includes('P2657'));
  });
});
