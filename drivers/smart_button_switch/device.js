'use strict';

const{ZigBeeDevice}=require('homey-zigbeedriver');

class SmartButtonSwitchDevice extends ZigBeeDevice{
  async onNodeInit({zclNode}){
    this.log('[SMART_BUTTON_SWITCH] init');
    // Gang 1
    if(zclNode.endpoints[1]&&zclNode.endpoints[1].clusters){
      const ep1=zclNode.endpoints[1].clusters;
      if(ep1.scenes){ep1.scenes.on('recall',(gId,sId)=>{this.log('[SMART_BUTTON_SWITCH] g1 scene:',gId,sId);});}
      if(ep1.onOff){ep1.onOff.on('attr.onOff',(v)=>{this.log('[SMART_BUTTON_SWITCH] g1 onOff:',v);});}
    }
    this.log('[SMART_BUTTON_SWITCH] ready');
  }
}

module.exports=SmartButtonSwitchDevice;
