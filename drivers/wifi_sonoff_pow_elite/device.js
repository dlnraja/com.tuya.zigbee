'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const E=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends E{
  get stateMappings(){return{
    switch:{capability:'onoff',transform:v=>v==='on'},
    power:{capability:'measure_power',divisor:1},
    voltage:{capability:'measure_voltage',divisor:100},
    current:{capability:'measure_current',divisor:1000}
  };}
  _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v);
      });
  }
  async onInit(){
    for(const c of['measure_power','measure_voltage','measure_current','meter_power'])if(!this.hasCapability(c))await this.addCapability(c).catch(()=>{});
    await super.onInit();
  }
  _processState(data){
    super._processState(data);
    if(data.oneKwh!==undefined&&this.hasCapability('meter_power')){
      safeParse(this.setCapabilityValue('meter_power',parseFloat(data.oneKwh) * 100)).catch(()=>{});
    }
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports=D;
