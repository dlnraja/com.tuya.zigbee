'use strict';
/**
 * Réorganisation stricte:
 * - Domaine: TUYA si manufacturer contient "tuya" ou commence par _tz/_ty, sinon ZIGBEE.
 * - Arbo finale: drivers/<domain>/<category>/<vendor>/<model>/
 * - ID: <category>-<vendor>-<model>
 * - Aplati "variants" → fusion dans le parent
 */
const fs=require('fs'),path=require('path');
const classifyFallback = (o,dir)=>({
  domain: (/tuya|^_tz|^_ty/.test(String(o?.zigbee?.manufacturerName||o?.manufacturerName||'').toLowerCase())?'tuya':'zigbee'),
  category: 'switch', vendor: 'generic', model: path.basename(dir).toLowerCase()
});
let classify;
try { ({ classify } = require('./utils/classifier')); } catch (e) { classify = classifyFallback; }
const ROOT=process.cwd(),DRV=path.join(ROOT,'drivers');
function j(p){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(e){return null;}}
function w(p,o){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(o,null,2)+'\n');}
function slug(s){return String(s||'').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/-{2,}/g,'-').replace(/^-+|-+$/g,'');}
function A(v){return Array.isArray(v)?v:(v?[v]:[]);}
function hasCap(o,c){return Array.isArray(o?.capabilities)&&o.capabilities.includes(c);}
function cat(o){if(hasCap(o,'windowcoverings_set'))return'cover';if(hasCap(o,'locked'))return'lock';if(hasCap(o,'alarm_siren'))return'siren';
  if(hasCap(o,'target_temperature')||hasCap(o,'measure_temperature'))return'climate-thermostat';
  if(hasCap(o,'onoff')&&hasCap(o,'dim'))return'light'; if(hasCap(o,'onoff')&&!hasCap(o,'dim'))return'plug';
  if(hasCap(o,'alarm_motion'))return'sensor-motion'; if(hasCap(o,'alarm_contact'))return'sensor-contact';
  if(hasCap(o,'measure_luminance'))return'sensor-lux'; if(hasCap(o,'measure_humidity'))return'sensor-humidity';
  if(hasCap(o,'alarm_smoke'))return'sensor-smoke'; if(hasCap(o,'alarm_water'))return'sensor-leak';
  if(hasCap(o,'measure_power')||hasCap(o,'meter_power'))return'meter-power'; return'switch';}
function vendorOf(obj){
  const z=obj.zigbee||{}, vn=String((A(z.manufacturerName)[0])||obj.manufacturerName||'').toLowerCase();
  return /tuya|^_tz|^_ty/.test(vn)?'tuya' : /aqara|lumi/.test(vn)?'aqara' : /ikea|tradfri/.test(vn)?'ikea'
       : /philips|signify|hue/.test(vn)?'philips' : /sonoff|itead/.test(vn)?'sonoff'
       : /ledvance|osram/.test(vn)?'ledvance' : (vn||'generic');
}
function domainOf(obj){const z=obj.zigbee||{}, vn=String((A(z.manufacturerName)[0])||obj.manufacturerName||'').toLowerCase();return (/tuya|^_tz|^_ty/.test(vn)?'tuya':'zigbee');}
function modelOf(obj,dir){const z=obj.zigbee||{};return slug(String((A(z.modelId)[0])||obj.modelId||obj.productId||path.basename(dir)).replace(/^0x/i,''));}
function ensureFiles(dir,id,obj){
  const comp=path.join(dir,'driver.compose.json');const dev=path.join(dir,'device.js');const assets=path.join(dir,'assets');const icon=path.join(assets,'icon.svg');
  if(!fs.existsSync(comp))fs.writeFileSync(comp,JSON.stringify({id,name:{en:id,fr:id},capabilities:[],zigbee:{}},null,2));
  const o=j(comp)||obj||{id,name:{en:id,fr:id},capabilities:[],zigbee:{}};
  if(typeof o.name==='string')o.name={en:o.name,fr:o.name};
  o.id=id;w(comp,o);
  if(!fs.existsSync(dev))fs.writeFileSync(dev,`'use strict';\nconst { ZigBeeDevice } = require('homey-zigbeedriver');\nclass Device extends ZigBeeDevice{async onNodeInit(){this.log('init');}}\nmodule.exports = Device;\n`);
  if(!fs.existsSync(assets))fs.mkdirSync(assets,{recursive:true});
  if(!fs.existsSync(icon)){const hex='#00AAFF';fs.writeFileSync(icon,`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">\n<rect x="24" y="24" width="208" height="208" rx="32" fill="#f6f8fa" stroke="${hex}" stroke-width="8"/>\n<path d="M72 96h112v64H72z" fill="none" stroke="${hex}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>\n<circle cx="96" cy="128" r="10" fill="${hex}"/><circle cx="160" cy="128" r="10" fill="${hex}"/>\n</svg>`,'utf8');}
}
function flattenVariants(root){
  const st=[root];let merged=0;
  while(st.length){const cur=st.pop();let s;try{s=fs.statSync(cur);}catch(e){continue;}
    if(s.isDirectory()){
      const es=fs.readdirSync(cur,{withFileTypes:true});
      for(const e of es){
        const p=path.join(cur,e.name);
        if(e.isDirectory()){
          if(e.name==='variants'){
            const parent=cur,compP=['driver.compose.json','driver.json'].map(n=>path.join(parent,n)).find(x=>fs.existsSync(x));
            let base=compP?j(compP):{id:slug(path.basename(parent)),name:{en:path.basename(parent),fr:path.basename(parent)},capabilities:[],zigbee:{}};
            if(typeof base.name==='string') base.name={en:base.name,fr:base.name};
            for(const sub of fs.readdirSync(p,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>path.join(p,x.name))){
              const comp=['driver.compose.json','driver.json'].map(n=>path.join(sub,n)).find(x=>fs.existsSync(x)); if(!comp) continue;
              const add=j(comp)||{}; const A=v=>Array.isArray(v)?v:(v?[v]:[]);
              base.capabilities=[...new Set([...(base.capabilities||[]),...(add.capabilities||[])])];
              const bz=base.zigbee||{}; const az=add.zigbee||{}; base.zigbee=bz;
              bz.manufacturerName=[...new Set([...(A(bz.manufacturerName)),...(A(az.manufacturerName||add.manufacturerName))].filter(Boolean))];
              bz.modelId=[...new Set([...(A(bz.modelId)),...(A(az.modelId||add.modelId||add.productId))].filter(Boolean))];
              merged++;
            }
            w(compP||path.join(parent,'driver.compose.json'),base);
             try{fs.rmSync(p,{recursive:true,force:true});}catch(e){}
          } else { st.push(p); }
        }
      }
    }
  }
  if(merged) console.log(`[reorg] flattened variants: ${merged}`);
}
(function(){
  if(!fs.existsSync(DRV)){console.log('[reorg] drivers/ not found');return;}
  flattenVariants(DRV);

  const allDirs=[];
  const walk=[DRV];
  while(walk.length){
    const d=walk.pop(); let st; try{st=fs.statSync(d);}catch(e){continue;}
    if(st.isDirectory()){
      const es=fs.readdirSync(d,{withFileTypes:true});
      const hasCompose=es.some(e=>/^driver(\.compose)?\.json$/i.test(e.name));
      if(hasCompose) allDirs.push(d);
      for(const e of es){ if(e.isDirectory()) walk.push(path.join(d,e.name)); }
    }
  }

  const moves=[], merges=[];
  // Traiter d'abord les chemins les plus profonds pour éviter les conflits parent/enfant
  allDirs.sort((a,b)=> b.split(path.sep).length - a.split(path.sep).length);
  for(const dir of allDirs){
    if(!fs.existsSync(dir)) { continue; }
    const comp=['driver.compose.json','driver.json'].map(n=>path.join(dir,n)).find(p=>fs.existsSync(p));
    const obj=comp?j(comp):{id:slug(path.basename(dir)),capabilities:[],zigbee:{}};
    const g = (classify||classifyFallback)(obj, dir, ROOT);
    const domain=g.domain || domainOf(obj), vendor=g.vendor || vendorOf(obj), category=g.category || cat(obj), model=g.model || modelOf(obj,dir);
    const newDir=path.join(DRV,domain,category,vendor,model);
    const newId=slug(`${category}-${vendor}-${model}`);

    if(fs.existsSync(newDir) && path.resolve(newDir)!==path.resolve(dir)){
      const tComp=['driver.compose.json','driver.json'].map(n=>path.join(newDir,n)).find(p=>fs.existsSync(p));
      const base=tComp?j(tComp):{id:newId,name:{en:newId,fr:newId},capabilities:[],zigbee:{}};
      if(typeof base.name==='string') base.name={en:base.name,fr:base.name};
      const A=v=>Array.isArray(v)?v:(v?[v]:[]);
      base.capabilities=[...new Set([...(A(base.capabilities)),...(A(obj.capabilities))])];
      const bz=base.zigbee||{}, az=obj.zigbee||{}; base.zigbee=bz;
      bz.manufacturerName=[...new Set([...(A(bz.manufacturerName)),...(A(az.manufacturerName||obj.manufacturerName))].filter(Boolean))];
      bz.modelId=[...new Set([...(A(bz.modelId)),...(A(az.modelId||obj.modelId||obj.productId))].filter(Boolean))];
      w(tComp||path.join(newDir,'driver.compose.json'),base);
      try{
        const srcA=path.join(dir,'assets'), dstA=path.join(newDir,'assets');
        if(fs.existsSync(srcA)){fs.mkdirSync(dstA,{recursive:true});for(const f of fs.readdirSync(srcA))fs.copyFileSync(path.join(srcA,f),path.join(dstA,f));}
        fs.rmSync(dir,{recursive:true,force:true});
      }catch(e){}
      merges.push({from:path.relative(DRV,dir),to:path.relative(DRV,newDir)});
      continue;
    }

    if(path.resolve(dir)!==path.resolve(newDir)){
      fs.mkdirSync(newDir,{recursive:true});
      try {
        const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
        for (const f of files) {
          const srcP = path.join(dir,f);
          const dstP = path.join(newDir,f);
          try { fs.renameSync(srcP, dstP); } catch(e) { try { fs.copyFileSync(srcP, dstP); } catch(_){} }
        }
      } catch(e) {}
      try{ if(fs.existsSync(dir)) fs.rmdirSync(dir); }catch(e){}
      moves.push({from:path.relative(DRV,dir),to:path.relative(DRV,newDir)});
    }
    ensureFiles(newDir,newId,obj);
  }

  // Nettoyage dossiers vides (sans toucher drivers/tuya|zigbee)
  try {
    const queue = [DRV];
    while (queue.length) {
      const dir = queue.pop();
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { continue; }
      for (const entry of entries) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Évite de supprimer les dossiers terminaux 'tuya' ou 'zigbee'
          const isTerminalDomain = /(^|\\|\/)(tuya|zigbee)$/.test(p);
          if (!isTerminalDomain) {
            try {
              if (fs.readdirSync(p).length === 0) {
                fs.rmdirSync(p);
                continue;
              }
            } catch (e) {}
          }
          queue.push(p);
        }
      }
    }
  } catch (e) {}

  const MAP=path.join(ROOT,'drivers-rename-map.json'); w(MAP,{moves,merges});
  console.log(`[reorg] moves:${moves.length} merges:${merges.length}`);
})();
