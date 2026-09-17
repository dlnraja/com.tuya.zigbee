'use strict';

/**
 * ComplementaryCoverageCatalog (P2544)
 * WHY: Inventory every complementary I/O / wrapper / OTA / antispam path beyond
 * Homey native zigbee/tuya libs — polymorphic coverage without inventing pids.
 * Side-effect free; safe for Homey bundle + CI.
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');

const WRAPPERS = Object.freeze([
  { id: 'device_io_facade', path: 'lib/io/DeviceIOFacade.js', role: 'unified TX/RX facade' },
  { id: 'homey_compensation', path: 'lib/io/HomeyCompensationLayer.js', role: 'Homey interview gaps' },
  { id: 'protocol_fallback', path: 'lib/io/ProtocolFallbackChain.js', role: 'ordered RX/TX cascade' },
  { id: 'protocol_rxtx', path: 'lib/layers/ProtocolRxTxChain.js', role: 'path inventory + wrap' },
  { id: 'capability_router', path: 'lib/zigbee/CapabilityCommandRouter.js', role: 'ZCL↔DP parallel discover' },
  { id: 'raw_cluster', path: 'lib/clusters/RawClusterFallback.js', role: 'listen unnamed clusters' },
  { id: 'protocol_detect', path: 'lib/protocol/IntelligentProtocolDetect.js', role: 'ZCL↔EF00 hybrid' },
  { id: 'path_finder', path: 'lib/protocol/CommunicationPathFinder.js', role: 'rank sleepy-safe paths' },
  { id: 'cluster_binder', path: 'lib/clusters/UniversalClusterBinder.js', role: 'bind/configureReporting' },
  { id: 'flow_actuator', path: 'lib/flow/ActuatorFlowHelper.js', role: 'flow → device helpers' },
  { id: 'flow_autowire', path: 'lib/flow/DeclaredFlowCardAutoWire.js', role: 'declare⇒wire cards' },
  { id: 'energy', path: 'lib/energy/UniversalEnergyHandler.js', role: 'polymorphic energy caps' },
  { id: 'virtual_telemetry', path: 'lib/dynamic/VirtualTelemetryCompensationEngine.js', role: 'anti-spam + virtual power' },
  { id: 'firmware_quirk', path: 'lib/resilience/FirmwareQuirkCompensator.js', role: 'fw quirk compensate' },
  { id: 'ota_manager', path: 'lib/ota/OTAUpdateManager.js', role: 'OTA orchestration' },
  { id: 'ota_repo', path: 'lib/ota/OTARepository.js', role: 'multi-index firmware repo' },
]);

const ANTISPAM = Object.freeze([
  'safeSetCapabilityValue',
  'L14 SanityFilter',
  'BatteryCore.antiFloodCheck',
  'VirtualTelemetryCompensationEngine',
  'DeviceGroupManager throttle',
]);

function listWrappers() {
  return WRAPPERS.slice();
}

function presentWrappers() {
  return WRAPPERS.map((w) => ({
    ...w,
    present: fs.existsSync(path.join(ROOT, w.path)),
  }));
}

function loadSsot() {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/complementary-coverage-max-ssot.json'), 'utf8')
    );
  } catch {
    return null;
  }
}

function otaOemIndexes() {
  const ssot = loadSsot();
  return (ssot?.otaFirmware?.indexesOemSafe || []).slice();
}

function otaResearchNeverShip() {
  const ssot = loadSsot();
  return (ssot?.otaFirmware?.researchOnlyNeverShip || []).slice();
}

function coverageSummary() {
  const wrappers = presentWrappers();
  return {
    patch: 'P2544',
    wrappersTotal: wrappers.length,
    wrappersPresent: wrappers.filter((w) => w.present).length,
    antispam: ANTISPAM.slice(),
    otaOemIndexes: otaOemIndexes().length,
    otaNeverShip: otaResearchNeverShip().length,
    cloudAi: false,
  };
}

module.exports = {
  WRAPPERS,
  ANTISPAM,
  listWrappers,
  presentWrappers,
  loadSsot,
  otaOemIndexes,
  otaResearchNeverShip,
  coverageSummary,
};
