const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🔎 DEEP_COMPARE_ENRICH_REFERENTIALS');

const root = path.resolve(__dirname, '..', '..');
const driversDir = path.join(root, 'drivers');
const refsDir = path.join(root, 'ultimate_system', 'referentials');
const paths = {
  driverRefsFull: path.join(refsDir, 'driver_references.json'),
  zigbeeTuya: path.join(refsDir, 'zigbee_tuya_protocols.json')
};

const Z2M_SUPPORTED = 'https://www.zigbee2mqtt.io/supported-devices/';
const BLAK_ALL = 'https://zigbee.blakadder.com/all.html';

const readJSON = (p, fb={}) => { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return fb; } };
const writeJSON = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2));

function fetch(url, to=12000){
  return new Promise((res)=>{
    const req = https.get(url, r=>{ if(r.statusCode!==200){r.resume();return res(null);} let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d)); });
    req.on('error',()=>res(null));
    req.setTimeout(to,()=>{try{req.destroy();}catch{} res(null);});
  });
}

function extractTS(html){ if(!html) return []; const rx = /TS\d{3,4}[A-Z]?/g; const s=new Set(); let m; while((m=rx.exec(html))!==null) s.add(m[0]); return [...s]; }
function tcase(s){ return s.replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
function inferCat(folder, cls){
  const f = folder.toLowerCase();
  // UNBRANDED taxonomy
  if (/(motion|pir|presence|radar|mmwave)/.test(f)) return 'motion_presence';
  if (/(contact|door|window|lock|siren|garage)/.test(f)) return 'contact_security';
  if (/(thermo|climate|temp|humidity|thermostat|radiator|valve)/.test(f)) return 'temperature_climate';
  if (/(light|bulb|switch|dimmer|rgb|led|spot|strip|ceiling)/.test(f)) return 'smart_lighting';
  if (/(plug|socket|outlet|meter|energy|power)/.test(f)) return 'power_energy';
  if (/(smoke|co\b|water|leak|gas|alarm)/.test(f)) return 'safety_detection';
  if (/(button|scene|remote|knob|controller)/.test(f)) return 'automation_control';
  return cls === 'light' ? 'smart_lighting' : 'misc';
}

// 1) Aggregate from drivers
const manufacturerMap = {};
const productIdsSeen = new Set();
const dirs = fs.readdirSync(driversDir).filter(d=>fs.existsSync(path.join(driversDir,d,'driver.compose.json')));
console.log(`📦 Drivers: ${dirs.length}`);
for(const d of dirs){
  try{
    const compose = JSON.parse(fs.readFileSync(path.join(driversDir,d,'driver.compose.json'),'utf8'));
    const cls = compose.class || 'device';
    const caps = Array.isArray(compose.capabilities)?compose.capabilities:[];
    const cat = inferCat(d, cls);
    const prodIds = (compose.zigbee&&compose.zigbee.productId)||[];
    prodIds.forEach(id=>productIdsSeen.add(String(id)));
    const eps = (compose.zigbee&&compose.zigbee.endpoints)||{};
    const clusters = new Set(); Object.values(eps).forEach(ep=> (ep?.clusters||[]).forEach(c=>clusters.add(Number(c))));
    const mfgs = (compose.zigbee&&compose.zigbee.manufacturerName)||[];
    mfgs.forEach(code=>{
      if(!manufacturerMap[code]) manufacturerMap[code] = { productName:tcase(d), manufacturerName:code, productId:[], clusterId:[], capabilities:[], category:cat, folderName:d, deviceType:cls };
      const e = manufacturerMap[code];
      prodIds.forEach(id=>{ if(!e.productId.includes(id)) e.productId.push(id); });
      caps.forEach(c=>{ if(!e.capabilities.includes(c)) e.capabilities.push(c); });
      [...clusters].forEach(c=>{ if(!e.clusterId.includes(c)) e.clusterId.push(c); });
    });
  }catch{}
}

// 2) Merge external product families
(async()=>{
  const zt = readJSON(paths.zigbeeTuya, { zigbee_specifications:{clusters:{},manufacturers:{}}, tuya_specifications:{product_families:{},chip_creators:[]} });
  console.log('🌐 Fetching external lists...');
  const [z2m, blak] = await Promise.all([fetch(Z2M_SUPPORTED), fetch(BLAK_ALL)]);
  const allIds = new Set([...extractTS(z2m), ...extractTS(blak), ...productIdsSeen]);
  let addedFamilies=0; const fam = zt.tuya_specifications.product_families || {};
  allIds.forEach(id=>{ if(!fam[id]){ fam[id]='Generic Tuya Device'; addedFamilies++; } });
  zt.tuya_specifications.product_families = fam;
  zt.zigbee_specifications.manufacturers = Object.assign({
    '_TZ3000_':'Tuya Generic Devices',
    '_TZ3210_':'Tuya Series 3210',
    '_TZ3400_':'Tuya Series 3400',
    '_TZ3040_':'Tuya Series 3040',
    '_TZ3500_':'Tuya Series 3500',
    '_TZ3600_':'Tuya Series 3600',
    '_TZE200_':'Tuya Advanced Devices',
    '_TZE204_':'Tuya Advanced Devices v2',
    '_TZE284_':'Tuya Enhanced Switches',
    '_TYZB01_':'Tuya OEM Devices',
    '_TYZB02_':'Tuya OEM Devices v2',
    '_TYZC01_':'Tuya OEM Devices v3',
    '_TYST11_':'Tuya OEM Variants'
  }, zt.zigbee_specifications.manufacturers||{});

  // 3) Merge into driver_references.json
  const refs = readJSON(paths.driverRefsFull, {});
  let newRefs=0, updRefs=0;
  Object.entries(manufacturerMap).forEach(([code,data])=>{
    if(!refs[code]){ refs[code]=data; newRefs++; }
    else{
      const cur=refs[code];
      cur.productName = cur.productName || data.productName;
      cur.manufacturerName = code;
      cur.category = cur.category || data.category;
      cur.folderName = cur.folderName || data.folderName;
      cur.deviceType = cur.deviceType || data.deviceType;
      cur.productId = Array.from(new Set([...(cur.productId||[]), ...(data.productId||[])]));
      cur.clusterId = Array.from(new Set([...(cur.clusterId||[]), ...(data.clusterId||[])]));
      cur.capabilities = Array.from(new Set([...(cur.capabilities||[]), ...(data.capabilities||[])]));
      updRefs++;
    }
  });

  writeJSON(paths.driverRefsFull, refs);
  writeJSON(paths.zigbeeTuya, zt);
  console.log(`✅ Referentials updated: driver_references (+${newRefs} new / ${updRefs} updated), product_families +${addedFamilies}`);
})();
