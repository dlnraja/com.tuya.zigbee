const fs = require('fs');
const path = require('path');

// === Configuration ===
const DDIR = path.join(__dirname, '..', '..', 'drivers');
const SDIR = path.join(__dirname, '..', '..', '.github', 'state');
const DRY_RUN = false;

// === Mapping Helpers ===
const PID_MAP = {
  'TS0601': 'climate_sensor', // Fallback for EF00 if unknown
  'TS0201': 'climate_sensor',
  'TS0202': 'motion_sensor',
  'TS0203': 'contact_sensor',
  'TS0001': 'switch_1gang',
  'TS0002': 'switch_2gang',
  'TS0003': 'switch_3gang',
  'TS0004': 'switch_4gang',
  'TS0011': 'wall_switch_1gang_1way',
  'TS0012': 'wall_switch_2gang_1way',
  'TS0013': 'wall_switch_3gang_1way',
  'TS110E': 'switch_dimmer_1gang',
  'TS0601_mmwave': 'motion_sensor_radar_mmwave',
  'TS0601_radar': 'motion_sensor_radar_mmwave',
};

// Driver selection by fingerprint keywords
function suggestDriverByFP(fp) {
  fp = fp.toLowerCase();
  if (fp.includes('temp') || fp.includes('humid')) return 'climate_sensor';
  if (fp.includes('radar') || fp.includes('presence')) return 'motion_sensor_radar_mmwave';
  if (fp.includes('smoke')) return 'smoke_detector';
  if (fp.includes('water') || fp.includes('leak')) return 'water_leak_sensor';
  if (fp.includes('pir') || fp.includes('motion')) return 'motion_sensor';
  if (fp.includes('contact') || fp.includes('door') || fp.includes('window')) return 'contact_sensor';
  if (fp.includes('valve') || fp.includes('trv')) return 'radiator_valve_zigbee';
  return null;
}

// === Library ===
function buildIndex() {
  const mfrIdx = new Map();
  const drivers = new Map();
  const dirs = fs.readdirSync(DDIR);
  for (const d of dirs) {
    const cf = path.join(DDIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(cf, 'utf8'));
      drivers.set(d, { path: cf, data });
      for (const m of (data.zigbee?.manufacturerName || [])) {
        if (!mfrIdx.has(m)) mfrIdx.set(m, []) ;
        mfrIdx.get(m).push(d);
      }
    } catch {}
  }
  return { mfrIdx, drivers };
}

function addFP(mfr, suggestedDriver, drivers, mfrIdx) {
  if (!mfr || !mfr.startsWith('_T')) return false;
  if (mfrIdx.has(mfr)) return false; // Already supported
  
  const drvName = suggestedDriver;
  if (!drvName || !drivers.has(drvName)) return false;
  
  const d = drivers.get(drvName);
  if (!d.data.zigbee) d.data.zigbee = {};
  if (!d.data.zigbee.manufacturerName) d.data.zigbee.manufacturerName = [];
  
  if (!d.data.zigbee.manufacturerName.includes(mfr)) {
    d.data.zigbee.manufacturerName.push(mfr);
    d.data.zigbee.manufacturerName.sort();
    if (!DRY_RUN) {
      fs.writeFileSync(d.path, JSON.stringify(d.data, null, 2) + '\n');
    }
    mfrIdx.set(mfr, [drvName]);
    console.log(`  [ADDED] ${mfr} -> ${drvName}`);
    return true;
  }
  return false;
}

// === Main ===
function main() {
  console.log('=== Mass FP Resolution Script ===');
  const { mfrIdx, drivers } = buildIndex();
  let totalAdded = 0;

  // 1. Process pr-issue-scan.json
  const prScanFile = path.join(SDIR, 'pr-issue-scan.json');
  if (fs.existsSync(prScanFile)) {
    console.log('Processing pr-issue-scan.json...' );
    try {
      const prData = JSON.parse(fs.readFileSync(prScanFile, 'utf8'));
      const newFPs = prData.newFPs || [];
      for (const item of newFPs) {
        const mfr = item.mfr || item.fp;
        const pid = item.pid;
        let drv = suggestDriverByFP(mfr) || PID_MAP[pid];
        if (item.title?.toLowerCase().includes('radar')) drv = 'motion_sensor_radar_mmwave'      ;
        if (item.title?.toLowerCase().includes('thermostat')) drv = 'climate_sensor'      ;
        
        if (drv && addFP(mfr, drv, drivers, mfrIdx)) totalAdded++;
      }
    } catch (e) { console.error('Error reading pr-scan:', e.message); }
  }

  // v7.0.22: Upstream processing (Silent Source Doctrine)
  const upstreamFile = path.join(SDIR, '_upstream_new_fps.json');
  if (fs.existsSync(upstreamFile)) {
    console.log('Processing Internal-Audit sync...');
    try {
      const upData = JSON.parse(fs.readFileSync(upstreamFile, 'utf8'));
      for (const item of upData) {
        const mfr = item.fp || item.mfr;
        // Search for driver in issue text or use defaults
        let drv = suggestDriverByFP(mfr);
        if (mfr.includes('_TZ3218_')) drv = 'motion_sensor_radar_mmwave';
        if (mfr.includes('_TZE200_') || mfr.includes('_TZE204_')) drv = 'climate_sensor'; // Most common
        
        if (drv && addFP(mfr, drv, drivers, mfrIdx)) totalAdded++;
      }
    } catch (e) { console.error('Error reading internal-sync:', e.message); }
  }

  // 3. Process _fork_new_fps.json
  const forkFile = path.join(SDIR, '_fork_new_fps.json');
  if (fs.existsSync(forkFile)) {
    console.log('Processing _fork_new_fps.json...');
    try {
      const forkData = JSON.parse(fs.readFileSync(forkFile, 'utf8'));
      const byDriver = forkData.byDriver || {};
      for (const [drv, arr] of Object.entries(byDriver)) {
        // Map driver names
        let target = drv;
        if (drv === 'switch_1_gang') target = 'switch_1gang';
        if (drv === 'switch_2_gang') target = 'switch_2gang';
        if (drv === 'switch_3_gang') target = 'switch_3gang';
        if (drv === 'switch_4_gang') target = 'switch_4gang';
        if (drv === 'doorwindowsensor') target = 'contact_sensor';
        if (drv === 'smoke_sensor') target = 'smoke_detector';
        
        if (drivers.has(target)) {
          for (const item of arr) {
            if (addFP(item.fp, target, drivers, mfrIdx)) totalAdded++;
          }
        }
      }
    } catch (e) { console.error('Error reading fork-new-fps:', e.message); }
  }

  console.log(`\n=== Done! Total Added: ${totalAdded} FPs ===`);
}

main();
