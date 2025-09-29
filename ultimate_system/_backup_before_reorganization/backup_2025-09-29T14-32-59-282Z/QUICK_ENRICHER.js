#!/usr/bin/env node
/**
 * QUICK_ENRICHER - Enrichissement rapide par catégorie
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const driversDir = path.join(root, 'drivers');

function safeJSON(p, fb = {}) { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return fb; } }
function safeWrite(p, d) { try { fs.writeFileSync(p,JSON.stringify(d,null,2)); return true; } catch { return false; } }

// Nouveaux manufacturers par catégorie
const NEW_MANUFACTURERS = {
  lighting: ['_TZ3210_k1msuvg6','_TZ3210_3mpwqzuu','_TZ3000_ktuoyvt5'],
  power: ['_TZ3000_1h2x4akh','_TZ3000_cfnprab5','_TZ3000_qeuvnohg'], 
  motion: ['_TZ3000_h4w2onij','_TZ3000_bsvqrxru','_TZ3000_o4mkahkc'],
  climate: ['_TZ3000_fllyghyj','_TZ3000_lbtpiody','_TZ3000_kqvb5akv'],
  safety: ['_TZ3000_pnzfdr9y','_TZ3000_jk7qyowj','_TZ3000_qzqps2n9']
};

function getCategory(name, data) {
  const n = name.toLowerCase();
  const caps = data.capabilities || [];
  if (/(switch|dimmer|light|bulb)/.test(n) || data.class === 'light') return 'lighting';
  if (/(plug|socket|energy|power)/.test(n) || caps.includes('measure_power')) return 'power';
  if (/(motion|pir|presence)/.test(n) || caps.includes('alarm_motion')) return 'motion';
  if (/(temp|climate|humidity)/.test(n) || caps.includes('measure_temperature')) return 'climate';
  if (/(smoke|gas|leak|detector)/.test(n) || caps.includes('alarm_smoke')) return 'safety';
  return 'lighting';
}

console.log('🚀 QUICK_ENRICHER - Démarrage');

const drivers = fs.readdirSync(driversDir).filter(d => 
  fs.existsSync(path.join(driversDir, d, 'driver.compose.json'))
);

let enriched = 0;

for (const driverName of drivers) {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  const data = safeJSON(composePath);
  
  if (!data.zigbee) data.zigbee = {};
  if (!Array.isArray(data.zigbee.manufacturerName)) {
    data.zigbee.manufacturerName = [];
  }
  
  const existing = new Set(data.zigbee.manufacturerName);
  const category = getCategory(driverName, data);
  const categoryMfgs = NEW_MANUFACTURERS[category] || NEW_MANUFACTURERS.lighting;
  
  const newMfgs = categoryMfgs.filter(m => !existing.has(m));
  
  if (newMfgs.length > 0) {
    data.zigbee.manufacturerName = data.zigbee.manufacturerName.concat(newMfgs);
    
    if (safeWrite(composePath, data)) {
      enriched++;
      console.log(`✅ ${driverName} (${category}): +${newMfgs.length}`);
    }
  }
}

console.log(`\n🎉 QUICK_ENRICHER TERMINÉ - ${enriched}/${drivers.length} drivers enrichis`);
