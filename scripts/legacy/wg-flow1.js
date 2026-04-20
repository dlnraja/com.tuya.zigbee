const fs=require('fs'),p=require('path'),B=p.resolve('drivers');
function w(id,o){fs.writeFileSync(p.join(B,id,'driver.flow.compose.json'),JSON.stringify(o,null,2));console.log(id);}

w('wifi_switch',{triggers:[{id:'wifi_switch_turned_on',title:{en:'Turned on'}},{id:'wifi_switch_turned_off',title:{en:'Turned off'}}],conditions:[{id:'wifi_switch_is_on',title:{en:'Is on'}}],actions:[{id:'wifi_switch_toggle',title:{en:'Toggle on/off'}}]});

w('wifi_switch_2gang',{triggers:[{id:'wifi_switch_2gang_g1_on',title:{en:'Gang 1 turned on'}},{id:'wifi_switch_2gang_g1_off',title:{en:'Gang 1 turned off'}},{id:'wifi_switch_2gang_g2_on',title:{en:'Gang 2 turned on'}},{id:'wifi_switch_2gang_g2_off',title:{en:'Gang 2 turned off'}}],conditions:[{id:'wifi_switch_2gang_g1_is_on',title:{en:'Gang 1 is on'}},{id:'wifi_switch_2gang_g2_is_on',title:{en:'Gang 2 is on'}}],actions:[]});

w('wifi_switch_3gang',{triggers:[],conditions:[],actions:[]});
w('wifi_switch_4gang',{triggers:[],conditions:[],actions:[]});

w('wifi_plug',{triggers:[{id:'wifi_plug_turned_on',title:{en:'Turned on'}},{id:'wifi_plug_turned_off',title:{en:'Turned off'}}],conditions:[{id:'wifi_plug_is_on',title:{en:'Is on'}}],actions:[]});

w('wifi_dimmer',{triggers:[{id:'wifi_dimmer_turned_on',title:{en:'Turned on'}},{id:'wifi_dimmer_turned_off',title:{en:'Turned off'}}],conditions:[],actions:[]});
console.log('batch1');
