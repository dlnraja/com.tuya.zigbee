'use strict';
const E=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends E{
  get stateMappings(){return{
    switch:{capability:'onoff',transform:v=>v==='on'},
    power:{capability:'measure_power',divisor:1},
    voltage:{capability:'measure_voltage',smartDivisor: true},
    current:{capability:'measure_current',smartDivisor: true}
  };}
  async _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{ if (typeof this.markAppCommand === 'function') {this.markAppCommand(1, v);}await this._client.setSwitch(v);});
  }
  async onInit(){
    for(const c of['measure_power','measure_voltage','measure_current','meter_power']){if(!this.hasCapability(c)){await this.addCapability(c).catch(() => { });}}
    await super.onInit(); }
  async _processState(data){
    super._processState(data);
    if(data.oneKwh!==undefined&&this.hasCapability('meter_power')){
      await this.setCapabilityValue('meter_power',parseFloat(data.oneKwh)/100).catch(()=>{});
    }
  }


  onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = D;
