'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const EweLinkLocalDevice=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends EweLinkLocalDevice{
  get stateMappings(){return{switch:{capability:'onoff',transform:v=>v==='on'}};}
  _registerCapListeners(){
    if(this.hasCapability('onoff')){this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v);
      });}
  }
  async onInit(){await super.onInit();this.log('[EWE-SWITCH] Ready - BASIC/MINI/RF/SV/R4/R5');}
  async onDeleted(){if(this._destroyed){return;}this._destroyed=true;await super.onDeleted();}
}
module.exports=D;
return module.exports;
});
