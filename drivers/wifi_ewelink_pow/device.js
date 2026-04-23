'use strict';
const EweLinkLocalDevice=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends EweLinkLocalDevice{
  get stateMappings(){return{
    switch:{capability:'onoff',transform:v=>v==='on'},
    power:{capability:'measure_power',transform:v=>parseFloat(v)||0},
    voltage:{capability:'measure_voltage',transform:v=>parseFloat(v)||0},
    current:{capability:'measure_current',transform:v=>parseFloat(v)||0}
  };}
  _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v);
      });
  }
  async onInit(){
    for(const c of['measure_power','measure_voltage','measure_current'])if(!this.hasCapability(c))try{await this.addCapability(c);}catch(e){}
    await super.onInit();
    this.log('[EWE-POW] Ready - S31/S40/POW R2/R3/Elite');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports=D;
