'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
'6':{capability:'measure_humidity',transform:v=>v},
}}}
module.exports=D;
