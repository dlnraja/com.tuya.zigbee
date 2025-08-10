'use strict';
const fs=require('fs'),fsp=require('fs/promises'),path=require('path'),crypto=require('crypto');
const APPLY=process.argv.includes('--apply');const ROOT=process.cwd();const TMP=path.join(ROOT,'.tmp_tuya_zip_work');const DRV=path.join(ROOT,'drivers');const BACK=['backup','final-release'].map(p=>path.join(ROOT,p));
function listCompose(root){const out=[];if(!fs.existsSync(root))return out;const st=[root];while(st.length){const cur=st.pop();let s;try{s=fs.statSync(cur);}catch{continue;}if(s.isDirectory()){for(const e of fs.readdirSync(cur)){const p=path.join(cur,e);try{const ss=fs.statSync(p);if(ss.isDirectory())st.push(p);else if(ss.isFile()&&/driver(\.compose)?\.json$/i.test(p))out.push(p);}catch{}}}}return out;}
function j(p){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}}
function safeId(s){return String(s||'device').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'');}
function fpOf(o){const z=o?.zigbee||{};const man=o?.manufacturerName||z?.manufacturerName||o?.manufacturer||'';const mod=o?.modelId||z?.modelId||o?.model||o?.productId||'';const caps=Array.isArray(o?.capabilities)?[...o.capabilities].sort():[];const raw=`${man}|${mod}|${caps.join(',')}`;const sha=crypto.createHash('sha1').update(raw).digest('hex').slice(0,8);return{man,mod,caps,key:safeId(`${(man||'unk')}_${(mod||'unk')}_${sha}`)};}
function sources(){const s=[];if(fs.existsSync(TMP)){for(const d of fs.readdirSync(TMP,{withFileTypes:true})){if(!d.isDirectory())continue;const dir=path.join(TMP,d.name);for(const f of listCompose(dir))s.push({where:'zip',base:d.name,file:f,obj:j(f)});}}for(const b of BACK){if(!fs.existsSync(b))continue;for(const f of listCompose(b))s.push({where:'backup',base:path.relative(ROOT,b),file:f,obj:j(f)});}return s.filter(x=>x.obj);}
function repoDrivers(){const out=[];if(!fs.existsSync(DRV))return out;const st=[DRV];while(st.length){const cur=st.pop();let s;try{s=fs.statSync(cur);}catch{continue;}if(s.isDirectory()){const compose=['driver.compose.json','driver.json'].map(n=>path.join(cur,n)).find(p=>fs.existsSync(p));if(compose)out.push({dir:cur,compose,obj:j(compose)});for(const e of fs.readdirSync(cur))st.push(path.join(cur,e));}}return out;}
function A(v){return Array.isArray(v)?v:(v?[v]:[]);}function mergeArr(a,b){return Array.from(new Set([...(A(a)),...(A(b))].filter(Boolean)));}
(async()=>{
  const S=sources(),R=repoDrivers();if(!S.length){console.log('[enrich] nothing to merge');return;}
  let merges=0,created=0,icons=0;
  for(const s of S){
    // choisir meilleur driver à enrichir (vendor/model approximés)
    const fp = (o=>{const z=o?.zigbee||{};return{man:o?.manufacturerName||z?.manufacturerName||o?.manufacturer||'',mod:o?.modelId||z?.modelId||o?.model||o?.productId||'',caps:o?.capabilities||[]};})(s.obj||{});
    let target=null,score=-1;
    for(const r of R){
      const capsR=r.obj?.capabilities||[], capsS=fp.caps||[];
      const s1=[...new Set(capsR)].filter(x=>new Set(capsS).has(x)).length;
      const m1=String(r.obj?.zigbee?.manufacturerName||'').toLowerCase().includes(String(fp.man||'').toLowerCase())?1:0;
      const m2=String(r.obj?.zigbee?.modelId||'').toLowerCase().includes(String(fp.mod||'').toLowerCase())?1:0;
      const total=s1*2+m1+m2; if(total>score){score=total;target=r;}
    }
    if(!target){ // créer squelette si rien d'adéquat
      const id = safeId(fp.mod || fp.man || 'tuya-device');
      const dir = path.join(DRV, id); fs.mkdirSync(dir,{recursive:true});
      const comp = path.join(dir,'driver.compose.json'); const dev = path.join(dir,'device.js');
      if(!fs.existsSync(comp)) fs.writeFileSync(comp, JSON.stringify({id,name:{en:id,fr:id},capabilities:[],zigbee:{}},null,2));
      if(!fs.existsSync(dev)) fs.writeFileSync(dev, `'use strict';
const { ZigBeeDevice } = require('homey-meshdriver');
class Device extends ZigBeeDevice{async onMeshInit(){this.log('init');}}
module.exports = Device;
`);
      target={dir,compose:comp,obj:j(comp)}; R.push(target); created++;
    }
    const obj=j(target.compose)||{id:path.basename(target.dir),name:{en:'Tuya Device',fr:'Appareil Tuya'},capabilities:[],zigbee:{}};
    const before=JSON.stringify(obj);
    obj.name=(typeof obj.name==='string')?{en:obj.name,fr:obj.name}:(obj.name||{en:'Tuya Device',fr:'Appareil Tuya'});
    obj.capabilities=mergeArr(obj.capabilities, fp.caps);
    obj.zigbee=obj.zigbee||{};
    obj.zigbee.manufacturerName=mergeArr(obj.zigbee.manufacturerName, fp.man);
    obj.zigbee.modelId=mergeArr(obj.zigbee.modelId, fp.mod);
    if(JSON.stringify(obj)!==before){fs.writeFileSync(target.compose,JSON.stringify(obj,null,2));merges++;}
    const assets=path.join(target.dir,'assets'),icon=path.join(assets,'icon.svg');if(!fs.existsSync(assets))fs.mkdirSync(assets,{recursive:true});
    if(!fs.existsSync(icon)){const hex='#00AAFF';fs.writeFileSync(icon,`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<rect x="24" y="24" width="208" height="208" rx="32" fill="#f6f8fa" stroke="${hex}" stroke-width="8"/>
<path d="M72 96h112v64H72z" fill="none" stroke="${hex}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="96" cy="128" r="10" fill="${hex}"/><circle cx="160" cy="128" r="10" fill="${hex}"/>
</svg>`,'utf8');icons++;}
  }
  try{await fsp.appendFile(path.join(process.cwd(),'CHANGELOG_AUTO.md'),`\n## Auto-merge ${new Date().toISOString()}\nmerged:${merges} created:${created} icons:${icons}\n`);}catch{}
  console.log(`[enrich] merged:${merges} created:${created} icons:${icons}`);
})().catch(e=>{console.error('[enrich] fatal',e);process.exitCode=1;});
