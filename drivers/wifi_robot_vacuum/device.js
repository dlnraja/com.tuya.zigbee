'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
const SM={standby:'stopped',cleaning:'cleaning',paused:'stopped'};
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'onoff',writable:true,transform:v=>!!v,reverseTransform:v=>!!v},
'3':{capability:'vacuumcleaner_state',transform:v=>SM[v]||'stopped'},
}}}
module.exports=D;
