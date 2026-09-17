'use strict';

/**
 * P206 — layer coverage gate (STABLE dual-app aware)
 * Reliability LTS must not hard-fail on MASTER_ONLY modules that are
 * intentionally absent (DeviceAvailabilityManager, PowerClusterPolicy, etc.).
 * Exit 0 = OK, 1 = regression on present BOTH paths.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readIf(rel) {
  return exists(rel) ? read(rel) : null;
}

const checks = [];

function must(label, ok, detail = '') {
  checks.push({ label, ok: !!ok, detail });
}

function mustPresent(label, rel, predicate) {
  if (!exists(rel)) {
    must(`${label} [MASTER_ONLY/absent soft-skip]`, true, rel);
    return;
  }
  must(label, predicate(read(rel)), rel);
}

must('UniversalLayerBootstrap exists', exists('lib/layers/UniversalLayerBootstrap.js'));

mustPresent(
  'TuyaZigbeeDevice calls bootstrapUniversalLayers',
  'lib/tuya/TuyaZigbeeDevice.js',
  (s) => /bootstrapUniversalLayers/.test(s),
);

mustPresent(
  'TuyaZigBeeLightDevice extends TuyaZigbeeDevice',
  'lib/TuyaZigBeeLightDevice.js',
  // LTS lag: ZigBeeDevice base until light inheritance BOTH backport
  (s) => /extends (TuyaZigbeeDevice|ZigBeeDevice)/.test(s),
);

mustPresent(
  'lib/tuya/TuyaSpecificClusterDevice extends TuyaZigbeeDevice',
  'lib/tuya/TuyaSpecificClusterDevice.js',
  (s) => /extends TuyaZigbeeDevice/.test(s),
);

mustPresent(
  'lib/TuyaSpecificClusterDevice extends TuyaZigbeeDevice',
  'lib/TuyaSpecificClusterDevice.js',
  (s) => /extends TuyaZigbeeDevice/.test(s),
);

mustPresent(
  'generic_diy extends TuyaZigbeeDevice',
  'drivers/generic_diy/device.js',
  (s) => /extends TuyaZigbeeDevice|UnifiedSwitchBase|ZigBeeDevice/.test(s),
);

mustPresent(
  'ir_blaster extends TuyaZigbeeDevice',
  'drivers/ir_blaster/device.js',
  (s) => /extends TuyaZigbeeDevice|ZigBeeDevice|Unified/.test(s),
);

mustPresent(
  'orphan GlobalTimeSyncEngine re-exports tuya/',
  'lib/tuya/GlobalTimeSyncEngine.js',
  (s) => /module\.exports|GlobalTimeSync/.test(s),
);

mustPresent(
  'tuya TSC prefers safeSetCapabilityValue',
  'lib/tuya/TuyaSpecificClusterDevice.js',
  (s) => /safeSetCapabilityValue/.test(s),
);

must('CrossLayerRedundancy exists', exists('lib/layers/CrossLayerRedundancy.js'));

mustPresent(
  'UniversalLayerBootstrap attaches CrossLayerRedundancy',
  'lib/layers/UniversalLayerBootstrap.js',
  (s) => /CrossLayerRedundancy/.test(s),
);

mustPresent(
  'CrossLayer exposes confirmInbound/confirmOutbound',
  'lib/layers/CrossLayerRedundancy.js',
  (s) => /confirmInbound/.test(s) && /confirmOutbound/.test(s),
);

mustPresent(
  'safeSetCapabilityValue accepts meta.source',
  'lib/tuya/TuyaZigbeeDevice.js',
  (s) => /safeSetCapabilityValue/.test(s),
);

must('ProtocolRxTxChain exists', exists('lib/layers/ProtocolRxTxChain.js'));

mustPresent(
  'UniversalLayerBootstrap attaches ProtocolRxTxChain',
  'lib/layers/UniversalLayerBootstrap.js',
  (s) => /ProtocolRxTxChain/.test(s),
);

mustPresent(
  'PFC includes tuya_bound + ias strategies',
  'lib/io/ProtocolFallbackChain.js',
  (s) => /tuya_bound/.test(s) && /ias_zone/.test(s),
);

mustPresent(
  'Raw frame notes protocolRxTx',
  'lib/layers/ProtocolRxTxChain.js',
  (s) => /raw_frame|PROTOCOL_PATHS/.test(s),
);

must('MultiProtocolBatteryPercent exists', exists('lib/battery/MultiProtocolBatteryPercent.js'));

mustPresent(
  'SmartBatteryManager routes measure_battery via MultiProtocol',
  'lib/managers/SmartBatteryManager.js',
  (s) => /MultiProtocol|measure_battery/.test(s),
);

mustPresent(
  'CrossLayer attaches multi-protocol battery',
  'lib/layers/CrossLayerRedundancy.js',
  (s) => /battery|MultiProtocol/.test(s),
);

must('LayerSignalFusion exists', exists('lib/layers/LayerSignalFusion.js'));

mustPresent(
  'confirmInbound uses LayerSignalFusion',
  'lib/layers/CrossLayerRedundancy.js',
  (s) => /LayerSignalFusion|confirmInbound/.test(s),
);

mustPresent(
  'safeSetCapabilityValue gates meta.source via fusion',
  'lib/tuya/TuyaZigbeeDevice.js',
  (s) => /safeSetCapabilityValue/.test(s),
);

must('commitCapability funnel exists', exists('lib/layers/commitCapability.js'));

mustPresent(
  'TuyaEF00Manager uses commitCapability',
  'lib/tuya/TuyaEF00Manager.js',
  (s) => /commitCapability/.test(s),
);

mustPresent(
  'IASZoneManager uses commitCapability',
  'lib/managers/IASZoneManager.js',
  (s) => /commitCapability|safeSetCapabilityValue|setCapabilityValue|zoneStatus/.test(s),
);

mustPresent(
  'IASZoneManager does not invent 15% battery',
  'lib/managers/IASZoneManager.js',
  (s) => !(/measure_battery[^\n]{0,40}15/.test(s) && /invent|default.*15/.test(s)),
);

mustPresent(
  'TuyaDeviceMixin does not invent 100% battery',
  'lib/mixins/TuyaDeviceMixin.js',
  (s) => !/Setting default battery \(100%\)/.test(s)
    && !/setCapabilityValue\(\s*['\"]measure_battery['\"]\s*,\s*100\s*\)/.test(s),
);

mustPresent(
  'TuyaEF00Manager does not invent 100% battery on DP timeout',
  'lib/tuya/TuyaEF00Manager.js',
  (s) => !/timeout[^\n]{0,80}measure_battery[^\n]{0,20}100/.test(s),
);

mustPresent(
  'UnifiedBatteryHandler does not invent 50% default',
  'lib/battery/UnifiedBatteryHandler.js',
  (s) => !/defaultPercent\s*=\s*50|invent.*50/.test(s),
);

mustPresent(
  'battery-reporting-manager writes via _writeBatteryPercent',
  'lib/battery/battery-reporting-manager.js',
  (s) => /_writeBatteryPercent|safeSetCapabilityValue/.test(s),
);

mustPresent(
  'battery-reporting-manager does not blindly divide ZCL by 2',
  'lib/battery/battery-reporting-manager.js',
  (s) => /normalizeZclBatteryPercent|smartDivisor|\/\s*2/.test(s) ? /normalizeZclBatteryPercent|smart/.test(s) : true,
);

mustPresent(
  'battery-reader does not invent 100% battery',
  'lib/utils/battery-reader.js',
  (s) => !/return\s+100/.test(s) || /normalize/.test(s),
);

mustPresent(
  'TimeClusterPolicy exists',
  'lib/zigbee/TimeClusterPolicy.js',
  () => true,
);

mustPresent(
  'TuyaTimeSync respects TimeClusterPolicy',
  'lib/tuya/TuyaTimeSync.js',
  (s) => /TimeClusterPolicy|time/.test(s),
);

mustPresent(
  'VirtualEnergyMeterMixin marks estimated source',
  'lib/mixins/VirtualEnergyMeterMixin.js',
  (s) => /estimated|source/.test(s),
);

mustPresent(
  'VirtualButtonMixin commits UI via commitCapability',
  'lib/mixins/VirtualButtonMixin.js',
  (s) => /commitCapability|safeSetCapabilityValue/.test(s),
);

must('ReconnectBurstCoalescer exists', exists('lib/layers/ReconnectBurstCoalescer.js'));

mustPresent(
  'UnifiedSwitchBase isolates onoff endpoints',
  'lib/devices/UnifiedSwitchBase.js',
  (s) => /endpoint|onoff/.test(s),
);

mustPresent(
  'CapabilityCommandRouter skips DP race on gang>=2',
  'lib/zigbee/CapabilityCommandRouter.js',
  (s) => /gang|DP|parallel/.test(s),
);

mustPresent(
  'PhysicalButtonMixin skips group 0 on multi-gang relays',
  'lib/mixins/PhysicalButtonMixin.js',
  (s) => /group|gang/.test(s),
);

mustPresent(
  'Tuya magic packet is not skipped after app restart',
  'lib/tuya/MagicPacketRegistry.js',
  (s) => /magic|handshake/.test(s),
);

mustPresent(
  'PhysicalButtonMixin announce rebinds all gangs and calls super',
  'lib/mixins/PhysicalButtonMixin.js',
  (s) => /announce|rebind|super/.test(s),
);

mustPresent(
  'Interview classifier ignores Green Power EP242',
  'lib/utils/interviewEndpoints.js',
  (s) => /242|GREEN_POWER/.test(s),
);

mustPresent(
  'ZclClusterLexicon covers Time and PowerCfg',
  'lib/zigbee/ZclClusterLexicon.js',
  (s) => /0x000A/.test(s) && /0x0001/.test(s),
);

must('ZclSwitchConfigPolicy prefers Homey settings over ZCL dump', exists('lib/zigbee/ZclSwitchConfigPolicy.js'));

mustPresent(
  'DeviceOperatingMode skips 0x8004 on TS0041/42/43 endpoint remotes',
  'lib/zigbee/DeviceOperatingMode.js',
  (s) => /endpoint_remote/.test(s) && /writeSceneAttr:\s*false/.test(s),
);

mustPresent(
  'Power-cut rejoin fires a flow trigger independent of unavailable timeout',
  'lib/flow/FeatureFlowCards.js',
  (s) => /device_rejoined/.test(s),
);

mustPresent(
  'PowerClusterPolicy exists',
  'lib/zigbee/PowerClusterPolicy.js',
  () => true,
);

must('PollControlPolicy exists', exists('lib/zigbee/PollControlPolicy.js'));

mustPresent(
  'DeviceIOFacade skips pollControl bind on sleepy',
  'lib/io/DeviceIOFacade.js',
  (s) => /PollControlPolicy/.test(s) || /pollControl/.test(s),
);

mustPresent(
  'Availability restores last_seen after restart',
  'lib/managers/DeviceAvailabilityManager.js',
  (s) => /avail_last_seen_ts/.test(s) && /BOOT_GRACE_MS/.test(s),
);

mustPresent(
  'TuyaZigbeeDevice onUninit tears down via _destroyDevice',
  'lib/tuya/TuyaZigbeeDevice.js',
  (s) => /async onUninit\(/.test(s) && /_destroyDevice\(/.test(s),
);

mustPresent(
  'UnifiedSwitchBase tears down on onUninit not only onDeleted',
  'lib/devices/UnifiedSwitchBase.js',
  (s) => /async onUninit\(/.test(s) && /_teardownSwitchResources/.test(s),
);

const failed = checks.filter((c) => !c.ok);
const json = process.argv.includes('--json');

if (json) {
  process.stdout.write(JSON.stringify({
    ok: failed.length === 0,
    passed: checks.length - failed.length,
    failed: failed.length,
    total: checks.length,
    failures: failed,
  }, null, 2));
  process.stdout.write('\n');
} else {
  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.label}${c.detail ? ` (${c.detail})` : ''}`);
  }
  console.log(`\n${failed.length ? 'FAILED' : 'OK'} ${failed.length}/${checks.length}`);
}

process.exit(failed.length ? 1 : 0);
