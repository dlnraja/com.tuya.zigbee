'use strict';
const E=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends E{
  get stateMappings(){return{
    switch:{capability:'onoff',transform:v=>v==='on'},
    currentTemperature:{capability:'measure_temperature',divisor:1},
    currentHumidity:{capability:'measure_humidity',divisor:1},
    deviceType:{capability:null,internal:'deviceType'},
    mainSwitch:{capability:null,internal:'mainSwitch'},
    targets:{capability:null,internal:'targets'}
  };}
  _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v);});
    if(this.hasCapability('target_temperature'))this.registerCapabilityListener('target_temperature',async v=>{await this._client._send('/zeroconf/deviceStatus',{targets:[{targetHigh:String(v)}]});});
  }
  async onInit(){
    for(const c of['measure_temperature','measure_humidity','target_temperature'])if(!this.hasCapability(c))await this.addCapability(c).catch(()=>{});
    await super.onInit();
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports=D;
