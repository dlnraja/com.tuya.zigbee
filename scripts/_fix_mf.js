const fs = require('fs'), path = require('path');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

const WIFI_ID = (id) => {
  const s = (id||'').toLowerCase();
  return s.startsWith('wifi_') || s.includes('ewelink') || s.includes('sonoff') || s.includes('radiator_wifi');
};

function classify(d) {
  const conn = d.connectivity || [];
  const hasZ = !!d.zigbee;
  const isLan = conn.some(c => ['lan','cloud'].includes(c));
  if (hasZ && isLan) return 'hybrid';
  if (hasZ) return 'zigbee';
  if (WIFI_ID(d.id)) return 'wifi';
  if (!conn.length && !hasZ) return 'virtual';
  return 'wifi';
}

function hasMF(d) {
  return d.zigbee && Array.isArray(d.zigbee.manufacturerName) && d.zigbee.manufacturerName.length > 0;
}

let fixed = 0, skipped = 0, total = 0;
const stillBroken = [];

for (const d of (app.drivers || [])) {
  const type = classify(d);
  if (type !== 'zigbee' && type !== 'hybrid') continue;
  if (hasMF(d)) continue; // already OK
  total++;

  const did = d.id;

  // Strategy 1: use driver.compose.json
  const cp = path.join('drivers', did, 'driver.compose.json');
  if (fs.existsSync(cp)) {
    try {
      const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
      if (c.zigbee && Array.isArray(c.zigbee.manufacturerName) && c.zigbee.manufacturerName.length > 0) {
        const mfs = [...new Set(c.zigbee.manufacturerName.map(m => m.trim()).filter(Boolean))];
        if (!d.zigbee) d.zigbee = {};
        d.zigbee.manufacturerName = mfs;
        console.log('FIXED[compose] ' + did + ' -> ' + mfs.length + ' MFs: ' + mfs.slice(0,2).join(','));
        fixed++;
        continue;
      }
    } catch(e) {}
  }

  // Strategy 2: if manufacturerName is a string, wrap it as array
  if (d.zigbee && typeof d.zigbee.manufacturerName === 'string' && d.zigbee.manufacturerName.trim()) {
    const mfStr = d.zigbee.manufacturerName.trim();
    // Skip obvious placeholders
    if (!mfStr.startsWith('_unmatched') && !mfStr.startsWith('_placeholder') && mfStr.length > 3) {
      d.zigbee.manufacturerName = [mfStr];
      console.log('FIXED[wrap-str] ' + did + ' -> ["' + mfStr + '"]');
      fixed++;
      continue;
    }
  }

  // Strategy 3: extract from fingerprints in driver.compose.json
  if (fs.existsSync(cp)) {
    try {
      const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
      const fps = c.zigbee && c.zigbee.fingerprints;
      if (Array.isArray(fps) && fps.length > 0) {
        const mfs = [...new Set(fps.flatMap(fp => {
          const mn = fp.manufacturerName;
          if (!mn) return [];
          if (Array.isArray(mn)) return mn;
          if (typeof mn === 'string') return [mn];
          return [];
        }).filter(m => m && !m.startsWith('_unmatched') && m.length > 2))];
        if (mfs.length > 0) {
          if (!d.zigbee) d.zigbee = {};
          d.zigbee.manufacturerName = mfs;
          console.log('FIXED[fps-mf] ' + did + ' -> ' + mfs.length + ' MFs');
          fixed++;
          continue;
        }
      }
    } catch(e) {}
  }

  stillBroken.push(did);
  skipped++;
  console.log('SKIP (no source) ' + did);
}

console.log('\n=== RESULT ===');
console.log('Total needing fix:', total);
console.log('Fixed:', fixed);
console.log('Still broken:', skipped);
if (stillBroken.length) console.log('Broken IDs:', stillBroken.join(', '));

// Save compacted
fs.writeFileSync('app.json', JSON.stringify(app));
const sz = (fs.statSync('app.json').size / 1024 / 1024).toFixed(2);
console.log('\napp.json saved: ' + sz + 'MB (compacted)');
