const fs=require('fs'),p=require('path'),B=p.resolve('drivers');
function w(f,c){fs.writeFileSync(p.join(B,f),c);console.log(f);}

w('wifi_thermostat/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
'2':{capability:'target_temperature',writable:true,transform:v=>v/10,reverseTransform:v=>Math.round(v*10)},
'3':{capability:'measure_temperature',transform:v=>v/10},
}}}
module.exports=D;
`);

w('wifi_fan/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
'3':{capability:'dim',writable:true,transform:v=>v/100,reverseTransform:v=>Math.round(v*100)},
}}}
module.exports=D;
`);

w('wifi_humidifier/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
'6':{capability:'measure_humidity',transform:v=>v},
}}}
module.exports=D;
`);
console.log('climate done');
