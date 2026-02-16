const fs=require('fs'),p=require('path'),B=p.resolve('drivers');
const P=[{id:'configure',navigation:{next:'list_devices'}},{id:'list_devices',template:'list_devices',navigation:{prev:'configure'}},{id:'add_devices',template:'add_devices'}];
const R=[{id:'configure'}];
const S=[{type:'group',label:{en:'Tuya Local'},children:[{id:'device_id',type:'text',label:{en:'Device ID'},value:''},{id:'local_key',type:'text',label:{en:'Local Key'},value:''},{id:'ip',type:'text',label:{en:'IP'},value:''},{id:'protocol_version',type:'dropdown',label:{en:'Protocol'},value:'3.3',values:[{id:'3.1',label:{en:'3.1'}},{id:'3.3',label:{en:'3.3'}},{id:'3.4',label:{en:'3.4'}},{id:'3.5',label:{en:'3.5'}}]}]}];
module.exports=function(id,n,c,caps,co){
const o={name:{en:n},class:c,capabilities:caps,pair:P,repair:R,settings:S,images:{small:'drivers/'+id+'/assets/images/small.png',large:'drivers/'+id+'/assets/images/large.png'},platforms:['local'],connectivity:['lan']};
if(co)o.capabilitiesOptions=co;
fs.writeFileSync(p.join(B,id,'driver.compose.json'),JSON.stringify(o,null,2));
console.log(id);};
