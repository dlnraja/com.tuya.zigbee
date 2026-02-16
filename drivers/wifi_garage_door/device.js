'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'garagedoor_closed',writable:true,transform:v=>!v,reverseTransform:v=>!v},
}}}
module.exports=D;
