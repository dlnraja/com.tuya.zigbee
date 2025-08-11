'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRV = path.join(ROOT, 'drivers');

function j(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function w(p, o) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); }

function slug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
}

function A(v) { return Array.isArray(v) ? v : (v ? [v] : []); }

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
  if (hasCap(o, 'button')) return 'remote';
  if (hasCap(o, 'scene')) return 'scene';
  if (hasCap(o, 'valve')) return 'valve';
  return 'other';
}

function domainOf(obj) {
  const z = obj.zigbee || {};
  const vn = String((A(z.manufacturerName)[0]) || obj.manufacturerName || '').toLowerCase();
  
  // Règle de domaine: "tuya" si manufacturer contient "tuya" ou commence par _tz/_ty, sinon "zigbee"
  if (/tuya|^_tz|^_ty/.test(vn)) return 'tuya';
  return 'zigbee';
}

function vendorOf(obj) {
  const z = obj.zigbee || {};
  const vn = String((A(z.manufacturerName)[0]) || obj.manufacturerName || '').toLowerCase();
  
  if (/tuya|^_tz|^_ty/.test(vn)) return 'tuya';
  if (/aqara|lumi/.test(vn)) return 'aqara';
  if (/ikea|tradfri/.test(vn)) return 'ikea';
  if (/philips|signify|hue/.test(vn)) return 'philips';
  if (/sonoff|itead/.test(vn)) return 'sonoff';
  if (/ledvance|osram/.test(vn)) return 'ledvance';
  if (/xiaomi|mi/.test(vn)) return 'xiaomi';
  if (/samsung|smartthings/.test(vn)) return 'samsung';
  if (/amazon|echo/.test(vn)) return 'amazon';
  if (/google|nest/.test(vn)) return 'google';
  if (/apple|homekit/.test(vn)) return 'apple';
  if (/generic|unknown/.test(vn)) return 'generic';
  
  return vn || 'generic';
}

function modelOf(obj, dir) {
  const z = obj.zigbee || {};
  const model = String((A(z.modelId)[0]) || obj.modelId || obj.productId || path.basename(dir)).replace(/^0x/i, '');
  return slug(model);
}

function ensureFiles(dir, id, obj) {
  const comp = path.join(dir, 'driver.compose.json');
  const dev = path.join(dir, 'device.js');
  const assets = path.join(dir, 'assets');
  const icon = path.join(assets, 'icon.svg');
  
  if (!fs.existsSync(comp)) {
    const baseObj = {
      id: id,
      name: { en: id, fr: id },
      capabilities: obj?.capabilities || [],
      zigbee: obj?.zigbee || {}
    };
    w(comp, baseObj);
  }
  
  if (!fs.existsSync(dev)) {
    const deviceCode = `'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class Device extends ZigBeeDevice {
  async onNodeInit() {
    this.log('Device initialized');
    // Add your device logic here
  }
}

module.exports = Device;`;
    fs.writeFileSync(dev, deviceCode);
  }
  
  if (!fs.existsSync(assets)) fs.mkdirSync(assets, { recursive: true });
  
  if (!fs.existsSync(icon)) {
    const hex = '#00AAFF';
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<rect x="24" y="24" width="208" height="208" rx="32" fill="#f6f8fa" stroke="${hex}" stroke-width="8"/>
<path d="M72 96h112v64H72z" fill="none" stroke="${hex}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="96" cy="128" r="10" fill="${hex}"/>
<circle cx="160" cy="128" r="10" fill="${hex}"/>
</svg>`;
    fs.writeFileSync(icon, svg, 'utf8');
  }
}

function flattenVariants(root) {
  const st = [root];
  let merged = 0;
  
  while (st.length) {
    const cur = st.pop();
    let s;
    try { s = fs.statSync(cur); } catch { continue; }
    
    if (s.isDirectory()) {
      const es = fs.readdirSync(cur, { withFileTypes: true });
      
      for (const e of es) {
        const p = path.join(cur, e.name);
        
        if (e.isDirectory()) {
          if (e.name === 'variants') {
            const parent = cur;
            const parentCompose = ['driver.compose.json', 'driver.json'].map(n => path.join(parent, n)).find(x => fs.existsSync(x));
            
            let base = parentCompose ? j(parentCompose) : {
              id: slug(path.basename(parent)),
              name: { en: path.basename(parent), fr: path.basename(parent) },
              capabilities: [],
              zigbee: {}
            };
            
            if (typeof base.name === 'string') base.name = { en: base.name, fr: base.name };
            
            const varDirs = fs.readdirSync(p, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => path.join(p, x.name));
            
            for (const vd of varDirs) {
              const comp = ['driver.compose.json', 'driver.json'].map(n => path.join(vd, n)).find(x => fs.existsSync(x));
              if (!comp) continue;
              
              const add = j(comp) || {};
              
              base.capabilities = [...new Set([...(base.capabilities || []), ...A(add.capabilities)])];
              base.zigbee = base.zigbee || {};
              const bz = base.zigbee, az = add.zigbee || {};
              
              bz.manufacturerName = [...new Set([...(A(bz.manufacturerName)), ...(A(az.manufacturerName || add.manufacturerName))].filter(Boolean))];
              bz.modelId = [...new Set([...(A(bz.modelId)), ...(A(az.modelId || add.modelId || add.productId))].filter(Boolean))];
              
              merged++;
            }
            
            w(parentCompose || path.join(parent, 'driver.compose.json'), base);
            
            try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
          } else {
            st.push(p);
          }
        }
      }
    }
  }
  
  if (merged) console.log(`[reorg] flattened variants: ${merged}`);
}

function reorganizeDrivers() {
  if (!fs.existsSync(DRV)) {
    console.log('[reorg] drivers/ not found');
    return;
  }
  
  // 1. Aplatir les variants
  flattenVariants(DRV);
  
  // 2. Inventorier tous les drivers existants AVANT réorganisation
  const allDirs = [];
  const walk = [DRV];
  
  while (walk.length) {
    const d = walk.pop();
    let st;
    try { st = fs.statSync(d); } catch { continue; }
    
    if (st.isDirectory()) {
      const es = fs.readdirSync(d, { withFileTypes: true });
      const hasCompose = es.some(e => /^driver(\.compose)?\.json$/i.test(e.name));
      
      if (hasCompose && d !== DRV) {
        allDirs.push(d);
      }
      
      for (const e of es) {
        if (e.isDirectory()) {
          walk.push(path.join(d, e.name));
        }
      }
    }
  }
  
  console.log(`[reorg] Found ${allDirs.length} drivers to reorganize`);
  
  const moves = [], merges = [];
  const seen = new Map();
  
  // 3. Traiter chaque driver individuellement
  for (const dir of allDirs) {
    // Vérifier que le dossier existe encore (pas encore traité)
    if (!fs.existsSync(dir)) continue;
    
    const comp = ['driver.compose.json', 'driver.json'].map(n => path.join(dir, n)).find(p => fs.existsSync(p));
    if (!comp) continue;
    
    const obj = j(comp) || { id: slug(path.basename(dir)), capabilities: [], zigbee: {} };
    
    const domain = domainOf(obj);
    const category = cat(obj);
    const vendor = vendorOf(obj);
    const model = modelOf(obj, dir);
    
    const newDir = path.join(DRV, domain, category, vendor, model);
    const newId = slug(`${category}-${vendor}-${model}`);
    
    console.log(`[reorg] ${path.basename(dir)} → ${domain}/${category}/${vendor}/${model}`);
    
    // Fusion si dossier cible existe déjà
    if (fs.existsSync(newDir) && path.resolve(newDir) !== path.resolve(dir)) {
      const tComp = ['driver.compose.json', 'driver.json'].map(n => path.join(newDir, n)).find(p => fs.existsSync(p));
      let base = tComp ? j(tComp) : null;
      
      if (!base) {
        base = { id: newId, name: { en: newId, fr: newId }, capabilities: [], zigbee: {} };
      } else if (typeof base.name === 'string') {
        base.name = { en: base.name, fr: base.name };
      }
      
      base.capabilities = [...new Set([...(A(base.capabilities)), ...(A(obj.capabilities))])];
      base.zigbee = base.zigbee || {};
      const bz = base.zigbee, az = obj.zigbee || {};
      
      bz.manufacturerName = [...new Set([...(A(bz.manufacturerName)), ...(A(az.manufacturerName || obj.manufacturerName))].filter(Boolean))];
      bz.modelId = [...new Set([...(A(bz.modelId)), ...(A(az.modelId || obj.modelId || obj.productId))].filter(Boolean))];
      
      w(tComp || path.join(newDir, 'driver.compose.json'), base);
      
      // Copier assets puis supprimer source
      try {
        const srcA = path.join(dir, 'assets'), dstA = path.join(newDir, 'assets');
        if (fs.existsSync(srcA)) {
          fs.mkdirSync(dstA, { recursive: true });
          for (const f of fs.readdirSync(srcA)) {
            fs.copyFileSync(path.join(srcA, f), path.join(dstA, f));
          }
        }
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {}
      
      merges.push({ from: path.relative(DRV, dir), to: path.relative(DRV, newDir) });
      continue;
    }
    
    // Sinon déplacer/créer
    if (path.resolve(dir) !== path.resolve(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
      
      for (const f of fs.readdirSync(dir)) {
        fs.renameSync(path.join(dir, f), path.join(newDir, f));
      }
      
      try { fs.rmdirSync(dir); } catch {}
      moves.push({ from: path.relative(DRV, dir), to: path.relative(DRV, newDir) });
    }
    
    ensureFiles(newDir, newId, obj);
  }
  
  // 4. Nettoyer les dossiers vides
  try {
    const clean = [DRV];
    while (clean.length) {
      const d = clean.pop();
      if (!fs.existsSync(d)) continue;
      
      let es;
      try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
      
      for (const e of es) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) {
          try {
            if (fs.existsSync(p) && !fs.readdirSync(p).length) {
              fs.rmdirSync(p);
            }
          } catch {}
          clean.push(p);
        }
      }
    }
  } catch {}
  
  // 5. Sauvegarder le rapport
  const MAP = path.join(ROOT, 'drivers-reorganize-report.json');
  w(MAP, { moves, merges, structure: 'drivers/<domain>/<category>/<vendor>/<model>' });
  
  console.log(`[reorg] Complete! Moves: ${moves.length}, Merges: ${merges.length}`);
  console.log(`[reorg] Structure: drivers/<domain>/<category>/<vendor>/<model>`);
  
  // 6. Afficher la structure finale
  if (fs.existsSync(DRV)) {
    const domainDirs = fs.readdirSync(DRV, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    
    console.log(`[reorg] Final structure:`);
    for (const domain of domainDirs) {
      const domainPath = path.join(DRV, domain);
      if (!fs.existsSync(domainPath)) continue;
      
      const categoryDirs = fs.readdirSync(domainPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      
      for (const category of categoryDirs) {
        const categoryPath = path.join(domainPath, category);
        if (!fs.existsSync(categoryPath)) continue;
        
        const vendorDirs = fs.readdirSync(categoryPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);
        
        for (const vendor of vendorDirs) {
          const vendorPath = path.join(categoryPath, vendor);
          if (!fs.existsSync(vendorPath)) continue;
          
          const modelDirs = fs.readdirSync(vendorPath, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);
          
          console.log(`  ${domain}/${category}/${vendor}/${modelDirs.join(', ')}`);
        }
      }
    }
  }
}

reorganizeDrivers();
