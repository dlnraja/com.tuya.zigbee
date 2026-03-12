'use strict';

const {Driver}=require('homey');

class WallRemote4GangDriver extends Driver{
  async onInit(){this.log('wall_remote_4_gang driver init');}
}

module.exports=WallRemote4GangDriver;
