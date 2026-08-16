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
