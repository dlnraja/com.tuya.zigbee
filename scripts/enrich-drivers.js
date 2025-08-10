'use strict';
const fs=require('fs'),fsp=require('fs/promises'),path=require('path'),crypto=require('crypto');
const APPLY=process.argv.includes('--apply');const ROOT=process.cwd();const TMP=path.join(ROOT,'.tmp_tuya_zip_work');const DRV=path.join(ROOT,'drivers');const BACK=['backup','final-release'].map(p=>path.join(ROOT,p));
function listCompose(root){const out=[];if(!fs.existsSync(root))return out;const st=[root];while(st.length){const cur=st.pop();let s;try{s=fs.statSync(cur);}catch{continue;}if(s.isDirectory()){for(const e of fs.readdirSync(cur)){const p=path.join(cur,e);try{const ss=fs.statSync(p);if(ss.isDirectory())st.push(p);else if(ss.isFile()&&/driver(\.compose)?\.json$/i.test(p))out.push(p);}catch{}}}}return out;}
function readJSON(p){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}}
function safeId(s){return String(s||'device').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'');}
function fpOf(o){const z=o?.zigbee||{};const man=o?.manufacturerName||z?.manufacturerName||o?.manufacturer||'';const mod=o?.modelId||z?.modelId||o?.model||o?.productId||'';const caps=Array.isArray(o?.capabilities)?[...o.capabilities].sort():[];const raw=`${man}|${mod}|${caps.join(',')}`;const sha=crypto.createHash('sha1').update(raw).digest('hex').slice(0,8);return{man,mod,caps,key:safeId(`${(man||'unk')}_${(mod||'unk')}_${sha}`)};}
function sources(){const s=[];if(fs.existsSync(TMP)){for(const d of fs.readdirSync(TMP,{withFileTypes:true})){if(!d.isDirectory())continue;const dir=path.join(TMP,d.name);for(const f of listCompose(dir))s.push({where:'zip',base:d.name,file:f,obj:readJSON(f)});}}for(const b of BACK){if(!fs.existsSync(b))continue;for(const f of listCompose(b))s.push({where:'backup',base:path.relative(ROOT,b),file:f,obj:readJSON(f)});}return s.filter(x=>x.obj);}
function repoDrivers(){const out=[];if(!fs.existsSync(DRV))return out;const st=[DRV];while(st.length){const cur=st.pop();let s;try{s=fs.statSync(cur);}catch{continue;}if(s.isDirectory()){for(const e of fs.readdirSync(cur)){const p=path.join(cur,e);try{const ss=fs.statSync(p);if(ss.isDirectory())st.push(p);else if(ss.isFile()&&/driver(\.compose)?\.json$/i.test(p)){const compose=['driver.compose.json','driver.json'].map(n=>path.join(cur,n)).find(p=>fs.existsSync(p));if(compose)out.push({dir:cur,compose,obj:readJSON(compose)});}st.push(p);}catch{}}}}return out;}
function overlap(a,b){const A=new Set(a||[]),B=new Set(b||[]);let i=0;for(const c of A)if(B.has(c))i++;return i;}
function best(repo,fp){let best=null,score=-1;for(const r of repo){const s=overlap(r.obj?.capabilities||[],fp.caps);const manMatch=String(r.obj?.zigbee?.manufacturerName||'').toLowerCase().includes(String(fp.man||'').toLowerCase());const modMatch=String(r.obj?.zigbee?.modelId||'').toLowerCase().includes(String(fp.mod||'').toLowerCase());const total=s*2+(manMatch?1:0)+(modMatch?1:0);if(total>score){score=total;best=r;}}return best;}
function pickBaseDir(fp){const tuya=path.join(DRV,'tuya');const zigbee=path.join(DRV,'zigbee');const m=String(fp.man||'').toLowerCase();if(fs.existsSync(tuya)&&(m.includes('tuya')||m.includes('_tz')||m.includes('_ty')))return tuya;if(fs.existsSync(zigbee))return zigbee;return DRV;}
function ensureDriverSkeleton(baseDir,id){const dir=path.join(baseDir,safeId(id));fs.mkdirSync(dir,{recursive:true});const compose=path.join(dir,'driver.compose.json');const device=path.join(dir,'device.js');if(!fs.existsSync(compose))fs.writeFileSync(compose,JSON.stringify({id:safeId(id),name:{en:id,fr:id},capabilities:[],zigbee:{}},null,2));if(!fs.existsSync(device))fs.writeFileSync(device,`'use strict';\nconst { ZigBeeDevice } = require('homey-meshdriver');\nclass Device extends ZigBeeDevice{async onMeshInit(){this.log('init');}}\nmodule.exports = Device;\n`);return{dir,compose,device};}
function mergeArr(a,b){const A=Array.isArray(a)?a:(a?[a]:[]);const B=Array.isArray(b)?b:(b?[b]:[]);return Array.from(new Set([...A,...B].filter(Boolean)));}
(async()=>{
  const S=sources(),R=repoDrivers();if(!S.length){console.log('[enrich] nothing to merge');return;}
  let merges=0,created=0,icons=0;
  for(const s of S){
    const fp=fpOf(s.obj||{});let target=best(R,fp);
    if(!target){const base=pickBaseDir(fp);const id=fp.mod||fp.man||'tuya-device';const sk=ensureDriverSkeleton(base,id);target={dir:sk.dir,compose:sk.compose,obj:readJSON(sk.compose)};R.push(target);created++;}
    const obj=readJSON(target.compose)||{id:safeId(fp.mod||fp.man||'tuya-device'),name:{en:'Tuya Device',fr:'Appareil Tuya'},capabilities:[],zigbee:{}};
    const before=JSON.stringify(obj);
    obj.name=(typeof obj.name==='string')?{en:obj.name,fr:obj.name}:(obj.name||{en:'Tuya Device',fr:'Appareil Tuya'});
    obj.capabilities=mergeArr(obj.capabilities,s.obj?.capabilities);
    obj.zigbee=obj.zigbee||{};
    obj.zigbee.manufacturerName=mergeArr(obj.zigbee.manufacturerName,s.obj?.zigbee?.manufacturerName||s.obj?.manufacturerName);
    obj.zigbee.modelId=mergeArr(obj.zigbee.modelId,s.obj?.zigbee?.modelId||s.obj?.modelId||s.obj?.productId);
    if(JSON.stringify(obj)!==before){fs.writeFileSync(target.compose,JSON.stringify(obj,null,2));merges++;}
    const assets=path.join(target.dir,'assets');const icon=path.join(assets,'icon.svg');if(!fs.existsSync(assets))fs.mkdirSync(assets,{recursive:true});
    if(!fs.existsSync(icon)){const hex='#00AAFF';const svg=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">\n<rect x="24" y="24" width="208" height="208" rx="32" fill="#f6f8fa" stroke="${hex}" stroke-width="8"/>\n<path d="M72 96h112v64H72z" fill="none" stroke="${hex}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>\n<circle cx="96" cy="128" r="10" fill="${hex}"/><circle cx="160" cy="128" r="10" fill="${hex}"/>\n</svg>`;fs.writeFileSync(icon,svg,'utf8');icons++;}}
  try{await fsp.appendFile(path.join(process.cwd(),'CHANGELOG_AUTO.md'),`\n## Auto-merge ${new Date().toISOString()}\nmerged:${merges} created:${created} icons:${icons}\n`);}catch{}
  console.log(`[enrich] merged:${merges} created:${created} icons:${icons}`);
})().catch(e=>{console.error('[enrich] fatal',e);process.exitCode=1;});
