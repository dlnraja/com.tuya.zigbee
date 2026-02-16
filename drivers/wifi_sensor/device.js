'use strict';
const TuyaLocalDevice=require('../../lib/tuya-local/TuyaLocalDevice');
class D extends TuyaLocalDevice{
get dpMappings(){return{
'1':{capability:'measure_temperature',transform:v=>v/10},
'2':{capability:'measure_humidity',transform:v=>v},
'4':{capability:'measure_battery',transform:v=>v},
}}}
module.exports=D;
