'use strict';
const EweLinkLocalDevice=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends EweLinkLocalDevice{
  get stateMappings(){return{switch:{capability:'onoff',transform:v=>v==='on'}};}
  _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v);
      });
  }
  async onInit(){await super.onInit();this.log('[EWE-PLUG] Ready - S20/S26/S26R2');}
}
module.exports=D;
