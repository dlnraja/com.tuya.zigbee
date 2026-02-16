'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'20':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
'22':{capability:'dim',writable:true,transform:v=>(v-10)/990,reverseTransform:v=>Math.round(v*990+10)},
'23':{capability:'light_temperature',writable:true,transform:v=>v/1000,reverseTransform:v=>Math.round(v*1000)},
}}}
module.exports=D;
