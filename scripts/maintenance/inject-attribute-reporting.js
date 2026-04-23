#!/usr/bin/env node
/**
 * Attribute Reporting Injector
 * Adds configureAttributeReporting() to Zigbee sensor drivers that lack it.
 * 
 * SAFETY: Only injects if the driver already has onNodeInit/onMeshInit.
 * Does NOT modify WiFi/Tuya EF00-only drivers.
 * Validates syntax after injection.
 */
'use strict';

const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');

const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');
const DRY = process.env.DRY_RUN === 'true';

// Mapping: capability  cluster + attribute + reporting config
const REPORTING_MAP = {
  'measure_temperature': {
    cluster: 'msTemperatureMeasurement',
    attr: 'measuredValue',
    minInterval: 30, maxInterval: 600, minChange: 50 // 0.5Â°C
  },
  'measure_humidity': {
    cluster: 'msRelativeHumidity',
    attr: 'measuredValue',
    minInterval: 30, maxInterval: 600, minChange: 100 // 1%
  },
  'measure_battery': {
    cluster: 'genPowerCfg',
    attr: 'batteryPercentageRemaining',
    minInterval: 3600, maxInterval: 43200, minChange: 2 // 1%
  },
  'measure_power': {
    cluster: 'haElectricalMeasurement',
    attr: 'activePower',
    minInterval: 10, maxInterval: 300, minChange: 5 // 5W
  },
  'measure_voltage': {
    cluster: 'haElectricalMeasurement',
    attr: 'rmsVoltage',
    minInterval: 30, maxInterval: 600, minChange: 1
  },
  'measure_current': {
    cluster: 'haElectricalMeasurement',
    attr: 'rmsCurrent',
    minInterval: 30, maxInterval: 600, minChange: 10
  },
  'measure_luminance': {
    cluster: 'msIlluminanceMeasurement',
    attr: 'measuredValue',
    minInterval: 30, maxInterval: 600, minChange: 50
  },
  'measure_pressure': {
    cluster: 'msPressureMeasurement',
    attr: 'measuredValue',
    minInterval: 60, maxInterval: 600, minChange: 1
  },
  'alarm_contact': {
    cluster: 'ssIasZone',
    attr: 'zoneStatus',
    minInterval: 0, maxInterval: 3600, minChange: 1
  },
  'alarm_motion': {
    cluster: 'ssIasZone',
    attr: 'zoneStatus',
    minInterval: 0, maxInterval: 3600, minChange: 1
  },
};

function loadCompose(driverDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(driverDir, 'driver.compose.json'), 'utf8'));
  } catch { return null; }
}

function findInitMethod(code) {
  // Find the init method: onNodeInit or onMeshInit
  const match = code.match(/async\s+(onNodeInit|onMeshInit)\s*\([^)]*\)\s*\{/);
  if (match) return { method: match[1], index: match.index + match[0].length };
  return null;
}

function buildReportingBlock(capabilities) {
  const configs = [];
  for (const cap of capabilities) {
    const mapping = REPORTING_MAP[cap.split('.')[0]]; // Handle sub-capabilities
    if (!mapping) continue;
    // Avoid duplicates (same cluster+attr)
    if (configs.find(c => c.cluster === mapping.cluster && c.attributeName === mapping.attr)) continue;
    configs.push({
      cluster: mapping.cluster,
      attributeName: mapping.attr,
      minInterval: mapping.minInterval,
      maxInterval: mapping.maxInterval,
      minChange: mapping.minChange,
    });
  }
  if (!configs.length) return null;

  let block = `\n    // --- Attribute Reporting Configuration (auto-generated) ---\n`;
  block += `    try {\n`;
  block += `      await this.configureAttributeReporting([\n`;
  for (let i = 0; i < configs.length; i++) {
    const c = configs[i];
    block += `        {\n`;
    block += `          cluster: '${c.cluster}',\n`;
    block += `          attributeName: '${c.attributeName}',\n`;
    block += `          minInterval: ${c.minInterval},\n`;
    block += `          maxInterval: ${c.maxInterval},\n`;
    block += `          minChange: ${c.minChange},\n`;
    block += `        }${i < configs.length - 1 ? ' ,' : ''}\n`      ;
  }
  block += `      ]);\n`;
  block += `      this.log('Attribute reporting configured successfully');\n`;
  block += `    } catch (err) {\n`;
  block += `      this.log('Attribute reporting config failed (device may not support it):', err.message);\n`;
  block += `    }\n`;
  return block;
}

function syntaxCheck(code) {
  const tmpFile = path.join(require('os').tmpdir(), 'attr-report-check-' + Date.now() + '.js');
  try {
    fs.writeFileSync(tmpFile, code);
    require('child_process').execSync(`node -c "${tmpFile}"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

function main() {
  console.log('=== Attribute Reporting Injector ===');
  console.log(`Mode: ${DRY ? 'DRY RUN' : 'LIVE'}`)      ;

  let scanned = 0, injected = 0, skipped = 0, errors = 0;

  for (const d of fs.readdirSync(DDIR)) {
    const driverDir = path.join(DDIR, d);
    const devFile = path.join(driverDir, 'device.js');
    if (!fs.existsSync(devFile)) continue;

    const compose = loadCompose(driverDir);
    if (!compose) continue;

    // Skip WiFi-only and non-Zigbee drivers
    if (!compose.zigbee || !compose.zigbee.manufacturerName?.length) continue       ;

    const caps = compose.capabilities || [];
    const sensorCaps = caps.filter(c => REPORTING_MAP[c.split('.')[0]]);
    if (!sensorCaps.length) continue;

    let code = fs.readFileSync(devFile, 'utf8');

    // Skip if already has reporting
    if (/configureAttributeReporting/.test(code)) continue;

    // Skip EF00-only drivers (Tuya DP  reporting doesn't apply)
    if (/CLUSTERS.TUYA_EF00|CLUSTERS.TUYA_EF00/.test(code) && !/genOnOff|msTemperature|genPowerCfg/.test(code)) continue;

    scanned++;

    const init = findInitMethod(code);
    if (!init) {
      skipped++;
      continue;
    }

    const block = buildReportingBlock(sensorCaps);
    if (!block ) { skipped++; continue; }

    // Inject after the init method opening brace
    const newCode = code.substring(0, init.index) + block + code.substring(init.index);

    if (!syntaxCheck(newCode)) {
      console.log(`   ${d}: syntax check failed after injection  SKIPPING`);
      errors++;
      continue;
    }

    if (DRY) {
      console.log(`   ${d}: would inject ${sensorCaps.length} reporting config(s)`);
    } else {
      fs.writeFileSync(devFile, newCode);
      console.log(`   ${d}: injected ${sensorCaps.length} reporting config(s)`);
    }
    injected++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Scanned: ${scanned}`);
  console.log(`Injected: ${injected}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main();
