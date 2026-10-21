'use strict';
// Builds a facts-only KB index (ids + facts + citation) from mirrored upstream repos. No prose copied.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const KB=process.env.KB_DIR||'/workspace/kb';
const walk=(d,re,o=[])=>{if(!fs.existsSync(d))return o;for(const f of fs.readdirSync(d)){const p=path.join(d,f);const s=fs.statSync(p);if(s.isDirectory())walk(p,re,o);else if(re.test(f))o.push(p);}return o;};
const head=d=>{try{return {commit:cp.execSync(`git -C ${d} rev-parse HEAD`).toString().trim(),date:cp.execSync(`git -C ${d} log -1 --format=%cI`).toString().trim()};}catch{return {commit:null,date:null};}};
const strs=s=>[...s.matchAll(/["'`]([^"'`]+)["'`]/g)].map(m=>m[1]);
// zhc: assign fingerprints/zigbeeModel to the next `model:` in the same definition
function parseZhc(txt){const out=[];let pend={fp:[],zm:[]};
 const re=/tuya\.fingerprint\(\s*["']([^"']+)["']\s*,\s*\[([^\]]*)\]|modelID:\s*["']([^"']+)["']\s*,\s*manufacturerName:\s*["']([^"']+)["']|manufacturerName:\s*["']([^"']+)["']\s*,\s*modelID:\s*["']([^"']+)["']|zigbeeModel:\s*\[([^\]]*)\]|\bmodel:\s*["']([^"']+)["']\s*,\s*\n\s*vendor:\s*["']([^"']+)["']\s*,\s*\n\s*description:\s*["']([^"']*)["']/g;
 let m;while((m=re.exec(txt))){
  if(m[1])strs(m[2]).forEach(x=>pend.fp.push({mfr:x,pid:m[1]}));
  else if(m[3])pend.fp.push({mfr:m[4],pid:m[3]});
  else if(m[5])pend.fp.push({mfr:m[5],pid:m[6]});
  else if(m[7]!==undefined)pend.zm.push(...strs(m[7]));
  else if(m[8]){out.push({model:m[8],vendor:m[9],description:m[10],fingerprints:pend.fp,zigbeeModel:pend.zm,line:txt.slice(0,m.index).split('\n').length});pend={fp:[],zm:[]};}}
 return out;}
function parseZ2mPage(txt){const row=k=>{const m=txt.match(new RegExp('\\|\\s*'+k+'\\s*\\|\\s*(.*?)\\s*\\|\\s*$','m'));return m?m[1].trim():null;};
 const v=row('Vendor');return {model:row('Model'),vendor:v?v.replace(/\[([^\]]+)\].*/,'$1'):null,description:row('Description'),exposes:(row('Exposes')||'').split(/,\s*(?![^()]*\))/).filter(Boolean),
  options:[...new Set([...txt.matchAll(/^\* `([a-z0-9_]+)`/gm)].map(m=>m[1]))]};}
const SOURCES={
 'z2m':{name:'Zigbee2MQTT docs',repo:'z2m-site',license:'GPL-3.0',build(d,c){const fps={};const zhc=path.join(KB,'zhc');
   for(const f of walk(path.join(zhc,'src/devices'),/\.ts$/))for(const e of parseZhc(fs.readFileSync(f,'utf8')))(fps[e.model]=fps[e.model]||[]).push(e);
   return walk(path.join(d,'docs/devices'),/\.md$/).map(f=>{const p=parseZ2mPage(fs.readFileSync(f,'utf8'));const z=(fps[p.model]||[])[0]||{};
    return {...p,fingerprints:z.fingerprints||[],zigbeeModel:z.zigbeeModel||[],url:'https://www.zigbee2mqtt.io/devices/'+encodeURIComponent(path.basename(f,'.md'))+'.html'};});}},
 'zhc':{name:'zigbee-herdsman-converters',repo:'zhc',license:'MIT',build(d,c){const o=[];for(const f of walk(path.join(d,'src/devices'),/\.ts$/)){const rel=path.relative(d,f);for(const e of parseZhc(fs.readFileSync(f,'utf8')))o.push({...e,url:`https://github.com/Koenkk/zigbee-herdsman-converters/blob/${c.commit}/${rel}#L${e.line}`});}return o;}},
 'zha':{name:'zha-device-handlers',repo:'zha',license:'Apache-2.0',build(d,c){const o=[];for(const f of walk(path.join(d,'zhaquirks'),/\.py$/)){const t=fs.readFileSync(f,'utf8');const rel=path.relative(d,f);const fp=[];
   for(const m of t.matchAll(/\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g))if(/^(TS|_T|_tz)/i.test(m[1])||/^TS/.test(m[2]))fp.push(m[1].startsWith('_')?{mfr:m[1],pid:m[2]}:{mfr:m[2],pid:m[1]});
   for(const m of t.matchAll(/\.applies_to\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g))fp.push({mfr:m[1],pid:m[2]});
   for(const m of t.matchAll(/\.tuya_enchantment|TuyaQuirkBuilder\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g))if(m[1])fp.push({mfr:m[1],pid:m[2]});
   if(fp.length)o.push({quirk:rel,fingerprints:fp,dps:[...new Set([...t.matchAll(/dp_id=(\d+)|\.tuya_\w+\(\s*dp_id=(\d+)/g)].map(m=>+(m[1]||m[2])))],url:`https://github.com/zigpy/zha-device-handlers/blob/${c.commit}/${rel}`});}return o;}},
 'deconz':{name:'deCONZ DDF',repo:'deconz',license:'BSD-3-Clause',build(d,c){return walk(path.join(d,'devices'),/\.json$/).map(f=>{let j;try{j=JSON.parse(fs.readFileSync(f,'utf8'));}catch{return null;}if(!j.manufacturername)return null;
   const mf=[].concat(j.manufacturername),mo=[].concat(j.modelid||[]);const rel=path.relative(d,f);
   return {product:j.product||null,fingerprints:mf.map((x,i)=>({mfr:x,pid:mo[i]??mo[0]})),items:[...new Set((j.subdevices||[]).flatMap(s=>(s.items||[]).map(i=>i.name)))],url:`https://github.com/dresden-elektronik/deconz-rest-plugin/blob/${c.commit}/${rel}`};}).filter(Boolean);}},
 'blakadder':{name:'Blakadder Zigbee templates',repo:'blakadder',license:'MIT',build(d,c){return walk(path.join(d,'_zigbee'),/\.md$/).map(f=>{const t=fs.readFileSync(f,'utf8');const g=k=>{const m=t.match(new RegExp('^'+k+':\\s*(.*)$','m'));return m?m[1].replace(/^["']|["']$/g,'').trim():null;};
   return {model:g('model'),vendor:g('vendor'),title:g('title'),category:g('category'),zigbeemodel:(t.match(/^zigbeemodel:\s*\[?(.*?)\]?$/m)||[])[1]?.split(',').map(s=>s.replace(/['" ]/g,'')).filter(Boolean)||[],
    url:'https://zigbee.blakadder.com/'+path.basename(f,'.md')+'.html'};});}},
 'tuya-local':{name:'tuya-local device configs',repo:'tuya-local',license:'MIT',build(d,c){return walk(path.join(d,'custom_components/tuya_local/devices'),/\.ya?ml$/).map(f=>{const t=fs.readFileSync(f,'utf8');const rel=path.relative(d,f);
   return {config:path.basename(f),name:(t.match(/^name:\s*(.*)$/m)||[])[1]||null,product_ids:[...t.matchAll(/^\s*-\s*id:\s*([A-Za-z0-9_]+)/gm)].map(m=>m[1]),dps:[...new Set([...t.matchAll(/^\s+id:\s*(\d+)\s*$/gm)].map(m=>+m[1]))],
    entities:[...new Set([...t.matchAll(/entity:\s*(\w+)/g)].map(m=>m[1]))],url:`https://github.com/make-all/tuya-local/blob/${c.commit}/${rel}`};});}},
 'tinytuya':{name:'tinytuya',repo:'tinytuya',license:'MIT',build(d,c){return walk(path.join(d,'tinytuya'),/\.py$/).map(f=>{const t=fs.readFileSync(f,'utf8');const rel=path.relative(d,f);
   return {file:rel,protocolVersions:[...new Set([...t.matchAll(/["'](3\.[1-5])["']/g)].map(m=>m[1]))],commands:[...new Set([...t.matchAll(/^([A-Z_]{4,})\s*=\s*(0x[0-9a-fA-F]+|\d+)/gm)].map(m=>m[1]+'='+m[2]))].slice(0,80),url:`https://github.com/jasonacox/tinytuya/blob/${c.commit}/${rel}`};});}},
 'localtuya':{name:'localtuya',repo:'localtuya',license:'GPL-3.0',build(d,c){return walk(path.join(d,'custom_components'),/\.py$/).map(f=>{const t=fs.readFileSync(f,'utf8');const rel=path.relative(d,f);
   return {file:rel,protocolVersions:[...new Set([...t.matchAll(/["'](3\.[1-5])["']/g)].map(m=>m[1]))],constants:[...new Set([...t.matchAll(/^([A-Z_]{4,})\s*=\s*(0x[0-9a-fA-F]+|\d+)/gm)].map(m=>m[1]+'='+m[2]))].slice(0,80),url:`https://github.com/rospogrigio/localtuya/blob/${c.commit}/${rel}`};});}},
 'johan':{name:'Johan Bendz Tuya Zigbee Homey app',repo:'johan',license:'GPL-3.0',build(d,c){return walk(path.join(d,'drivers'),/^driver\.compose\.json$/).map(f=>{let j;try{j=JSON.parse(fs.readFileSync(f,'utf8'));}catch{return null;}const z=j.zigbee||{};const rel=path.relative(d,f);
   return {driver:path.basename(path.dirname(f)),class:j.class,capabilities:j.capabilities||[],manufacturerName:[].concat(z.manufacturerName||[]),productId:[].concat(z.productId||[]),url:`https://github.com/JohanBendz/com.tuya.zigbee/blob/${c.commit}/${rel}`};}).filter(Boolean);}},
 'zigbee-clusters':{name:'Athom zigbee-clusters',repo:'zigbee-clusters',license:'GPL-3.0',build(d,c){return walk(path.join(d,'lib/clusters'),/\.js$/).map(f=>{const t=fs.readFileSync(f,'utf8');const rel=path.relative(d,f);
   return {file:path.basename(f),id:+((t.match(/ID\s*[=:]\s*(0x[0-9a-fA-F]+|\d+)/)||[])[1]??NaN)||null,attributes:[...new Set([...t.matchAll(/^\s{2}(\w+):\s*\{\s*id:\s*(0x[0-9a-fA-F]+|\d+)/gm)].map(m=>m[1]+'='+m[2]))],url:`https://github.com/athombv/node-zigbee-clusters/blob/${c.commit}/${rel}`};});}},
 'ota':{name:'Koenkk zigbee-OTA',repo:'ota',license:'see repo',build(d,c){let j=[];try{j=JSON.parse(fs.readFileSync(path.join(d,'index.json'),'utf8'));}catch{}
   return j.map(e=>({manufacturerCode:e.manufacturerCode,imageType:e.imageType,fileVersion:e.fileVersion,fileSize:e.fileSize,sha512:e.sha512,manufacturerName:e.manufacturerName||[],modelId:e.modelId||null,minFileVersion:e.minFileVersion,maxFileVersion:e.maxFileVersion,url:e.url}));}},
};
function run(only){const st=path.join(KB,'index','state.json');fs.mkdirSync(path.dirname(st),{recursive:true});const state=fs.existsSync(st)?JSON.parse(fs.readFileSync(st,'utf8')):{};const counts={};
 for(const [k,s] of Object.entries(SOURCES)){if(only&&!only.includes(k))continue;const d=path.join(KB,s.repo);if(!fs.existsSync(d)){counts[k]='missing';continue;}
  const c=head(d);const dep=k==='z2m'?head(path.join(KB,'zhc')).commit:'';const key=c.commit+dep;const out=path.join(KB,'index',k,'entries.json');
  if(state[k]===key&&fs.existsSync(out)&&!process.env.KB_FORCE){counts[k]=JSON.parse(fs.readFileSync(out,'utf8')).entries.length+' (unchanged)';continue;}
  const cite={source:s.name,repo:'https://github.com/'+(cp.execSync(`git -C ${d} remote get-url origin`).toString().trim().replace(/.*github.com\//,'').replace(/\.git$/,'')),license:s.license,commit:c.commit,date:c.date};
  const entries=s.build(d,c).map(e=>({...e,cite:{source:s.name,url:e.url,commit:c.commit,date:c.date}}));
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({cite,entries}));state[k]=key;counts[k]=entries.length;}
 fs.writeFileSync(st,JSON.stringify(state,null,1));return counts;}
module.exports={parseZhc,parseZ2mPage,run,SOURCES};
if(require.main===module)console.log(JSON.stringify(run(process.argv.slice(2).length?process.argv.slice(2):null),null,1));
