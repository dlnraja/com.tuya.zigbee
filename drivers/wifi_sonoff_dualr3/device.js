'use strict';
const E=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends E{
  get stateMappings(){return{
    switch_0:{capability:'onoff',transform:v=>v==='on'},
    switch_1:{capability:'onoff.2',transform:v=>v==='on'},
    current:{capability:'measure_current',smartDivisor: true},
    voltage:{capability:'measure_voltage',smartDivisor: true},
    actPow:{capability:'measure_power',smartDivisor: true}
  };}
  async _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{ if (typeof this.markAppCommand === 'function') {this.markAppCommand(1, v);}await this._client.setSwitch(v,0);});
    if(this.hasCapability('onoff.2')){this.registerCapabilityListener('onoff.2',async v=>{await this._client.setSwitch(v,1);});}
  }
  async onInit(){
    for(const c of['onoff.2','measure_power','measure_voltage','measure_current']){if(!this.hasCapability(c)){await this.addCapability(c).catch(() => { });}}
    await super.onInit(); }


  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}
module.exports = D;
