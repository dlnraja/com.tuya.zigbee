'use strict';
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const EweLinkLocalDevice=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends PhysicalButtonMixin(VirtualButtonMixin(EweLinkLocalDevice)) {

  get mainsPowered() { return true; }
  get stateMappings(){return{switch:{capability:'onoff',transform:v=>v==='on'}};}
  _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{ if (typeof this.markAppCommand === 'function') this.markAppCommand(1, v);await this._client.setSwitch(v);});
  }
  async onInit(){await super.onInit();this.log('[EWE-PLUG] Ready - S20/S26/S26R2');}
}
module.exports = D;
