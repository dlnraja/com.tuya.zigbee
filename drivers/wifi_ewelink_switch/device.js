'use strict';
const EweLinkLocalDevice=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends EweLinkLocalDevice{
  get stateMappings(){return{switch:{capability:'onoff',transform:v=>v==='on'}};}
  _registerCapListeners(){
    if(this.hasCapability('onoff'))this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v);
      });
  }
  async onInit(){await super.onInit();this.log('[EWE-SWITCH] Ready - BASIC/MINI/RF/SV/R4/R5');}
}
module.exports=D;
