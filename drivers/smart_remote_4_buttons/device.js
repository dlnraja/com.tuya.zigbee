'use strict';

const{ZigBeeDevice}=require('homey-zigbeedriver');

class SmartRemote4ButtonsDevice extends ZigBeeDevice{
  async onNodeInit({zclNode}){
    this.log('[SMART_REMOTE_4_BUTTONS] init');
    // Gang 1
    if(zclNode.endpoints[1]&&zclNode.endpoints[1].clusters){
      const ep1=zclNode.endpoints[1].clusters;
      if(ep1.scenes){ep1.scenes.on('recall',(gId,sId)=>{this.log('[SMART_REMOTE_4_BUTTONS] g1 scene:',gId,sId);});}
      if(ep1.onOff){ep1.onOff.on('attr.onOff',(v)=>{this.log('[SMART_REMOTE_4_BUTTONS] g1 onOff:',v);});}
    }
    // Gang 2
    if(zclNode.endpoints[2]&&zclNode.endpoints[2].clusters){
      const ep2=zclNode.endpoints[2].clusters;
      if(ep2.scenes){ep2.scenes.on('recall',(gId,sId)=>{this.log('[SMART_REMOTE_4_BUTTONS] g2 scene:',gId,sId);});}
      if(ep2.onOff){ep2.onOff.on('attr.onOff',(v)=>{this.log('[SMART_REMOTE_4_BUTTONS] g2 onOff:',v);});}
    }
    // Gang 3
    if(zclNode.endpoints[3]&&zclNode.endpoints[3].clusters){
      const ep3=zclNode.endpoints[3].clusters;
      if(ep3.scenes){ep3.scenes.on('recall',(gId,sId)=>{this.log('[SMART_REMOTE_4_BUTTONS] g3 scene:',gId,sId);});}
      if(ep3.onOff){ep3.onOff.on('attr.onOff',(v)=>{this.log('[SMART_REMOTE_4_BUTTONS] g3 onOff:',v);});}
    }
    // Gang 4
    if(zclNode.endpoints[4]&&zclNode.endpoints[4].clusters){
      const ep4=zclNode.endpoints[4].clusters;
      if(ep4.scenes){ep4.scenes.on('recall',(gId,sId)=>{this.log('[SMART_REMOTE_4_BUTTONS] g4 scene:',gId,sId);});}
      if(ep4.onOff){ep4.onOff.on('attr.onOff',(v)=>{this.log('[SMART_REMOTE_4_BUTTONS] g4 onOff:',v);});}
    }
    this.log('[SMART_REMOTE_4_BUTTONS] ready');
  }
}

module.exports=SmartRemote4ButtonsDevice;
