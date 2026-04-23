'use strict';
const EweLinkLocalDevice=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends EweLinkLocalDevice{
  get stateMappings(){return{
    switch_0:{capability:'onoff',transform:v=>v==='on'},
    switch_1:{capability:'onoff.2',transform:v=>v==='on'}
  };}
  _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v,0);
      });
    if(this.hasCapability('onoff.2'))this.registerCapabilityListener('onoff.2',async v=>{await this._client.setSwitch(v,1);
      });
  }
  async onInit(){
    if(!this.hasCapability('onoff.2'))try{await this.addCapability('onoff.2');}catch(e){}
    await super.onInit();
    this.log('[EWE-SWITCH-2CH] Ready - DUAL R3/TX T2');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports=D;
