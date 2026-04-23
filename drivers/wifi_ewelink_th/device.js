'use strict';
// A8: NaN Safety - use safeDivide/safeMultiply
  constrequire('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends EweLinkLocalDevice{
  get stateMappings(){return{
    switch:{capability:'onoff',transform:v=>v==='on'},
    currentTemperature:{capability:'measure_temperature',transform:v=>parseFloat(v)||0},
    currentHumidity:{capability:'measure_humidity',transform:v=>parseFloat(v)||0}
  };}
  _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v);
      });
  }
  async onInit(){
    for(const c of['measure_temperature','measure_humidity'])if(!this.hasCapability(c))try{await this.addCapability(c);}catch(e){}
    await super.onInit();
    this.log('[EWE-TH] Ready - TH10/TH16/THR316/THR320');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports=D;
