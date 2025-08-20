#!/usr/bin/env node
'use strict';

'use strict';
const fs=require('fs'), path=require('path'), https=require('https');
const ROOT=process.cwd(), QUEUE=path.join(ROOT,'queue'); const DRV=path.join(ROOT,'drivers');
const OWNER=process.env.Z2M_OWNER||'Koenkk', REPO=process.env.Z2M_REPO||'zigbee-herdsman-converters';
const BATCH=Number(process.env.BATCH_SIZE||50);

function readProgress(){
  try {return JSON.parse(fs.readFileSync(path.join(QUEUE,'z2m-progress.json'),'utf8'));}
  } catch (error) {return{cursor:0,processed:[]};}
}

function writeProgress(p){
  fs.mkdirSync(QUEUE,{recursive:true});
  fs.writeFileSync(path.join(QUEUE,'z2m-progress.json'),JSON.stringify(p,null,2));
}

function gh(pathname){
  return new Promise((resolve)=>{
    const t=process.env.GITHUB_TOKEN;
    console.log(`[DEBUG] gh() called with pathname: ${pathname}`);
    console.log(`[DEBUG] GITHUB_TOKEN present: ${!!t}`);
    if(!t)return resolve({ok:false,reason:'NO_TOKEN'});
    const opt={
      hostname:'api.github.com',
      path:pathname,
      headers:{
        'User-Agent':'homey-tuya-bot',
        'Authorization':`Bearer ${t}`,
        'Accept':'application/vnd.github+json'
      }
    };
    console.log(`[DEBUG] Making request to: ${opt.hostname}${opt.path}`);
    https.get(opt,res=>{
      console.log(`[DEBUG] Response status: ${res.statusCode}`);
      let d='';
      res.on('data',c=>d+=c);
      res.on('end',()=>{
        console.log(`[DEBUG] Response data length: ${d.length}`);
        console.log(`[DEBUG] Response preview: ${d.substring(0,200)}...`);
        try {resolve({ok:true,json:JSON.parse(d)})}
        catch(e){console.log(`[DEBUG] JSON parse error: ${e.message}`);resolve({ok:false})}
      });
    }).on('error',(e)=>{console.log(`[DEBUG] Request error: ${e.message}`);resolve({ok:false})});
  });
}

function raw(pathname){
  return new Promise((resolve)=>{
    const t=process.env.GITHUB_TOKEN;
    console.log(`[DEBUG] raw() called with pathname: ${pathname}`);
    if(!t)return resolve({ok:false});
    const opt={
      hostname:'raw.githubusercontent.com',
      path:pathname,
      headers:{
        'User-Agent':'homey-tuya-bot',
        'Authorization':`Bearer ${t}`
      }
    };
    console.log(`[DEBUG] Making raw request to: ${opt.hostname}${opt.path}`);
    https.get(opt,res=>{
      console.log(`[DEBUG] Raw response status: ${res.statusCode}`);
      let d='';
      res.on('data',c=>d+=c);
      res.on('end',()=>resolve({ok:true,text:d}));
    }).on('error',(e)=>{console.log(`[DEBUG] Raw request error: ${e.message}`);resolve({ok:false})});
  });
}

function slug(s){return String(s||'').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'');}
function A(v){return Array.isArray(v)?v:(v?[v]:[]);}

function domainOf(vendor){
  const v=String(vendor||'').toLowerCase();
  return (/tuya|^_tz|^_ty/.test(v)?'tuya':'zigbee');
}

function vendorHeur(vendor){
  const v=String(vendor||'').toLowerCase();
  if(/tuya|^_tz|^_ty/.test(v))return'tuya';
  if(/aqara|lumi/.test(v))return'aqara';
  if(/ikea|tradfri/.test(v))return'ikea';
  if(/philips|signify|hue/.test(v))return'philips';
  if(/sonoff|itead/.test(v))return'sonoff';
  if(/ledvance|osram/.test(v))return'ledvance';
  return v||'generic';
}

function catByGuess(){return 'switch';}

function ensureDriver(category, vendor, model, o){
  const dir = path.join(DRV, domainOf(vendor), category, vendorHeur(vendor), slug(model));
  fs.mkdirSync(dir,{recursive:true});
  const compose = path.join(dir,'driver.compose.json');
  const obj = fs.existsSync(compose)? JSON.parse(fs.readFileSync(compose,'utf8')) : { id:`${category}-${vendorHeur(vendor)}-${slug(model)}`, name:{en:slug(model),fr:slug(model)}, capabilities:[], zigbee:{} };
  const mans = new Set(A(obj.zigbee.manufacturerName).concat(A(o.manufacturer)));
  const mods = new Set(A(obj.zigbee.modelId).concat(A(o.models)));
  obj.zigbee.manufacturerName = [...mans].filter(Boolean);
  obj.zigbee.modelId = [...mods].filter(Boolean);
  fs.writeFileSync(compose, JSON.stringify(obj,null,2));
  const assets=path.join(dir,'assets'); fs.mkdirSync(assets,{recursive:true});
  const icon=path.join(assets,'icon.svg'); if(!fs.existsSync(icon)) fs.writeFileSync(icon, `<svg xmlns = "http://www.w3.org/2000/svg"><rect width = "256" height = "256" fill = "// f6f8fa"/></svg>`);
  return dir;
}

function parseDefs(text){
  const vendors = []; const mans=[]; const models=[];
  const rxVendor = /vendor\s*:\s*['"`]([^'"`]+)['"`]/gi;
  const rxMan    = /manufacturer(Name)?\s*:\s*(?:\[[^\]]*\]|['"`]([^'"`]+)['"`])/gi;
  const rxZModel = /(zigbeeModel|model|modelID)\s*:\s*(?:\[[^\]]*\]|['"`]([^'"`]+)['"`])/gi;
  let m; while((m=rxVendor.exec(text))) vendors.push(m[1]);
  while((m=rxMan.exec(text))){ const t=m[0]; const arr=[...t.matchAll(/['"`]([^'"`]+)['"`]/g)].map(x=>x[1]); mans.push(...arr); }
  while((m=rxZModel.exec(text))){ const t=m[0]; const arr=[...t.matchAll(/['"`]([^'"`]+)['"`]/g)].map(x=>x[1]); models.push(...arr); }
  const vendor = vendors[0] || mans[0] || 'generic';
  return { vendor, manufacturer: mans.length?mans: [vendor], models: models.length?models: [] };
}

(async()=>{
  console.log(`[DEBUG] Starting Z2M seed with OWNER=${OWNER}, REPO=${REPO}, BATCH=${BATCH}`);
  if(!process.env.GITHUB_TOKEN){ console.log('[z2m-seed] GITHUB_TOKEN manquant → skip.'); process.exit(0); }
  const prog = readProgress();
  console.log(`[DEBUG] Progress loaded:`, prog);
  const listing = await gh(`/repos/${OWNER}/${REPO}/contents/devices`);
  console.log(`[DEBUG] Listing result:`, listing);
  if(!(listing.ok && Array.isArray(listing.json))){ console.log('[z2m-seed] impossible de lister /devices'); process.exit(0); }
  const files = listing.json.filter(x=>/\.t?s$/.test(x.name) && !/^index\./.test(x.name));
  console.log(`[DEBUG] Filtered files:`, files.length);
  const start = prog.cursor || 0, end = Math.min(start + BATCH, files.length);
  if(start>=files.length){ console.log('[z2m-seed] tout est déjà semé.'); process.exit(0); }
  console.log(`[z2m-seed] lot ${start}..${end-1} / ${files.length}`);
  for(let i=start;i<end;i++){
    const f = files[i];
    console.log(`[DEBUG] Processing file:`, f);
    const res = await raw(`/Koenkk/zigbee-herdsman-converters/master/${f.path}`);
    if(!res.ok) continue;
    const info = parseDefs(res.text);
    console.log(`[DEBUG] Parsed info:`, info);
    const category = catByGuess(info.models);
    for(const model of (info.models.length?info.models:['unknown'])) ensureDriver(category, info.vendor, model, info);
  }
  prog.cursor = end; writeProgress(prog);
  try { require('child_process').spawnSync('node',['scripts/git-commit-push.js','seed: z2m batch'],{stdio:'inherit',shell:process.platform==='win32'}); } } catch (error) {}
})();
