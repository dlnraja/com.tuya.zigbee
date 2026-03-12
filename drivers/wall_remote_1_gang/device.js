'use strict';

const{ZigBeeDevice}=require('homey-zigbeedriver');

class WallRemote1GangDevice extends ZigBeeDevice{
  async onNodeInit({zclNode}){
    this.log('[WALL_REMOTE_1_GANG] init');
    // Gang 1
    if(zclNode.endpoints[1]&&zclNode.endpoints[1].clusters){
      const ep1=zclNode.endpoints[1].clusters;
      if(ep1.scenes){ep1.scenes.on('recall',(gId,sId)=>{this.log('[WALL_REMOTE_1_GANG] g1 scene:',gId,sId);});}
      if(ep1.onOff){ep1.onOff.on('attr.onOff',(v)=>{this.log('[WALL_REMOTE_1_GANG] g1 onOff:',v);});}
    }
    this.log('[WALL_REMOTE_1_GANG] ready');
  }
}

module.exports=WallRemote1GangDevice;
