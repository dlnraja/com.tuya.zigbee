/* eslint-disable */

function p3065Collections(devs){const agg={};const seen=new WeakSet();
 const walk=(o,path,depth)=>{if(!o||typeof o!=='object'||seen.has(o)||depth>3)return;seen.add(o);
  let n=-1;if(Array.isArray(o))n=o.length;else if(o instanceof Map||o instanceof Set)n=o.size;else if(Buffer.isBuffer(o))return;else n=Object.keys(o).length;
  if(n>0)agg[path]=(agg[path]||0)+n;
  if(o instanceof Map){for(const v of o.values())walk(v,path+'[]',depth+1);return;}
  if(Array.isArray(o)||o instanceof Set)return;
  for(const k of Object.keys(o)){if(['homey','driver','zclNode','node','_zclNode','app','_app','device','_device','ctx','owner','parent','_owner'].includes(k))continue;let v;try{v=o[k];}catch(e){continue;}walk(v,path+'.'+k,depth+1);}};
 for(const d of devs){for(const k of Object.keys(d)){if(['homey','driver','zclNode','node','_zclNode'].includes(k))continue;let v;try{v=d[k];}catch(e){continue;}walk(v,(d.constructor&&d.constructor.name)+'.'+k,1);}}
 return agg;}
// P3065: lifecycle leak harness. N devices (round-robin over DRV, default 5 common drivers) x C create/init/DP-flood/delete cycles.
// node --expose-gc scripts/perf/p3065-lifecycle-leak-harness.js <root> [N] [E] [C]  (OUT=result.json, DRV=a,b,c, SNAP=x.heapsnapshot)
// Reports heap per phase, devices still alive after delete (WeakRef), Homey intervals still armed and their source.
// P2915 load sim: N devices of common drivers, onNodeInit with mock zclNode, then E events each; heap snapshot.
const Module=require('module'),path=require('path'),fs=require('fs'),v8=require('v8'),EE=require('events');
const root=path.resolve(process.argv[2]);const N=+process.argv[3]||100,E=+process.argv[4]||100,C=+process.argv[5]||4;
const timers=new Set();
const homeyT={setTimeout:(f,ms,...a)=>{const t=setTimeout(f,Math.min(ms,50),...a);t.unref();return t},clearTimeout,setInterval:(f,ms)=>{const t=setInterval(f,Math.max(ms,1000));t.unref();t._src=(new Error().stack.split('\n').slice(2).find(l=>!/safe-timers|SafeTimerAccessor|SDK3CompatBridge|OwnedTimer/.test(l))||'').trim().replace(root,'');timers.add(t);return t},clearInterval:(t)=>{timers.delete(t);clearInterval(t)}};
const noop=()=>{};const P=new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:(k===Symbol.toPrimitive?()=>0:P),apply:()=>P,construct:()=>P});
const flowCard=()=>({registerRunListener(){return this},registerArgumentAutocompleteListener(){return this},trigger:async()=>{},on(){return this}});
class SimpleDevice extends EE{constructor(id,driverId){super();this._id=id;this._caps={};this._store={};this._settings={manufacturerName:'_TZ3000_test',zb_manufacturer_name:'_TZ3000_test',zb_model_id:'TS0001'};this.driver={id:driverId,manifest:{id:driverId,capabilities:['onoff']},getDevices:()=>[]};
 this.homey={...homeyT,app:{},flow:{getDeviceTriggerCard:flowCard,getTriggerCard:flowCard,getActionCard:flowCard,getConditionCard:flowCard},settings:{get:()=>null,set:noop,on:noop},i18n:{getLanguage:()=>'en'},__:(k)=>String(k),drivers:{getDriver:()=>this.driver,getDrivers:()=>({})},clock:{getTimezone:()=>'Europe/Paris'},notifications:{createNotification:async()=>{}},api:{realtime:noop},zigbee:{getNetwork:async()=>({})}};}
 log(){} error(){} debug(){}
 getData(){return{id:this._id}} getName(){return this._id} getId(){return this._id} getDriver(){return this.driver}
 getCapabilities(){return Object.keys(this._caps)} hasCapability(c){return c in this._caps} async addCapability(c){this._caps[c]=null} async removeCapability(c){delete this._caps[c]}
 getCapabilityValue(c){return this._caps[c]} async setCapabilityValue(c,v){this._caps[c]=v} async setCapabilityOptions(){} getCapabilityOptions(){return{}}
 registerCapabilityListener(){} registerMultipleCapabilityListener(){}
 getSetting(k){return this._settings[k]} getSettings(){return this._settings} async setSettings(s){Object.assign(this._settings,s)}
 getStoreValue(k){return this._store[k]} async setStoreValue(k,v){this._store[k]=v} async unsetStoreValue(k){delete this._store[k]} getStore(){return this._store}
 getAvailable(){return true} async setAvailable(){} async setUnavailable(){} async setWarning(){} async unsetWarning(){}
 getClass(){return 'socket'} async setClass(){} getEnergy(){return{}} async setEnergy(){}
 isFirstInit(){return false} getAppId(){return "x"} printNode(){} getManufacturerName(){return this._settings.manufacturerName} registerCapability(){} configureAttributeReporting(){return Promise.resolve()} async onNodeInit(){} }
function mkCluster(name){const c=new EE();c.name=name;c.readAttributes=async()=>({});c.writeAttributes=async()=>({});c.configureReporting=async()=>({});c.bind=async()=>{};c.setOn=async()=>{};c.setOff=async()=>{};c.toggle=async()=>{};c.command=async()=>{};c.dataQuery=async()=>{};c.datapoint=async()=>{};return c}
function mkNode(){const clusters={basic:mkCluster('basic'),onOff:mkCluster('onOff'),powerConfiguration:mkCluster('powerConfiguration'),tuya:mkCluster('tuya'),groups:mkCluster('groups')};const ep={clusters,bind:noop,clusterId:1};return{endpoints:{1:ep},manufacturerName:'_TZ3000_test',modelId:'TS0001',handleFrame:async()=>{},sendFrame:async()=>{}}}
const orig=Module._load;
Module._load=function(req,parent,m){
 if(req==='homey')return{Device:SimpleDevice,Driver:class{},App:class{},SimpleClass:class{}};
 if(req==='homey-zigbeedriver')return{ZigBeeDevice:SimpleDevice,ZigBeeDriver:class{},ZigBeeLightDevice:SimpleDevice,ZigBeeXYLightDevice:SimpleDevice,debug:noop,Util:{mapValueRange:(a,b,c,d,v)=>v}};
 return orig.call(this,req,parent,m)};
process.chdir(root);
const MB=()=>{global.gc();global.gc();return +(process.memoryUsage().heapUsed/1048576).toFixed(1)};
const DRV=(process.env.DRV||'switch_1gang,switch_2gang,button_wireless_4,climate_sensor,plug_energy_monitor').split(',').filter(d=>fs.existsSync(path.join(root,'drivers',d,'device.js')));

const evErr={};function EV(d,x){const m=(d.driver&&d.driver.id)+': '+String(x&&x.message).slice(0,90);evErr[m]=(evErr[m]||0)+1}
process.on('unhandledRejection',x=>{const m='UR: '+String(x&&x.message).slice(0,90)+' @'+String(x&&x.stack).split('\n').slice(1,3).join(' ').replace(/\s+/g,' ').replace(root,'');evErr[m]=(evErr[m]||0)+1});process.on('uncaughtException',x=>{const m='UE: '+String(x&&x.message).slice(0,90)+' '+String(x&&x.stack).split('\n')[1];evErr[m]=(evErr[m]||0)+1});
(async()=>{
 const classes=DRV.map(d=>{try{return require(path.join(root,'drivers',d,'device.js'))}catch(e){console.error('LOADFAIL',d,e.message);return null}});
 const h0=MB();const out={drivers:DRV,N,E,C,loaded:h0,cycles:[]};const refs=[];const initErrs={};
 for(let c=0;c<C;c++){
  const devs=[];
  for(let i=0;i<N;i++){const k=i%classes.length;const D=classes[k];if(!D)continue;const d=new D(`dev-${c}-${i}`,DRV[k]);devs.push(d);refs.push([DRV[k],new WeakRef(d)]);
   try{await Promise.race([d.onNodeInit({zclNode:mkNode()}),new Promise(r=>setTimeout(r,150))])}catch(e){const m=DRV[k]+': '+String(e&&e.message).slice(0,80);initErrs[m]=(initErrs[m]||0)+1}}
  await new Promise(r=>setTimeout(r,200));const hi=MB();
  const FL=+process.env.FLOOD||1;out.flood=out.flood||[];for(let b=0;b<FL;b++){
  for(let e=0;e<E;e++)for(const d of devs){const z=d.zclNode;if(!z)continue;const on=z.endpoints?.[1]?.clusters?.onOff;try{if(on)on.emit('attr.onOff',e%2===0)}catch(x){EV(d,x)}const t=z.endpoints?.[1]?.clusters?.tuya;if(t){try{t.emit('response',{dp:(e%20)+1,datatype:2,data:Buffer.from([0,0,(e>>8)&255,e&255]),seq:(b*E+e)&0xffff});t.emit('reporting',{dp:1,datatype:1,data:Buffer.from([e%2])})}catch(x){EV(d,x)}}}
  await new Promise(r=>setTimeout(r,300));if(FL>1){out.flood.push(MB());if(process.env.INTRO&&(b===0||b===FL-1))(out.intro=out.intro||[]).push(p3065Collections(devs));}}
  const he=MB();
  for(const d of devs){try{await d.onDeleted?.()}catch(e){}try{await d.onUninit?.()}catch(e){}}
  devs.length=0;await new Promise(r=>setTimeout(r,300));const hd=MB();
  const alive={};for(const [n,w] of refs){if(w.deref())alive[n]=(alive[n]||0)+1}
  out.cycles.push({afterInit:hi,afterEvents:he,afterDelete:hd,aliveDevices:alive,timersLeft:[...timers].filter(t=>!t._destroyed).length});
 }
 out.initErrs=initErrs;out.evErr=evErr;
 out.timerSrc=Object.entries([...timers].filter(t=>!t._destroyed).reduce((a,t)=>(a[t._src]=(a[t._src]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]).slice(0,8);
 if(process.env.SNAP)out.snap=v8.writeHeapSnapshot(process.env.SNAP);
 fs.writeFileSync(process.env.OUT||"/workspace/p3065/out.json",JSON.stringify(out,null,1));process.exit(0);
})();
