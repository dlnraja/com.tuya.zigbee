'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
'3':{capability:'dim',writable:true,transform:v=>v/100,reverseTransform:v=>Math.round(v*100)},
}}}
module.exports=D;
