#!/usr/bin/env node
// sdk3_quick_autofix.js – minimal fixer for 4 rules
const fs=require('fs');const path=require('path');
const ROOT=process.cwd();const DRV=path.join(ROOT,'drivers');const APP=path.join(ROOT,'app.json');
const CLMAP={basic:0,powerconfiguration:1,identify:3,groups:4,scenes:5,onoff:6,levelcontrol:8,colorcontrol:768,illuminancemeasurement:1024,occupancysensing:1030,iaszone:1280,tuyaspecific:61184};
const ALLOWED_BT=new Set(['AA','AAA','C','D','CR2032','CR2430','CR2450','CR2477','CR3032','CR2','CR123A','CR14250','CR17335','PP3','INTERNAL','OTHER']);
const LITHIUM_RE=/LI(-| )?ION|LIPO|LI-PO|LI\s?POLY|LITHIUM|LIFEPO4|LIFEPO|LIFEP0?4/i;
function rj(p){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}}
function wj(p,d){fs.writeFileSync(p,JSON.stringify(d,null,2),'utf8')}
function drivers(){if(!fs.existsSync(DRV))return[];return fs.readdirSync(DRV,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name)}
function parseCl(v){if(typeof v==='number'&&Number.isFinite(v))return v;if(typeof v==='string'){const s=v.trim();const k=s.toLowerCase();if(k in CLMAP)return CLMAP[k];if(/^0x[0-9a-f]+$/i.test(s)){const n=parseInt(s,16);if(Number.isFinite(n))return n}const n10=parseInt(s,10);if(Number.isFinite(n10))return n10}return null}
function numArr(a){if(!Array.isArray(a))return[];const o=[];for(const v of a){const p=parseCl(v);if(p!==null)o.push(p)}return Array.from(new Set(o)).sort((a,b)=>a-b)}
function normBatt(list,needs){if(!needs)return undefined;const out=[];if(Array.isArray(list)){for(const it of list){if(!it||typeof it!=='string')continue;let t=it.trim().toUpperCase();if(LITHIUM_RE.test(t))t='INTERNAL';if(ALLOWED_BT.has(t))out.push(t)}}if(!out.length)out.push('CR2032');return Array.from(new Set(out))}
function normPid(v){if(Array.isArray(v))return Array.from(new Set(v.map(normPid).filter(Boolean)));if(typeof v==='string'){const s=v.trim();if(!s)return null;if(/^TS[0-9A-Z_-]+$/i.test(s))return s.toUpperCase();if(/^0x[0-9a-f]+$/i.test(s))return s.toLowerCase();if(/^[A-Z]{2,}[0-9]+$/i.test(s))return s.toUpperCase();return s}if(typeof v==='number')return String(v);return null}
function pickClass(caps){const s=new Set(Array.isArray(caps)?caps:[]);const hasLight=['dim','light_hue','light_saturation','light_temperature'].some(c=>s.has(c));const hasPower=s.has('measure_power')||s.has('meter_power');const hasOnOff=s.has('onoff');const hasButton=[...s].some(c=>String(c).startsWith('button'));if(hasLight)return'light';if(hasOnOff&&hasPower)return'socket';if(hasButton)return'button';return'sensor'}
function fixManifest(id){const p=path.join(DRV,id,'driver.compose.json');const m=rj(p);if(!m)return{changed:false};let ch=false; // 1) capabilities
if(Array.isArray(m.capabilities)){let caps=m.capabilities.slice().map(c=>c==='measure_voc'?'measure_tvoc':c).filter(c=>c!=='measure_formaldehyde');caps=Array.from(new Set(caps));if(JSON.stringify(caps)!==JSON.stringify(m.capabilities)){m.capabilities=caps;ch=true}}
// 2) class 'switch'
const VALID=new Set(['sensor','light','socket','button','other','alarm','lock']);if(m.class==='switch'||!VALID.has(m.class)){const nc=pickClass(m.capabilities);if(nc!==m.class){m.class=nc;ch=true}}
// 3) images referencing app-level -> force driver-rel
m.images=m.images||{};if(m.images.small!=='./assets/small.png'){m.images.small='./assets/small.png';ch=true}if(m.images.large!=='./assets/large.png'){m.images.large='./assets/large.png';ch=true}if(m.zigbee&&m.zigbee.learnmode&&typeof m.zigbee.learnmode.image==='string'){if(m.zigbee.learnmode.image!=='./assets/large.png'){m.zigbee.learnmode.image='./assets/large.png';ch=true}}
// 4) non-numeric cluster IDs
if(m.zigbee&&m.zigbee.endpoints&&typeof m.zigbee.endpoints==='object'){Object.keys(m.zigbee.endpoints).forEach(ep=>{const e=m.zigbee.endpoints[ep];if(e&&typeof e==='object'){if(Array.isArray(e.clusters)){const fx=numArr(e.clusters);if(JSON.stringify(fx)!==JSON.stringify(e.clusters)){e.clusters=fx;ch=true}}if(Array.isArray(e.bindings)){const fb=numArr(e.bindings);if(JSON.stringify(fb)!==JSON.stringify(e.bindings)){e.bindings=fb;ch=true}}}})}
// 5) batteries normalization when measure_battery
const needs=Array.isArray(m.capabilities)&&m.capabilities.includes('measure_battery');
if(needs){m.energy=m.energy||{};const nb=normBatt(m.energy.batteries,true);if(JSON.stringify(nb)!==JSON.stringify(m.energy.batteries||[])){m.energy.batteries=nb;ch=true}}
// 6) manufacturerName: allow string OR array of strings; clean & merge root field if present
if(!m.zigbee)m.zigbee={};
if(Array.isArray(m.zigbee.manufacturerName)){
  const cleaned=Array.from(new Set(m.zigbee.manufacturerName.map(x=>typeof x==='string'?x.trim():'').filter(Boolean)));
  if(JSON.stringify(cleaned)!==JSON.stringify(m.zigbee.manufacturerName)){m.zigbee.manufacturerName=cleaned;ch=true}
}
if(typeof m.manufacturerName==='string'&&m.manufacturerName.trim()){
  const rootVal=m.manufacturerName.trim();
  if(Array.isArray(m.zigbee.manufacturerName)){
    if(!m.zigbee.manufacturerName.includes(rootVal)){m.zigbee.manufacturerName.push(rootVal);ch=true}
  } else if(!m.zigbee.manufacturerName){
    m.zigbee.manufacturerName=rootVal;ch=true
  } else if (typeof m.zigbee.manufacturerName==='string' && m.zigbee.manufacturerName!==rootVal){
    m.zigbee.manufacturerName=Array.from(new Set([m.zigbee.manufacturerName, rootVal]));ch=true
  }
}
if(Object.prototype.hasOwnProperty.call(m,'manufacturerName')){delete m.manufacturerName}
// 7) productId normalization to array of strings
if(m.zigbee&&m.zigbee.productId!==undefined){const arr=Array.isArray(m.zigbee.productId)?m.zigbee.productId:[m.zigbee.productId];const norm=Array.from(new Set(arr.map(normPid).filter(Boolean)));if(JSON.stringify(norm)!==JSON.stringify(Array.isArray(m.zigbee.productId)?m.zigbee.productId:[m.zigbee.productId])){m.zigbee.productId=norm;ch=true}}
if(ch)wj(p,m);return{changed:ch}}
function fixApp(){const a=rj(APP);if(!a||!Array.isArray(a.drivers))return{changed:false};let ch=false;a.drivers=a.drivers.map(d=>{const c={...d}; // caps
if(Array.isArray(c.capabilities)){let caps=c.capabilities.slice().map(x=>x==='measure_voc'?'measure_tvoc':x).filter(x=>x!=='measure_formaldehyde');caps=Array.from(new Set(caps));if(JSON.stringify(caps)!==JSON.stringify(c.capabilities)){c.capabilities=caps;ch=true}}
// class
const VALID=new Set(['sensor','light','socket','button','other','alarm','lock']);if(c.class==='switch'||!VALID.has(c.class)){const nc=pickClass(c.capabilities);if(nc!==c.class){c.class=nc;ch=true}}
// images -> per-driver absolute
if(c.id){const base=`/drivers/${c.id}/assets`;c.images=c.images||{};if(c.images.small!==`${base}/small.png`){c.images.small=`${base}/small.png`;ch=true}if(c.images.large!==`${base}/large.png`){c.images.large=`${base}/large.png`;ch=true}if(c.zigbee&&c.zigbee.learnmode&&typeof c.zigbee.learnmode.image==='string'){if(c.zigbee.learnmode.image!==`${base}/large.png`){c.zigbee.learnmode.image=`${base}/large.png`;ch=true}}}
// batteries in app.json for measure_battery
const needs=Array.isArray(c.capabilities)&&c.capabilities.includes('measure_battery');
if(needs){c.energy=c.energy||{};const before=JSON.stringify(c.energy.batteries||[]);let nb=Array.isArray(c.energy.batteries)?c.energy.batteries:[];nb=normBatt(nb,true);if(JSON.stringify(nb)!==before){c.energy.batteries=nb;ch=true}}
return c});if(ch)wj(APP,a);return{changed:ch}}
function main(){const ids=drivers();let dchg=0;ids.forEach(id=>{const {changed}=fixManifest(id);if(changed)dchg++});const ares=fixApp();console.log(`✅ sdk3_quick_autofix: fixed ${dchg} driver manifests; app.json changed: ${ares.changed}`)}
if(require.main===module){try{main()}catch(e){console.error('sdk3_quick_autofix failed:',e);process.exit(1)}}
