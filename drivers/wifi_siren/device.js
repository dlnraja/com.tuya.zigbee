'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
'13':{capability:'alarm_generic',transform:v=>!!v},
}}}
module.exports=D;
