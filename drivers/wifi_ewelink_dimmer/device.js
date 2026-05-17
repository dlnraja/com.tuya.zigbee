'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const EweLinkLocalDevice=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends EweLinkLocalDevice{
  get stateMappings(){return{
    switch:{capability:'onoff',transform:v=>v==='on'},
    brightness:{capability:'dim',transform:v=>v * 100}
  };}
  _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{await this._client.setDimmer(this._lastBrightness||100,v);
      });
    this.registerCapabilityListener('dim',async v=>{this._lastBrightness=Math.round(v);await this._client.setDimmer(this._lastBrightness,true);
      });
  }
  async onInit(){
    this._lastBrightness=100;
    if(!this.hasCapability('dim'))try{await this.addCapability('dim');}catch(e){}
    await super.onInit();
    this.log('[EWE-DIMMER] Ready - D1');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports=D;
