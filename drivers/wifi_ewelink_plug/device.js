'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const EweLinkLocalDevice=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends EweLinkLocalDevice{
  get stateMappings(){return{switch:{capability:'onoff',transform:v=>v==='on'}};}
  _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v);
      });
  }
  async onInit(){await super.onInit();this.log('[EWE-PLUG] Ready - S20/S26/S26R2');}
  async onDeleted(){if(this._destroyed){return;}this._destroyed=true;await super.onDeleted();}
}
module.exports=D;
return module.exports;
});
