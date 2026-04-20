const fs=require('fs'),p=require('path'),B=p.resolve('drivers');
function w(id,o){fs.writeFileSync(p.join(B,id,'driver.flow.compose.json'),JSON.stringify(o,null,2));console.log(id);}

w('wifi_light',{triggers:[{id:'wifi_light_turned_on',title:{en:'Turned on'}},{id:'wifi_light_turned_off',title:{en:'Turned off'}}],conditions:[],actions:[]});

w('wifi_cover',{triggers:[{id:'wifi_cover_opened',title:{en:'Opened'}},{id:'wifi_cover_closed',title:{en:'Closed'}}],conditions:[],actions:[{id:'wifi_cover_open',title:{en:'Open'}},{id:'wifi_cover_close',title:{en:'Close'}},{id:'wifi_cover_stop',title:{en:'Stop'}}]});

w('wifi_thermostat',{triggers:[{id:'wifi_thermostat_temp_changed',title:{en:'Temperature changed'},tokens:[{name:'temperature',type:'number',title:{en:'Temperature'}}]}],conditions:[],actions:[{id:'wifi_thermostat_set_temp',title:{en:'Set temperature'},args:[{name:'temperature',type:'range',min:5,max:35,step:0.5}]}]});

w('wifi_fan',{triggers:[],conditions:[],actions:[]});
w('wifi_humidifier',{triggers:[],conditions:[],actions:[]});

w('wifi_siren',{triggers:[{id:'wifi_siren_alarm_on',title:{en:'Alarm activated'}},{id:'wifi_siren_alarm_off',title:{en:'Alarm deactivated'}}],conditions:[],actions:[{id:'wifi_siren_activate',title:{en:'Activate siren'}},{id:'wifi_siren_deactivate',title:{en:'Deactivate siren'}}]});

w('wifi_garage_door',{triggers:[{id:'wifi_garage_opened',title:{en:'Garage opened'}},{id:'wifi_garage_closed',title:{en:'Garage closed'}}],conditions:[{id:'wifi_garage_is_open',title:{en:'Garage is open'}}],actions:[]});
console.log('batch2');
