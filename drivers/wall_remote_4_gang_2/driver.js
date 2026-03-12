'use strict';

const {Driver}=require('homey');

class WallRemote4Gang2Driver extends Driver{
  async onInit(){this.log('wall_remote_4_gang_2 driver init');}
}

module.exports=WallRemote4Gang2Driver;
