'use strict';

const {Driver}=require('homey');

class WallRemote6GangDriver extends Driver{
  async onInit(){this.log('wall_remote_6_gang driver init');}
}

module.exports=WallRemote6GangDriver;
