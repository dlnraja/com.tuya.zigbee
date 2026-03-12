'use strict';

const{ZigBeeDevice}=require('homey-zigbeedriver');

class SmartRemote1Button2Device extends ZigBeeDevice{
  async onNodeInit({zclNode}){
    this.log('[SMART_REMOTE_1_BUTTON_2] init');
    // Gang 1
    if(zclNode.endpoints[1]&&zclNode.endpoints[1].clusters){
      const ep1=zclNode.endpoints[1].clusters;
      if(ep1.scenes){ep1.scenes.on('recall',(gId,sId)=>{this.log('[SMART_REMOTE_1_BUTTON_2] g1 scene:',gId,sId);});}
      if(ep1.onOff){ep1.onOff.on('attr.onOff',(v)=>{this.log('[SMART_REMOTE_1_BUTTON_2] g1 onOff:',v);});}
    }
    this.log('[SMART_REMOTE_1_BUTTON_2] ready');
  }
}

module.exports=SmartRemote1Button2Device;
