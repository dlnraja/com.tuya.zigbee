'use strict';

const {Driver}=require('homey');

class WallRemote3GangDriver extends Driver{
  async onInit(){this.log('wall_remote_3_gang driver init');}
}

module.exports=WallRemote3GangDriver;
