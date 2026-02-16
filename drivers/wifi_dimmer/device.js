'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
'2':{capability:'dim',writable:true,transform:v=>(v-10)/990,reverseTransform:v=>Math.round(v*990+10)},
}}}
module.exports=D;
