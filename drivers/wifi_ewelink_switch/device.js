'use strict';
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const EweLinkLocalDevice=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends PhysicalButtonMixin(VirtualButtonMixin(EweLinkLocalDevice)) {

  get mainsPowered() { return true; }
  get stateMappings(){return{switch:{capability:'onoff',transform:v=>v==='on'}};}
  _registerCapListeners(){
    if(this.hasCapability('onoff'))this.registerCapabilityListener('onoff',async v=>{ if (typeof this.markAppCommand === 'function') this.markAppCommand(1, v);await this._client.setSwitch(v);});
  }
  async onInit(){await super.onInit();this.log('[EWE-SWITCH] Ready - BASIC/MINI/RF/SV/R4/R5');}
}
module.exports = D;
