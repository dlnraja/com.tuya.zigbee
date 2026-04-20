'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const EweLinkLocalDevice=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends EweLinkLocalDevice{
  get stateMappings(){return{
    switch:{capability:'onoff',transform:v=>v==='on'},
    brightness:{capability:'dim',transform:v=>safeParse(v, 100)},
    colorR:{capability:null},colorG:{capability:null},colorB:{capability:null},
    mode:{capability:null}
  };}
  _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v);});
    this.registerCapabilityListener('dim',async v=>{await this._client._send('/zeroconf/dimmable',{brightness:Math.round(safeMultiply(v)});});
  }
  async onInit(){
    if(!this.hasCapability('dim'))try{await this.addCapability('dim');}catch(e){}
    await super.onInit();
    this.log('[EWE-LED] Ready - L1/L2 LED Strip');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports=D;
