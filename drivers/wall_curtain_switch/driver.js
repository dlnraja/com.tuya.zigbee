'use strict';

const {Driver}=require('homey');

class WallCurtainSwitchDriver extends Driver{
  async onInit(){this.log('wall_curtain_switch driver init');}
}

module.exports=WallCurtainSwitchDriver;
