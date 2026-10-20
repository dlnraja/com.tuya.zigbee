/* eslint-disable */
// P2915: simulated Homey load (N devices x E events) — node --expose-gc scripts/ci/load-heap-sim.js <root> [N] [E]; SNAP=file.heapsnapshot to dump
// P2915 load sim: N devices of common drivers, onNodeInit with mock zclNode, then E events each; heap snapshot.
const Module=require('module'),path=require('path'),fs=require('fs'),v8=require('v8'),EE=require('events');
const root=path.resolve(process.argv[2]);const N=+process.argv[3]||150,E=+process.argv[4]||200;
const timers=new Set();
const homeyT={setTimeout:(f,ms,...a)=>{const t=setTimeout(f,Math.min(ms,50),...a);t.unref();return t},clearTimeout,setInterval:(f,ms)=>{const t=setInterval(f,Math.max(ms,1000));t.unref();t._src=(new Error().stack.split('\n')[2]||'').trim().replace(root,'');timers.add(t);return t},clearInterval:(t)=>{timers.delete(t);clearInterval(t)}};
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
 registerCapability(){} configureAttributeReporting(){return Promise.resolve()} async onNodeInit(){} }
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
(async()=>{
 const classes=DRV.map(d=>require(path.join(root,'drivers',d,'device.js')));
 const h0=MB();const devs=[];let initErr=0;
 for(let i=0;i<N;i++){const k=i%classes.length;const D=classes[k];const d=new D(`dev-${i}`,DRV[k]);devs.push(d);
  try{await Promise.race([d.onNodeInit({zclNode:mkNode()}),new Promise(r=>setTimeout(r,200))])}catch(e){initErr++}}
 await new Promise(r=>setTimeout(r,300));const h1=MB();
 for(let e=0;e<E;e++){for(const d of devs){const n=d._lastNode;try{d.setCapabilityValue('onoff',e%2===0)}catch(_){}}
  for(const d of devs){for(const c of ['onOff','tuya']){try{/* emit attr reports + tuya frames */}catch(_){}}}}
 // emit via cluster listeners if bases attached them
 let emitted=0;
 for(let e=0;e<E;e++)for(const d of devs){const z=d.zclNode;if(!z)continue;const on=z.endpoints?.[1]?.clusters?.onOff;if(on){on.emit('attr.onOff',e%2===0);emitted++}const t=z.endpoints?.[1]?.clusters?.tuya;if(t){t.emit('response',{dp:1,datatype:1,data:Buffer.from([e%2])});t.emit('reporting',{dp:1,datatype:1,data:Buffer.from([e%2])});emitted++}}
 await new Promise(r=>setTimeout(r,500));const h2=MB();
 const snap=process.env.SNAP?v8.writeHeapSnapshot(process.env.SNAP):null;
 let delErr={};for(const d of devs){try{await d.onDeleted?.()}catch(e){delErr[String(e.message).slice(0,60)]=(delErr[String(e.message).slice(0,60)]||0)+1}}global.__delErr=delErr; devs.length=0;
 await new Promise(r=>setTimeout(r,300));const h3=MB();
 console.log(JSON.stringify({drivers:DRV,N,E,initErr,emitted,heap:{loaded:h0,afterInit:h1,afterEvents:h2,afterDelete:h3},timersLeft:[...timers].filter(t=>!t._destroyed).length,delErr:global.__delErr,timerSrc:Object.entries([...timers].filter(t=>!t._destroyed).reduce((a,t)=>(a[t._src]=(a[t._src]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]).slice(0,8),snap}));
 process.exit(0);
})();
