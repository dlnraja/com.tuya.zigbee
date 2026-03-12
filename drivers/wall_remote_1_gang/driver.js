'use strict';

const {Driver}=require('homey');

class WallRemote1GangDriver extends Driver{
  async onInit(){this.log('wall_remote_1_gang driver init');}
}

module.exports=WallRemote1GangDriver;
