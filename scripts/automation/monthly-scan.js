/**
 * Monthly Automation Pipeline - Forum & PR Scanner
 * Run: node scripts/automation/monthly-scan.js
 * 
 * Scans:
 * - Homey Forum messages
 * - GitHub PRs/Issues from Johan and dlnraja forks
 * - Existing YAML/JS for patterns
 * 
 * Outputs:
 * - Monthly report (docs/MONTHLY_REPORT.md)
 * - Device suggestions (data/pending-devices.json)
 * - Collision warnings
 */
const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '../../docs/MONTHLY_REPORT.md');
const PENDING_PATH = path.join(__dirname, '../../data/pending-devices.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// Patterns to detect in forum messages
const PATTERNS = {
  manufacturerName: /_T[ZS][A-Z0-9]{1,4}_[a-zA-Z0-9]+/gi,
  modelId: /TS[0-9]{4}[A-Z]?/gi,
  issues: {
    time_sync: /time\s*(sync|not\s*syncing|lcd|clock|date)/gi,
    button_toggle: /(button|toggle|switch|on\s*off|stateless)/gi,
    flow_error: /could\s*not\s*get\s*device|flow\s*card|error/gi,
    battery: /battery|measure_battery|power/gi,
    unavailable: /unavailable|not\s*responding|offline/gi
  }
};

// Known device classes for auto-classification
const DEVICE_CLASSES = {
  sensor: ['climate', 'temp', 'humidity', 'motion', 'presence', 'contact', 'water', 'smoke', 'gas'],
  button: ['button', 'remote', 'controller', 'wireless', 'scene'],
  switch: ['switch', 'relay', 'breaker', 'gang'],
  plug: ['plug', 'socket', 'outlet', 'usb'],
  light: ['light', 'dimmer', 'bulb', 'led', 'rgb'],
  climate: ['thermostat', 'radiator', 'valve', 'hvac', 'ac']
};

/**
 * Scan all existing drivers for patterns and collisions
 */
function scanExistingDrivers() {
  const drivers = {};
  const allMfrs = new Map();
  
  fs.readdirSync(DRIVERS_DIR).forEach(driverName => {
    const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;
    
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = data.zigbee?.manufacturerName || [];
      const pids = data.zigbee?.productId || [];
      const caps = data.capabilities || [];
      
      drivers[driverName] = { mfrs: mfrs.length, pids, caps };
      
      mfrs.forEach(mfr => {
        pids.forEach(pid => {
          const key = `${mfr}|${pid}`;
          if (!allMfrs.has(key)) allMfrs.set(key, []);
          allMfrs.get(key).push(driverName);
        });
      });
    } catch (e) {}
  });
  
  // Detect collisions
  const collisions = [];
  allMfrs.forEach((driverList, key) => {
    const unique = [...new Set(driverList)];
    if (unique.length > 1) {
      collisions.push({ key, drivers: unique });
    }
  });
  
  return { drivers, collisions, totalMfrs: allMfrs.size };
}

/**
 * v5.7.48: Infer specific driver from manufacturerName + productId
 * Used for automatic driver mapping when adding new fingerprints
 */
function inferDeviceType(mfr, pid) {
  const m = (mfr || '').toLowerCase();
  const p = (pid || '').toUpperCase();
  
  // TS0601 Tuya DP devices - infer from manufacturerName patterns
  if (p === 'TS0601') {
    if (/temp|humid|climate|th0[0-9]|wsd/i.test(m)) return 'climate_sensor';
    if (/presence|radar|human|pir|mmwave|iadro|qasjif/i.test(m)) return 'presence_sensor_radar';
    if (/curtain|blind|cover|shade|motor/i.test(m)) return 'curtain_motor';
    if (/valve|trv|thermo|radiator|bvu/i.test(m)) return 'radiator_valve';
    if (/smoke|fire/i.test(m)) return 'smoke_detector_advanced';
    if (/water|leak|flood/i.test(m)) return 'water_leak_sensor';
    if (/door|contact|magnet|dw2/i.test(m)) return 'contact_sensor';
    if (/soil/i.test(m)) return 'soil_sensor';
    if (/air|co2|voc|pm25|aqi/i.test(m)) return 'air_quality_comprehensive';
    if (/gas/i.test(m)) return 'gas_sensor';
    if (/dimmer/i.test(m)) return 'dimmer_wall_1gang';
    if (/vibr/i.test(m)) return 'vibration_sensor';
    if (/ir.*blast|remote|universal/i.test(m)) return 'ir_blaster';
    return 'climate_sensor'; // Default for unknown TS0601
  }
  
  // Standard ZCL switches by productId
  if (p === 'TS0001') return 'switch_1gang';
  if (p === 'TS0002') return 'switch_2gang';
  if (p === 'TS0003') return 'switch_3gang';
  if (p === 'TS0004') return 'switch_4gang';
  if (p === 'TS0011') return 'switch_1gang';
  if (p === 'TS0012') return 'switch_2gang';
  if (p === 'TS0013') return 'switch_3gang';
  
  // Plugs/Sockets
  if (p === 'TS011F' || p === 'TS0121') return 'plug_smart';
  if (p === 'TS0112') return 'plug_smart';
  
  // Buttons/Remotes
  if (p === 'TS0041') return 'button_wireless_1';
  if (p === 'TS0042') return 'button_wireless_2';
  if (p === 'TS0043') return 'button_wireless_3';
  if (p === 'TS0044') return 'button_wireless_4';
  if (p === 'TS0046') return 'button_wireless_6';
  
  // Dimmers
  if (/TS02\d{2}/.test(p)) return 'dimmer_wall_1gang';
  if (p === 'TS0501A' || p === 'TS0501B') return 'dimmer_wall_1gang';
  if (p === 'TS0502A' || p === 'TS0502B') return 'dimmer_dual_channel';
  
  // Sensors
  if (p === 'TS0202') return 'motion_sensor';
  if (p === 'TS0203') return 'contact_sensor';
  if (p === 'TS0207') return 'water_leak_sensor';
  if (p === 'TS0210') return 'vibration_sensor';
  
  return 'unknown';
}

/**
 * Classify device based on manufacturerName and context
 */
function classifyDevice(mfr, context = '') {
  const combined = `${mfr} ${context}`.toLowerCase();
  
  for (const [className, keywords] of Object.entries(DEVICE_CLASSES)) {
    for (const kw of keywords) {
      if (combined.includes(kw)) return className;
    }
  }
  
  // Default classification based on prefix
  if (mfr.startsWith('_TZE')) return 'sensor'; // TS0601 usually sensors
  if (mfr.startsWith('_TZ3000')) return 'switch';
  
  return 'unknown';
}

// Export for use in other scripts
module.exports = { inferDeviceType, classifyDevice, scanExistingDrivers };

/**
 * Generate monthly report
 */
function generateReport() {
  const now = new Date();
  const monthYear = now.toISOString().slice(0, 7);
  
  console.log('🔍 Scanning existing drivers...');
  const { drivers, collisions, totalMfrs } = scanExistingDrivers();
  
  let report = `# Monthly Tuya Zigbee Report - ${monthYear}\n\n`;
  report += `*Generated: ${now.toISOString()}*\n\n`;
  
  // Summary
  report += `## 📊 Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Drivers | ${Object.keys(drivers).length} |\n`;
  report += `| Manufacturer IDs | ${totalMfrs} |\n`;
  report += `| Collisions | ${collisions.length} |\n`;
  report += `\n`;
  
  // Collisions
  if (collisions.length > 0) {
    report += `## ⚠️ Collisions Detected\n\n`;
    report += `| ID | Drivers |\n`;
    report += `|----|--------|\n`;
    collisions.slice(0, 20).forEach(c => {
      report += `| \`${c.key}\` | ${c.drivers.join(', ')} |\n`;
    });
    if (collisions.length > 20) {
      report += `\n*...and ${collisions.length - 20} more*\n`;
    }
    report += `\n`;
  }
  
  // Action items
  report += `## 📋 Action Items\n\n`;
  report += `- [ ] Review collision report\n`;
  report += `- [ ] Check forum for new device requests\n`;
  report += `- [ ] Analyze pending PRs from forks\n`;
  report += `- [ ] Update device matrix\n`;
  report += `\n`;
  
  // Footer
  report += `---\n`;
  report += `*Report generated by monthly-scan.js*\n`;
  
  // Write report
  fs.writeFileSync(REPORT_PATH, report);
  console.log(`✅ Report generated: ${REPORT_PATH}`);
  
  return { drivers, collisions };
}

// Run
console.log('🚀 Monthly Automation Pipeline Starting...\n');
const result = generateReport();
console.log(`\n📊 Found ${Object.keys(result.drivers).length} drivers`);
console.log(`⚠️ ${result.collisions.length} collisions detected`);
