'use strict';

/**
 * P2544 — Max complementary I/O + OTA Contre quoi.
 * BOTH: wrappers beyond Homey zigbee/tuya libs; multi-index OEM OTA;
 * never invent pid; never ship community replacement FW.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2544 complementary coverage max + OTA L99', () => {
  it('coverage-max SSOT + catalog exist and refuse community FW', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/complementary-coverage-max-ssot.json'), 'utf8')
    );
    assert.equal(ssot._meta.patch, 'P2544');
    assert.equal(ssot._meta.dualApp, 'BOTH');
    assert.equal(ssot.doctrine.complementaryOnly, true);
    assert.equal(ssot.doctrine.neverShipCommunityReplacementFw, true);
    assert.ok(ssot.otaFirmware.indexesOemSafe.length >= 4);
    assert.ok(ssot.otaFirmware.researchOnlyNeverShip.some((x) => /pvvx/i.test(x.id)));
    assert.ok(ssot.otaFirmware.researchOnlyNeverShip.some((x) => /doctor64/i.test(x.id)));
    assert.ok(ssot.ioDomains.wrappersBeyondHomeyLibs.includes('ProtocolRxTxChain'));
    assert.ok(ssot.ioDomains.wrappersBeyondHomeyLibs.includes('OTAUpdateManager'));

    const cat = require(path.join(ROOT, 'lib/catalog/ComplementaryCoverageCatalog.js'));
    const summary = cat.coverageSummary();
    assert.equal(summary.patch, 'P2544');
    assert.ok(summary.wrappersPresent >= 14, `wrappersPresent=${summary.wrappersPresent}`);
    assert.equal(summary.cloudAi, false);
    assert.ok(cat.otaOemIndexes().some((x) => /zigpy/i.test(x.id)));
    assert.ok(cat.otaResearchNeverShip().length >= 3);
  });

  it('homey-device-updates SSOT has complementary OEM indexes + never-ship list', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/homey-device-updates.json'), 'utf8')
    );
    assert.equal(ssot._meta.patch, 'P2544');
    assert.ok(Array.isArray(ssot.sources.complementaryIndexes));
    assert.ok(ssot.sources.complementaryIndexes.some((x) => x.id === 'zigpy-ota-z2m-stable'));
    assert.ok(ssot.sources.complementaryIndexes.some((x) => /fairecasoimeme/i.test(x.id)));
    assert.ok(ssot.sources.researchOnlyNeverShip.some((x) => /pvvx/i.test(x.id)));
    assert.equal(ssot.safety.refuseCommunityReplacementFw, true);
    assert.ok(ssot.l99Docs.some((u) => /zigbee2mqtt\.io.*ota/i.test(u)));
  });

  it('OTARepository + TuyaXiaomiOTAProvider list zigpy complementary index', () => {
    const repoSrc = fs.readFileSync(path.join(ROOT, 'lib/ota/OTARepository.js'), 'utf8');
    assert.match(repoSrc, /zigpy\/zigpy-ota/);
    assert.match(repoSrc, /z2m_v1_ota\.json/);
    assert.match(repoSrc, /fairecasoimeme\/zigbee-OTA/);
    const prov = fs.readFileSync(path.join(ROOT, 'lib/ota/TuyaXiaomiOTAProvider.js'), 'utf8');
    assert.match(prov, /ZIGPY_Z2M_STABLE/);
    assert.match(prov, /FAIRECASOIMEME/);
  });

  it('ProtocolRxTxChain inventories flow/energy/poll/router/antispam/ota paths', () => {
    const { PROTOCOL_PATHS } = require(path.join(ROOT, 'lib/layers/ProtocolRxTxChain.js'));
    for (const id of ['flow', 'energy', 'poll', 'capability_router', 'antispam', 'ota']) {
      assert.ok(PROTOCOL_PATHS[id], `missing path ${id}`);
    }
  });

  it('ProtocolFallbackChain + SSOT include capability_command_router / antispam_filter', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/complementary-rx-tx-dp-cluster-ssot.json'), 'utf8')
    );
    assert.ok(ssot.txOrderCanonical.includes('capability_command_router'));
    assert.ok(ssot.txOrderCanonical.includes('ota_firmware'));
    assert.ok(ssot.rxOrderCanonical.includes('antispam_filter'));
    assert.ok(ssot.protocolPaths.includes('ota'));
    const PFC = require(path.join(ROOT, 'lib/io/ProtocolFallbackChain.js'));
    const chain = new PFC({ log() {} });
    assert.deepEqual([...chain.rxOrder], ssot.rxOrderCanonical);
    assert.deepEqual([...chain.txOrder], ssot.txOrderCanonical);
  });

  it('CapabilityCommandRouter expands polymorphic CAP_CLUSTER (energy/AQ/thermostat)', () => {
    const { CAP_CLUSTER } = require(path.join(ROOT, 'lib/zigbee/CapabilityCommandRouter.js'));
    for (const cap of [
      'measure_power', 'meter_power', 'measure_co2', 'measure_pm25',
      'target_temperature', 'locked', 'alarm_motion',
    ]) {
      assert.ok(CAP_CLUSTER[cap], `missing CAP_CLUSTER.${cap}`);
    }
  });

  it('build-firmware-updates merges complementary indexes (not community FW)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/build-firmware-updates.js'), 'utf8');
    assert.match(src, /complementaryIndexes/);
    assert.match(src, /P2544/);
    assert.doesNotMatch(src, /doctor64/);
    assert.doesNotMatch(src, /pvvx\/ZigbeeTLc/);
  });
});
