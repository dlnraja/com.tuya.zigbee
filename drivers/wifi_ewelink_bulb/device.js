'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const EweLinkLocalDevice=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends EweLinkLocalDevice{
  get stateMappings(){return{
    switch:{capability:'onoff',transform:v=>v==='on'},
    brightness:{capability:'dim',transform:v=>safeParse(v, 100)},
    colorTemp:{capability:'light_temperature',transform:v=>safeParse(v, 255)}
  };}
  _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v);});
    this.registerCapabilityListener('dim',async v=>{await this._client._send('/zeroconf/dimmable',{brightness:Math.round(safeMultiply(v, 100))});});
    if(this.hasCapability('light_temperature'))this.registerCapabilityListener('light_temperature',async v=>{await this._client._send('/zeroconf/colorTemp',{colorTemp:Math.round(safeMultiply(v, 255))});});
  }
  async onInit(){
    for(const c of['dim','light_temperature'])if(!this.hasCapability(c))try{await this.addCapability(c);}catch(e){}
    await super.onInit();
    this.log('[EWE-BULB] Ready - B02/B05');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports=D;
