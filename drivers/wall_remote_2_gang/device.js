'use strict';

const{ZigBeeDevice}=require('homey-zigbeedriver');

class WallRemote2GangDevice extends ZigBeeDevice{
  async onNodeInit({zclNode}){
    this.log('[WALL_REMOTE_2_GANG] init');
    // Gang 1
    if(zclNode.endpoints[1]&&zclNode.endpoints[1].clusters){
      const ep1=zclNode.endpoints[1].clusters;
      if(ep1.scenes){ep1.scenes.on('recall',(gId,sId)=>{this.log('[WALL_REMOTE_2_GANG] g1 scene:',gId,sId);});}
      if(ep1.onOff){ep1.onOff.on('attr.onOff',(v)=>{this.log('[WALL_REMOTE_2_GANG] g1 onOff:',v);});}
    }
    // Gang 2
    if(zclNode.endpoints[2]&&zclNode.endpoints[2].clusters){
      const ep2=zclNode.endpoints[2].clusters;
      if(ep2.scenes){ep2.scenes.on('recall',(gId,sId)=>{this.log('[WALL_REMOTE_2_GANG] g2 scene:',gId,sId);});}
      if(ep2.onOff){ep2.onOff.on('attr.onOff',(v)=>{this.log('[WALL_REMOTE_2_GANG] g2 onOff:',v);});}
    }
    this.log('[WALL_REMOTE_2_GANG] ready');
  }
}

module.exports=WallRemote2GangDevice;
