'use strict';

/**
 * P206 — layer coverage gate
 * Ensures orphan / stub bases inherit TuyaZigbeeDevice and bootstrap exists.
 * Exit 0 = OK, 1 = regression.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const checks = [];

function must(label, ok, detail = '') {
  checks.push({ label, ok: !!ok, detail });
}

must(
  'UniversalLayerBootstrap exists',
  fs.existsSync(path.join(ROOT, 'lib/layers/UniversalLayerBootstrap.js')),
);

must(
  'TuyaZigbeeDevice calls bootstrapUniversalLayers',
  /bootstrapUniversalLayers/.test(read('lib/tuya/TuyaZigbeeDevice.js')),
);

must(
  'TuyaZigBeeLightDevice extends TuyaZigbeeDevice',
  /class TuyaZigBeeLightDevice extends TuyaZigbeeDevice/.test(read('lib/TuyaZigBeeLightDevice.js')),
);

must(
  'lib/tuya/TuyaSpecificClusterDevice extends TuyaZigbeeDevice',
  /class TuyaSpecificClusterDevice extends TuyaZigbeeDevice/.test(read('lib/tuya/TuyaSpecificClusterDevice.js')),
);

must(
  'lib/TuyaSpecificClusterDevice extends TuyaZigbeeDevice',
  /class TuyaSpecificClusterDevice extends TuyaZigbeeDevice/.test(read('lib/TuyaSpecificClusterDevice.js')),
);

must(
  'generic_diy extends TuyaZigbeeDevice',
  /class GenericDIYDevice extends TuyaZigbeeDevice/.test(read('drivers/generic_diy/device.js')),
);

must(
  'ir_blaster extends TuyaZigbeeDevice',
  /class IrBlasterDevice extends TuyaZigbeeDevice/.test(read('drivers/ir_blaster/device.js')),
);

must(
  'orphan GlobalTimeSyncEngine re-exports tuya/',
  /require\(['"]\.\/tuya\/GlobalTimeSyncEngine['"]\)/.test(read('lib/GlobalTimeSyncEngine.js')),
);

must(
  'tuya TSC prefers safeSetCapabilityValue',
  /safeSetCapabilityValue/.test(read('lib/tuya/TuyaSpecificClusterDevice.js')),
);

must(
  'CrossLayerRedundancy exists',
  fs.existsSync(path.join(ROOT, 'lib/layers/CrossLayerRedundancy.js')),
);

must(
  'UniversalLayerBootstrap attaches CrossLayerRedundancy',
  /attachCrossLayerRedundancy/.test(read('lib/layers/UniversalLayerBootstrap.js')),
);

must(
  'CrossLayer exposes confirmInbound/confirmOutbound',
  /confirmInbound/.test(read('lib/layers/CrossLayerRedundancy.js'))
    && /confirmOutbound/.test(read('lib/layers/CrossLayerRedundancy.js')),
);

must(
  'safeSetCapabilityValue accepts meta.source',
  /meta\.source/.test(read('lib/tuya/TuyaZigbeeDevice.js')),
);

must(
  'ProtocolRxTxChain exists',
  fs.existsSync(path.join(ROOT, 'lib/layers/ProtocolRxTxChain.js')),
);

must(
  'UniversalLayerBootstrap attaches ProtocolRxTxChain',
  /attachProtocolRxTxChain/.test(read('lib/layers/UniversalLayerBootstrap.js')),
);

must(
  'PFC includes tuya_bound + ias strategies',
  /tuya_bound_cluster/.test(read('lib/io/ProtocolFallbackChain.js'))
    && /ias_zone/.test(read('lib/io/ProtocolFallbackChain.js')),
);

must(
  'Raw frame notes protocolRxTx',
  /protocolRxTx\?\.noteRx/.test(read('lib/tuya/TuyaZigbeeDevice.js')),
);

must(
  'MultiProtocolBatteryPercent exists',
  fs.existsSync(path.join(ROOT, 'lib/battery/MultiProtocolBatteryPercent.js')),
);

must(
  'SmartBatteryManager routes measure_battery via MultiProtocol',
  /MultiProtocolBatteryPercent/.test(read('lib/managers/SmartBatteryManager.js')),
);

must(
  'CrossLayer attaches multi-protocol battery',
  /attachMultiProtocolBattery/.test(read('lib/layers/CrossLayerRedundancy.js')),
);

must(
  'LayerSignalFusion exists',
  fs.existsSync(path.join(ROOT, 'lib/layers/LayerSignalFusion.js')),
);

must(
  'confirmInbound uses LayerSignalFusion',
  /LayerSignalFusion/.test(read('lib/layers/CrossLayerRedundancy.js')),
);

must(
  'safeSetCapabilityValue gates meta.source via fusion',
  /LayerSignalFusion/.test(read('lib/tuya/TuyaZigbeeDevice.js')),
);

must(
  'commitCapability funnel exists',
  fs.existsSync(path.join(ROOT, 'lib/layers/commitCapability.js')),
);

must(
  'TuyaEF00Manager uses commitCapability',
  /commitCapabilityCatch/.test(read('lib/tuya/TuyaEF00Manager.js')),
);

must(
  'IASZoneManager uses commitCapability',
  /commitCapabilityCatch/.test(read('lib/managers/IASZoneManager.js')),
);

must(
  'IASZoneManager does not invent 15% battery',
  !/Battery set to 15%/.test(read('lib/managers/IASZoneManager.js')),
);

must(
  'TuyaDeviceMixin does not invent 100% battery',
  !/Setting default battery \(100%\)/.test(read('lib/mixins/TuyaDeviceMixin.js')),
);

must(
  'TuyaEF00Manager does not invent 100% battery on DP timeout',
  !/setCapabilityValue\?\.\('measure_battery', 100\)/.test(read('lib/tuya/TuyaEF00Manager.js')),
);

must(
  'UnifiedBatteryHandler does not invent 50% default',
  !/using marked 50% estimate/.test(read('lib/battery/UnifiedBatteryHandler.js')),
);

must(
  'battery-reporting-manager writes via _writeBatteryPercent',
  /_writeBatteryPercent/.test(read('lib/utils/battery-reporting-manager.js'))
    && !/setCapabilityValue\('measure_battery'/.test(read('lib/utils/battery-reporting-manager.js')),
);

must(
  'battery-reporting-manager does not blindly divide ZCL by 2',
  !/Math\.min\(100, Math\.max\(0, (?:value|battery\.batteryPercentageRemaining) \/ 2\)\)/.test(
    read('lib/utils/battery-reporting-manager.js')
  ),
);

must(
  'battery-reader does not invent 100% battery',
  !/fallback_100/.test(read('lib/utils/battery-reader.js'))
    && !/new_device_assumption/.test(read('lib/utils/battery-reader.js')),
);

must(
  'TimeClusterPolicy exists',
  fs.existsSync(path.join(ROOT, 'lib/zigbee/TimeClusterPolicy.js')),
);

must(
  'TuyaTimeSync respects TimeClusterPolicy',
  /TimeClusterPolicy/.test(read('lib/tuya/TuyaTimeSync.js')),
);

must(
  'VirtualEnergyMeterMixin marks estimated source',
  /source: 'estimated'/.test(read('lib/mixins/VirtualEnergyMeterMixin.js')),
);

must(
  'VirtualButtonMixin commits UI via commitCapability',
  /commitCapability/.test(read('lib/mixins/VirtualButtonMixin.js')),
);

must(
  'ReconnectBurstCoalescer exists',
  fs.existsSync(path.join(ROOT, 'lib/layers/ReconnectBurstCoalescer.js')),
);

must(
  'UnifiedSwitchBase isolates onoff endpoints',
  /capabilityForOnOffEndpoint/.test(read('lib/devices/UnifiedSwitchBase.js')),
);

must(
  'CapabilityCommandRouter skips DP race on gang>=2',
  /endpointId > 1/.test(read('lib/zigbee/CapabilityCommandRouter.js'))
    && /skipDp/.test(read('lib/zigbee/CapabilityCommandRouter.js')),
);

must(
  'PhysicalButtonMixin skips group 0 on multi-gang relays',
  /groupsCluster && !isMultiGangRelay/.test(read('lib/mixins/PhysicalButtonMixin.js')),
);

must(
  'Tuya magic packet is not skipped after app restart',
  /Do NOT skip on a persisted store/.test(read('lib/zigbee/TuyaMagicPacket.js'))
    && /force: true/.test(read('lib/devices/UnifiedSwitchBase.js')),
);

must(
  'PhysicalButtonMixin announce rebinds all gangs and calls super',
  /super\.onEndDeviceAnnounce/.test(read('lib/mixins/PhysicalButtonMixin.js'))
    && /Math\.max\(Number\(this\.gangCount\)/.test(read('lib/mixins/PhysicalButtonMixin.js')),
);

must(
  'Interview classifier ignores Green Power EP242',
  fs.existsSync(path.join(ROOT, 'lib/utils/interviewEndpoints.js'))
    && /GREEN_POWER_ENDPOINT = 242/.test(read('lib/utils/interviewEndpoints.js')),
);

must(
  'ZclClusterLexicon covers Time and PowerCfg',
  /0x000A/.test(read('lib/zigbee/ZclClusterLexicon.js'))
    && /0x0001/.test(read('lib/zigbee/ZclClusterLexicon.js')),
);

must(
  'ZclSwitchConfigPolicy prefers Homey settings over ZCL dump',
  fs.existsSync(path.join(ROOT, 'lib/zigbee/ZclSwitchConfigPolicy.js')),
);

must(
  'DeviceOperatingMode skips 0x8004 on TS0041/42/43 endpoint remotes',
  fs.existsSync(path.join(ROOT, 'lib/zigbee/DeviceOperatingMode.js'))
    && /endpoint_remote/.test(read('lib/zigbee/DeviceOperatingMode.js'))
    && /writeSceneAttr: false/.test(read('lib/zigbee/DeviceOperatingMode.js')),
);

must(
  'Power-cut rejoin fires a flow trigger independent of unavailable timeout',
  /device_rejoined/.test(read('lib/flow/FeatureFlowCards.js'))
    && /noteBootDump/.test(read('lib/managers/DeviceAvailabilityManager.js')),
);

must(
  'PowerClusterPolicy exists',
  fs.existsSync(path.join(ROOT, 'lib/zigbee/PowerClusterPolicy.js')),
);

must(
  'PollControlPolicy exists',
  fs.existsSync(path.join(ROOT, 'lib/zigbee/PollControlPolicy.js')),
);

must(
  'DeviceIOFacade skips pollControl bind on sleepy',
  /PollControlPolicy/.test(read('lib/io/DeviceIOFacade.js'))
    && /skip pollControl/.test(read('lib/io/DeviceIOFacade.js')),
);

must(
  'Availability restores last_seen after restart',
  /avail_last_seen_ts/.test(read('lib/managers/DeviceAvailabilityManager.js'))
    && /BOOT_GRACE_MS/.test(read('lib/managers/DeviceAvailabilityManager.js')),
);

must(
  'TuyaZigbeeDevice onUninit tears down via _destroyDevice',
  /async onUninit\(/.test(read('lib/tuya/TuyaZigbeeDevice.js'))
    && /_destroyDevice\(/.test(read('lib/tuya/TuyaZigbeeDevice.js')),
);

must(
  'UnifiedSwitchBase tears down on onUninit not only onDeleted',
  /async onUninit\(/.test(read('lib/devices/UnifiedSwitchBase.js'))
    && /_teardownSwitchResources/.test(read('lib/devices/UnifiedSwitchBase.js')),
);

const failed = checks.filter(c => !c.ok);
const json = process.argv.includes('--json');

if (json) {
  process.stdout.write(JSON.stringify({
    ok: failed.length === 0,
    passed: checks.length - failed.length,
    failed: failed.length,
    checks,
  }, null, 2) + '\n');
} else {
  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.label}${c.detail ? ` — ${c.detail}` : ''}`);
  }
  console.log(failed.length === 0 ? `\nOK (${checks.length} checks)` : `\nFAILED ${failed.length}/${checks.length}`);
}

process.exit(failed.length === 0 ? 0 : 1);
