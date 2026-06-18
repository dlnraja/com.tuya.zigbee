'use strict';
const E=require('../../lib/ewelink-local/EweLinkLocalDevice');
class D extends E{
  get stateMappings(){return{switch:{capability:'onoff',transform:v=>v==='on'}};}
  _registerCapListeners(){this.registerCapabilityListener('onoff',async v=>{ if (typeof this.markAppCommand === 'function') {this.markAppCommand(1, v);}await this._client.setSwitch(v);});}
  async onDeleted(){if(this._destroyed)return;this._destroyed=true;await super.onDeleted();}
}
module.exports = D;
