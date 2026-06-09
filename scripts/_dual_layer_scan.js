const fs = require('fs'), path = require('path');

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
  return d.zigbee &&
         Array.isArray(d.zigbee.manufacturerName) &&
         d.zigbee.manufacturerName.length > 0;
}

let app;
try { app = JSON.parse(fs.readFileSync('app.json')); }
catch(e) { console.error('ERROR:', e.message); process.exit(1); }

const drivers = app.drivers || [];
const stats = { total: drivers.length, zigbee:0, wifi:0, hybrid:0, virtual:0 };
const emptyMF = [], errors = [];

// SDK3 fields
['id','version','compatibility','sdk','name','description','category','permissions','images','author'].forEach(k => {
  if (!app[k]) errors.push('SDK3 champ manquant: ' + k);
});
if (app.sdk !== 3) errors.push('sdk doit etre 3, got ' + app.sdk);

// Driver checks
drivers.forEach(d => {
  const type = classify(d);
  stats[type] = (stats[type]||0) + 1;
  if (type === 'zigbee' || type === 'hybrid') {
    if (!hasMF(d)) {
      emptyMF.push({ id: d.id, type, mfVal: JSON.stringify(d.zigbee && d.zigbee.manufacturerName).substring(0,50) });
      errors.push('AGGREGATE_ERROR [' + type + ']: ' + d.id);
    }
  }
});

console.log('Stats:', JSON.stringify(stats));
console.log('SDK errors:', errors.filter(e=>e.startsWith('SDK3')));
console.log('AggregateErrors:', emptyMF.length);
emptyMF.slice(0,15).forEach(e=>console.log('  ['+e.type+'] '+e.id+' mf='+e.mfVal));
if(emptyMF.length>15) console.log('  ...and '+(emptyMF.length-15)+' more');
console.log('\nTotal errors to CI:', errors.length);
console.log('needsFix:', emptyMF.length > 0);
