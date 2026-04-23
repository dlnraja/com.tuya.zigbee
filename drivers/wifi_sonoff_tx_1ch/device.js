'use strict';
const E=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends E{
  get stateMappings(){return{switch:{capability:'onoff',transform:v=>v==='on'}};}
  _registerCapListeners(){this.registerCapabilityListener('onoff',async v=>{await this._client.setSwitch(v);
      });}
}
module.exports=D;
