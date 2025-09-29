#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const driversDir = path.join(root, 'drivers');

console.log('🚀 ULTRA_ENRICHMENT_V23 - Enrichissement massif');

// Mega sources par catégorie
const SOURCES = {
  switch: ['_TZ3000_qzjcsmar','_TZ3000_ji4araar','_TZ3000_wkr3jqmr','_TZ3000_jr2atpww','_TYZB01_dvakyzhd','_TZ3000_r0pmi2p3','_TZ3000_imaccztn','_TZ3000_okayvup0','_TZ3000_vit9k2nb','_TZ3210_dse8ogfy','_TZ3210_j4pdtz9v'],
  plug: ['_TZ3000_g5xawfcq','_TZ3000_cehuw1lw','_TZ3000_okaz9tjs','_TZ3000_typdpbpg','_TZ3000_plyvnuf5'],
  motion: ['_TZ3000_mmtwjmaq','_TYZB01_ef5xlc9q','_TZ3000_kmh5qpmb','_TZ3000_lf56vpxj','_TZ3000_msl6wxk9','_TZ3040_bb6xaihh'],
  climate: ['_TZE200_cwbvmsar','_TZE200_bjawzodf','_TZ3000_xr3htd96','_TZE200_a8sdabtg','_TZ3000_fllyghyj'],
  safety: ['_TZ3000_26fmupbb','_TZ3000_yojqa8xn','_TZ3000_ntcy3xu1','_TZE200_3towulqd','_TZ3000_8ybe88nf'],
  curtain: ['_TZE200_fctwhugx','_TZE200_cowvfni3','_TZ3000_vd43bbfq','_TZE200_xuzcvlku']
};

function inferCategory(name, data) {
  const n = name.toLowerCase();
  const caps = new Set(data.capabilities || []);
  if (/(motion|pir)/.test(n) || caps.has('alarm_motion')) return 'motion';
  if (/(plug|socket)/.test(n) || data.class === 'socket') return 'plug';
  if (/(temp|climate|humidity)/.test(n) || caps.has('measure_temperature')) return 'climate';
  if (/(smoke|co|gas|leak)/.test(n) || caps.has('alarm_smoke')) return 'safety';
  if (/(curtain|blind)/.test(n)) return 'curtain';
  return 'switch';
}

function safeJSON(p) { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return {}; } }
function safeWrite(p,d) { try { fs.writeFileSync(p,JSON.stringify(d,null,2)); return true; } catch { return false; } }

// Extraction historique rapide
function getHistoricalMfgs() {
  const hist = new Map();
  try {
    const commits = execSync('git rev-list --all --max-count=50', {cwd:root,encoding:'utf8'}).trim().split('\n');
    for (const hash of commits) {
      try {
        const files = execSync(`git ls-tree -r --name-only ${hash}`, {cwd:root,encoding:'utf8'}).split('\n');
        for (const f of files.filter(x => x.match(/^drivers\/[^\/]+\/driver\.compose\.json$/))) {
          try {
            const content = execSync(`git show ${hash}:${f}`, {cwd:root,encoding:'utf8'});
            const data = JSON.parse(content);
            const driver = f.split('/')[1];
            if (!hist.has(driver)) hist.set(driver, new Set());
            if (data.zigbee?.manufacturerName) {
              data.zigbee.manufacturerName.forEach(m => hist.get(driver).add(m));
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}
  console.log(`📜 Historical data: ${hist.size} drivers`);
  return hist;
}

// Enrichissement ultra
const historical = getHistoricalMfgs();
const drivers = fs.readdirSync(driversDir).filter(d => fs.existsSync(path.join(driversDir,d,'driver.compose.json')));
let enriched = 0;

for (const d of drivers) {
  const p = path.join(driversDir,d,'driver.compose.json');
  const data = safeJSON(p);
  if (!data.zigbee) data.zigbee = {};
  if (!Array.isArray(data.zigbee.manufacturerName)) data.zigbee.manufacturerName = [];
  
  const existing = new Set(data.zigbee.manufacturerName);
  const cat = inferCategory(d, data);
  const newMfgs = new Set();
  
  // Historique
  if (historical.has(d)) {
    historical.get(d).forEach(m => {
      if (!existing.has(m) && m.match(/^_T[YZ][EBZ0-9]{2,4}_[a-z0-9]+$/i)) newMfgs.add(m);
    });
  }
  
  // Catégorie
  (SOURCES[cat] || SOURCES.switch).forEach(m => {
    if (!existing.has(m)) newMfgs.add(m);
  });
  
  if (newMfgs.size > 0) {
    data.zigbee.manufacturerName = data.zigbee.manufacturerName.concat([...newMfgs]);
    if (safeWrite(p, data)) {
      enriched++;
      console.log(`✅ ${d} (${cat}): +${newMfgs.size}`);
    }
  }
}

console.log(`\n🎉 TERMINÉ: ${enriched}/${drivers.length} drivers enrichis`);
