const fs=require('fs'),p=require('path'),B=p.resolve('drivers');
function w(f,c){fs.writeFileSync(p.join(B,f),c);console.log(f);}

w('wifi_siren/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
'13':{capability:'alarm_generic',transform:v=>!!v},
}}}
module.exports=D;
`);

w('wifi_garage_door/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'garagedoor_closed',writable:true,transform:v=>!v,reverseTransform:v=>!v},
}}}
module.exports=D;
`);

w('wifi_door_lock/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'locked',transform:v=>!!v},
'4':{capability:'measure_battery',transform:v=>v},
}}}
module.exports=D;
`);
console.log('security done');
