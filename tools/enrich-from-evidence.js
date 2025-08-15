#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
function backup(p){const b=path.join('backups',p); fs.mkdirSync(path.dirname(b),{recursive:true});
 if(fs.existsSync(p)) fs.copyFileSync(p,b);}
function uniq(a){return Array.from(new Set(a))}
function capOptionsFor(cap){switch(cap){
 case 'measure_temperature': return { decimals:1, units:'°C' };
 case 'measure_humidity': return { decimals:1, units:'%RH' };
 case 'measure_luminance': return { units:'lx' };
 case 'meter_power': return { units:'kWh' };
 case 'measure_power': return { units:'W' };
 default: return undefined; }}
const base='drivers'; if(!fs.existsSync(base)) process.exit(0);
const changes=[];
for(const d of fs.readdirSync(base,{withFileTypes:true})){
 if(!d.isDirectory())continue; const id=d.name,root=path.join(base,id);
 const metaPath=['driver.compose.json','driver.json'].map(f=>path.join(root,f)).find(f=>fs.existsSync(f));
 if(!metaPath){ changes.push({id,skipped:'no meta'}); continue; }
 let meta={}; try{ meta=JSON.parse(fs.readFileSync(metaPath,'utf8')); }catch(e){ changes.push({id,skipped:'meta invalid'}); continue; }
 const evDir=path.join('evidence',id); const propPath=path.join(evDir,'capabilities.proposed.json');
 if(!fs.existsSync(propPath)){ changes.push({id,skipped:'no evidence'}); continue; }
 let proposed=[]; try{ proposed=JSON.parse(fs.readFileSync(propPath,'utf8')); }catch{}
 if(!Array.isArray(proposed)||!proposed.length){ changes.push({id,skipped:'empty proposed'}); continue; }
 // 1) merge capabilities
 const curr = Array.isArray(meta.capabilities)? meta.capabilities : [];
 const merged = uniq([...curr, ...proposed]);
 // 2) capabilitiesOptions
 const opts = meta.capabilitiesOptions || {};
 for(const c of merged){ const o=capOptionsFor(c); if(o) opts[c]=Object.assign({},opts[c]||{},o); }
 meta.capabilities = merged; meta.capabilitiesOptions = opts;
 // 3) energy (si power/meter)
 if(merged.includes('meter_power') || merged.includes('measure_power')){
   meta.energy = meta.energy || { cumulative: merged.includes('meter_power') };
 }
 // 4) sauvegarde et write
 backup(metaPath); fs.writeFileSync(metaPath, JSON.stringify(meta,null,2));
 // 5) device.js minimal si manquant
 const devPath=path.join(root,'device.js');
 if(!fs.existsSync(devPath)){
   const rel='../../lib/zb-verbose';
   const js=`'use strict';
const { ZigBeeDevice, ZigBeeLightDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('${rel}');
class Device extends (${merged.includes('dim')||merged.includes('light_hue')?'ZigBeeLightDevice':'ZigBeeDevice'}) {
  async onNodeInit({ zclNode }) {
    this.log('🚀 device init');
    attachZBVerbose(this,{dumpOnInit:true,readBasicAttrs:true,subscribeReports:false,hookCapabilities:true});
    // TODO: registerCapability mapping based on clusters when available
  }
}
module.exports = Device;
`;
   backup(devPath); fs.writeFileSync(devPath, js);
 }
 changes.push({id,updated:true});
}
fs.writeFileSync('CHANGELOG_ENRICHMENT.md', changes.map(c=>`- ${c.id}: ${c.updated?'updated':'skipped ('+(c.skipped||'?')+')'}`).join('\n'));
console.log('✅ enrichment applied (compose + device.js if needed)');
