#!/usr/bin/env node
/**
 * CATEGORY_AUDITOR - Suggest correct UNBRANDED categories for each driver
 * - Uses folder name, class, capabilities, productId, manufacturerName
 * - Leverages referentials/zigbee_tuya_protocols.json product_families
 * - Outputs: ultimate_system/reports/category_audit_report.json
 */
const fs = require('fs');
const path = require('path');

const ultimateRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(ultimateRoot, '..');
const driversDir = path.join(projectRoot, 'drivers');
const reportsDir = path.join(ultimateRoot, 'reports');
const refFile = path.join(ultimateRoot, 'referentials', 'zigbee_tuya_protocols.json');
fs.mkdirSync(reportsDir, { recursive: true });

const zt = (function(){ try { return JSON.parse(fs.readFileSync(refFile,'utf8')); } catch { return { tuya_specifications:{product_families:{} } }; } })();
const families = zt?.tuya_specifications?.product_families || {};

function inferCategoryByHeuristics(folder, cls, caps){
  const f = folder.toLowerCase();
  const c = new Set(caps||[]);
  if (/(motion|pir|presence|radar|mmwave)/.test(f) || c.has('alarm_motion')) return 'motion_presence';
  if (/(contact|door|window|lock|siren|garage)/.test(f) || c.has('alarm_contact') || c.has('lock')) return 'contact_security';
  if (/(thermo|climate|temp|humidity|thermostat|radiator|valve)/.test(f) || c.has('measure_temperature') || c.has('measure_humidity')) return 'temperature_climate';
  if (/(light|bulb|switch|dimmer|rgb|led|spot|strip|ceiling|wall_switch)/.test(f) || cls==='light') return 'smart_lighting';
  if (/(plug|socket|outlet|meter|energy|power)/.test(f) || cls==='socket' || c.has('meter_power') || c.has('measure_power')) return 'power_energy';
  if (/(smoke|co\b|water|leak|gas|alarm)/.test(f) || c.has('alarm_smoke') || c.has('alarm_co') || c.has('alarm_water')) return 'safety_detection';
  if (/(button|scene|remote|knob|controller)/.test(f) || Array.from(c).some(x=>x.startsWith('button.'))) return 'automation_control';
  return cls==='light' ? 'smart_lighting' : 'misc';
}

function inferCategoryByProductIds(pids){
  const set = new Set((pids||[]).map(String));
  // map common families to categories
  const map = [
    { ids: ['TS011F','TS0121'], cat: 'power_energy' },
    { ids: ['TS0001','TS0002','TS0003','TS0004','TS0011','TS0012','TS0013','TS0014','TS110E','TS110F','TS0601'], cat: 'smart_lighting' },
    { ids: ['TS0202','TS0203','TS0201'], cat: 'temperature_climate' },
    { ids: ['TS130F'], cat: 'smart_lighting' },
  ];
  for (const group of map){ if (group.ids.some(id=>set.has(id))) return group.cat; }
  // fallback via product_families text
  for (const id of set){
    const fam = families[id];
    if (!fam) continue;
    const f = fam.toLowerCase();
    if (f.includes('plug')) return 'power_energy';
    if (f.includes('switch')||f.includes('dimmer')||f.includes('gang')) return 'smart_lighting';
    if (f.includes('curtain')||f.includes('blind')) return 'smart_lighting';
    if (f.includes('thermostat')||f.includes('climate')||f.includes('temperature')||f.includes('humidity')) return 'temperature_climate';
    if (f.includes('smoke')||f.includes('co')||f.includes('leak')||f.includes('gas')) return 'safety_detection';
    if (f.includes('button')||f.includes('scene')) return 'automation_control';
  }
  return null;
}

const results = [];
const mismatches = [];
const dirs = fs.readdirSync(driversDir).filter(d=>fs.existsSync(path.join(driversDir,d,'driver.compose.json')));
for (const d of dirs){
  try{
    const p = path.join(driversDir,d,'driver.compose.json');
    const json = JSON.parse(fs.readFileSync(p,'utf8'));
    const cls = json.class || 'device';
    const caps = json.capabilities || [];
    const zig = json.zigbee || {}; 
    const pids = zig.productId || [];
    const hCat = inferCategoryByHeuristics(d, cls, caps);
    const idCat = inferCategoryByProductIds(pids);
    const suggested = idCat || hCat;
    const confidence = (idCat && hCat && idCat===hCat) ? 'high' : (idCat||hCat) ? 'medium' : 'low';
    results.push({ driver:d, class:cls, caps, productId:pids, manufacturerName:zig.manufacturerName||[], suggestedCategory:suggested||'misc', confidence });
    const currentGroup = hCat; // using folder heuristic as current
    if (suggested && currentGroup && suggested!==currentGroup){
      mismatches.push({ driver:d, current:currentGroup, suggested, productId:pids });
    }
  }catch{}
}

const report = { timestamp: new Date().toISOString(), total: results.length, mismatches, results };
fs.writeFileSync(path.join(reportsDir,'category_audit_report.json'), JSON.stringify(report,null,2));
console.log(`📊 Category audit done: ${results.length} drivers, mismatches: ${mismatches.length}`);
console.log(`📝 Report: ultimate_system/reports/category_audit_report.json`);
