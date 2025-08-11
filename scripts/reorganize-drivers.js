'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRV = path.join(ROOT, 'drivers');
const MAP = path.join(ROOT, 'drivers-rename-map.json');

function j(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function w(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); }

function slug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
}

function hasCap(o, c) { return Array.isArray(o?.capabilities) && o.capabilities.includes(c); }

function cat(o) {
  if (hasCap(o, 'windowcoverings_set')) return 'cover';
  if (hasCap(o, 'locked')) return 'lock';
  if (hasCap(o, 'alarm_siren')) return 'siren';
  if (hasCap(o, 'target_temperature') || hasCap(o, 'measure_temperature')) return 'climate-thermostat';
  if (hasCap(o, 'onoff') && hasCap(o, 'dim')) return 'light';
  if (hasCap(o, 'onoff') && !hasCap(o, 'dim')) return 'plug';
  if (hasCap(o, 'alarm_motion')) return 'sensor-motion';
  if (hasCap(o, 'alarm_contact')) return 'sensor-contact';
  if (hasCap(o, 'measure_luminance')) return 'sensor-lux';
  if (hasCap(o, 'measure_humidity')) return 'sensor-humidity';
  if (hasCap(o, 'alarm_smoke')) return 'sensor-smoke';
  if (hasCap(o, 'alarm_water')) return 'sensor-leak';
  if (hasCap(o, 'measure_power') || hasCap(o, 'meter_power')) return 'meter-power';
  if (hasCap(o, 'onoff')) return 'switch';
  return 'other';
}

function first(a) { return Array.isArray(a) && a.length ? a[0] : a; }

function ensure(dir, id, obj) {
  const comp = path.join(dir, 'driver.compose.json');
  const dev = path.join(dir, 'device.js');
  const assets = path.join(dir, 'assets');
  const icon = path.join(assets, 'icon.svg');
  
  if (!fs.existsSync(comp)) {
    fs.writeFileSync(comp, JSON.stringify({ id, name: { en: id, fr: id }, capabilities: [], zigbee: {} }, null, 2));
  }
  
  const o = j(comp) || obj || { id, name: { en: id, fr: id }, capabilities: [], zigbee: {} };
  if (typeof o.name === 'string') o.name = { en: o.name, fr: o.name };
  o.id = id;
  fs.writeFileSync(comp, JSON.stringify(o, null, 2));
  
  if (!fs.existsSync(dev)) {
    fs.writeFileSync(dev, `'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class Device extends ZigBeeDevice {
  async onNodeInit() {
    this.log('init');
  }
}

module.exports = Device;`);
  }
  
  if (!fs.existsSync(assets)) fs.mkdirSync(assets, { recursive: true });
  
  if (!fs.existsSync(icon)) {
    const hex = '#00AAFF';
    fs.writeFileSync(icon, `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<rect x="24" y="24" width="208" height="208" rx="32" fill="#f6f8fa" stroke="${hex}" stroke-width="8"/>
<path d="M72 96h112v64H72z" fill="none" stroke="${hex}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="96" cy="128" r="10" fill="${hex}"/>
<circle cx="160" cy="128" r="10" fill="${hex}"/>
</svg>`, 'utf8');
  }
}

(function() {
  if (!fs.existsSync(DRV)) {
    console.log('[reorg] drivers/ not found');
    return;
  }
  
  // Aplatir "variants" → fusion parent
  const stack = [DRV];
  while (stack.length) {
    const cur = stack.pop();
    let st;
    try { st = fs.statSync(cur); } catch { continue; }
    
    if (st.isDirectory()) {
      const es = fs.readdirSync(cur, { withFileTypes: true });
      for (const e of es) {
        const p = path.join(cur, e.name);
        if (e.isDirectory()) {
          if (e.name === 'variants') {
            const parent = cur;
            const compP = ['driver.compose.json', 'driver.json'].map(n => path.join(parent, n)).find(x => fs.existsSync(x));
            
            let base = compP ? j(compP) : {
              id: slug(path.basename(parent)),
              name: { en: path.basename(parent), fr: path.basename(parent) },
              capabilities: [],
              zigbee: {}
            };
            
            if (typeof base.name === 'string') base.name = { en: base.name, fr: base.name };
            
            const A = v => Array.isArray(v) ? v : (v ? [v] : []);
            for (const sub of fs.readdirSync(p, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => path.join(p, x.name))) {
              const comp = ['driver.compose.json', 'driver.json'].map(n => path.join(sub, n)).find(x => fs.existsSync(x));
              if (!comp) continue;
              
              const add = j(comp) || {};
              base.capabilities = [...new Set([...(base.capabilities || []), ...(add.capabilities || [])])];
              base.zigbee = base.zigbee || {};
              const bz = base.zigbee, az = add.zigbee || {};
              
              bz.manufacturerName = [...new Set([...(A(bz.manufacturerName)), ...(A(az.manufacturerName || add.manufacturerName))].filter(Boolean))];
              bz.modelId = [...new Set([...(A(bz.modelId)), ...(A(az.modelId || add.modelId || add.productId))].filter(Boolean))];
            }
            
            fs.writeFileSync(compP || path.join(parent, 'driver.compose.json'), JSON.stringify(base, null, 2));
            try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
          } else {
            stack.push(p);
          }
        }
      }
    }
  }

  // Renommer drivers = category-vendor-model, fusion doublons
  const renameMap = { moves: [], merges: [] };
  const seen = new Map();
  
  for (const dir of fs.readdirSync(DRV, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(DRV, d.name))) {
    const comp = ['driver.compose.json', 'driver.json'].map(n => path.join(dir, n)).find(p => fs.existsSync(p));
    const obj = comp ? j(comp) : { id: slug(path.basename(dir)), capabilities: [], zigbee: {} };
    
    const z = obj.zigbee || {};
    const vn = String((Array.isArray(z.manufacturerName) ? z.manufacturerName[0] : z.manufacturerName) || obj.manufacturerName || '').toLowerCase();
    
    const vendor = /tuya|^_tz|^_ty/.test(vn) ? 'tuya' : /aqara|lumi/.test(vn) ? 'aqara' : /ikea|tradfri/.test(vn) ? 'ikea'
                 : /philips|signify|hue/.test(vn) ? 'philips' : /sonoff|itead/.test(vn) ? 'sonoff'
                 : /ledvance|osram/.test(vn) ? 'ledvance' : (vn || 'generic');
    
    const model = String((Array.isArray(z.modelId) ? z.modelId[0] : z.modelId) || obj.modelId || obj.productId || path.basename(dir)).replace(/^0x/i, '');
    const newId = slug(`${cat(obj)}-${vendor}-${model}`.replace(/--+/g, '-'));
    const newDir = path.join(DRV, newId);

    if (seen.has(newId) || (fs.existsSync(newDir) && path.resolve(newDir) !== path.resolve(dir))) {
      const targetDir = seen.get(newId) || newDir;
      const compT = ['driver.compose.json', 'driver.json'].map(n => path.join(targetDir, n)).find(p => fs.existsSync(p));
      
      const A = v => Array.isArray(v) ? v : (v ? [v] : []);
      let base = compT ? j(compT) : { id: newId, name: { en: newId, fr: newId }, capabilities: [], zigbee: {} };
      
      if (typeof base.name === 'string') base.name = { en: base.name, fr: base.name };
      
      base.capabilities = [...new Set([...(A(base.capabilities)), ...(A(obj.capabilities))])];
      base.zigbee = base.zigbee || {};
      const bz = base.zigbee, az = z;
      
      bz.manufacturerName = [...new Set([...(A(bz.manufacturerName)), ...(A(az.manufacturerName || obj.manufacturerName))].filter(Boolean))];
      bz.modelId = [...new Set([...(A(bz.modelId)), ...(A(az.modelId || obj.modelId || obj.productId))].filter(Boolean))];
      
      fs.writeFileSync(compT || path.join(targetDir, 'driver.compose.json'), JSON.stringify(base, null, 2));
      
      try {
        const srcA = path.join(dir, 'assets'), dstA = path.join(targetDir, 'assets');
        if (fs.existsSync(srcA)) {
          fs.mkdirSync(dstA, { recursive: true });
          for (const f of fs.readdirSync(srcA)) {
            fs.copyFileSync(path.join(srcA, f), path.join(dstA, f));
          }
        }
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {}
      
      renameMap.merges.push({ from: path.basename(dir), to: path.basename(targetDir) });
      seen.set(newId, targetDir);
      continue;
    }

    if (path.basename(dir) !== newId) {
      fs.mkdirSync(newDir, { recursive: true });
      for (const f of fs.readdirSync(dir)) {
        fs.renameSync(path.join(dir, f), path.join(newDir, f));
      }
      try { fs.rmdirSync(dir); } catch {}
      renameMap.moves.push({ from: path.basename(dir), to: newId });
    }
    
    ensure(path.join(DRV, newId), newId, obj);
    seen.set(newId, path.join(DRV, newId));
  }
  
  w(MAP, renameMap);
  console.log(`[reorg] done: ${renameMap.moves.length} moved, ${renameMap.merges.length} merged`);
})();
