'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
'2':{capability:'target_temperature',writable:true,transform:v=>v/10,reverseTransform:v=>Math.round(v*10)},
'3':{capability:'measure_temperature',transform:v=>v/10},
}}}
module.exports=D;
