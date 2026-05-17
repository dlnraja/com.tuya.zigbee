'use strict';
const E=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends E{
  get stateMappings(){return{switch_0:{capability:'onoff',transform:v=>v==='on'},switch_1:{capability:'onoff.2',transform:v=>v==='on'},switch_2:{capability:'onoff.3',transform:v=>v==='on'}};}
  _registerCapListeners(){this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v,0);
      });if(this.hasCapability('onoff.2'))this.registerCapabilityListener('onoff.2',async v=>{await this._client.setSwitch(v,1);
      });if(this.hasCapability('onoff.3'))this.registerCapabilityListener('onoff.3',async v=>{await this._client.setSwitch(v,2);
      });}
  async onInit(){for(const c of['onoff.2','onoff.3'])if(!this.hasCapability(c))await this.addCapability(c).catch(()=>{});await super.onInit();}


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports=D;
