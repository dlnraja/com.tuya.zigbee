'use strict';
const EweLinkLocalDevice=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends EweLinkLocalDevice{
  get stateMappings(){return{
    switch_0:{capability:'onoff',transform:v=>v==='on'},
    switch_1:{capability:'onoff.2',transform:v=>v==='on'},
    switch_2:{capability:'onoff.3',transform:v=>v==='on'},
    switch_3:{capability:'onoff.4',transform:v=>v==='on'}
  };}
  _registerCapListeners(){
    this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v,0);
      });
    if(this.hasCapability('onoff.2'))this.registerCapabilityListener('onoff.2',async v=>{await this._client.setSwitch(v,1);
      });
    if(this.hasCapability('onoff.3'))this.registerCapabilityListener('onoff.3',async v=>{await this._client.setSwitch(v,2);
      });
    if(this.hasCapability('onoff.4'))this.registerCapabilityListener('onoff.4',async v=>{await this._client.setSwitch(v,3);
      });
  }
  async onInit(){
    for(const c of['onoff.2','onoff.3','onoff.4'])if(!this.hasCapability(c))try{await this.addCapability(c);}catch(e){}
    await super.onInit();
    this.log('[EWE-SWITCH-4CH] Ready - 4CH Pro R3');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports=D;
