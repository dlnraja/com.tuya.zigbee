'use strict';

const {Driver}=require('homey');

class WallRemote2GangDriver extends Driver{
  async onInit(){this.log('wall_remote_2_gang driver init');}
}

module.exports=WallRemote2GangDriver;
