const fs=require('fs'),p=require('path'),B=p.resolve('drivers');
function w(f,c){fs.writeFileSync(p.join(B,f),c);console.log(f);}

w('wifi_sensor/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'measure_temperature',transform:v=>v/10},
'2':{capability:'measure_humidity',transform:v=>v},
'4':{capability:'measure_battery',transform:v=>v},
}}}
module.exports=D;
`);

w('wifi_water_valve/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
}}}
module.exports=D;
`);

w('wifi_air_purifier/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
}}}
module.exports=D;
`);

w('wifi_ir_remote/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
}}}
module.exports=D;
`);

w('wifi_pet_feeder/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
}}}
module.exports=D;
`);

w('wifi_robot_vacuum/device.js',`'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
const SM={standby:'stopped',cleaning:'cleaning',paused:'stopped'};
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
'3':{capability:'vacuumcleaner_state',transform:v=>SM[v]||'stopped'},
}}}
module.exports=D;
`);
console.log('misc done');
