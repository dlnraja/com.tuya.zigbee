const fs=require('fs'),p=require('path'),B=p.resolve('drivers');
function w(id,o){fs.writeFileSync(p.join(B,id,'driver.flow.compose.json'),JSON.stringify(o,null,2));console.log(id);}

w('wifi_sensor',{triggers:[{id:'wifi_sensor_temp_changed',title:{en:'Temperature changed'},tokens:[{name:'temperature',type:'number',title:{en:'Temperature'}}]},{id:'wifi_sensor_hum_changed',title:{en:'Humidity changed'},tokens:[{name:'humidity',type:'number',title:{en:'Humidity'}}]}],conditions:[],actions:[]});

w('wifi_water_valve',{triggers:[],conditions:[],actions:[]});
w('wifi_air_purifier',{triggers:[],conditions:[],actions:[]});
w('wifi_ir_remote',{triggers:[],conditions:[],actions:[]});
w('wifi_pet_feeder',{triggers:[],conditions:[],actions:[]});
w('wifi_door_lock',{triggers:[{id:'wifi_lock_locked',title:{en:'Locked'}},{id:'wifi_lock_unlocked',title:{en:'Unlocked'}}],conditions:[{id:'wifi_lock_is_locked',title:{en:'Is locked'}}],actions:[]});
w('wifi_robot_vacuum',{triggers:[],conditions:[],actions:[]});
console.log('batch3');
