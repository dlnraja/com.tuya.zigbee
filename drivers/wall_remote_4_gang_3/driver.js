'use strict';

const {Driver}=require('homey');

class WallRemote4Gang3Driver extends Driver{
  async onInit(){this.log('wall_remote_4_gang_3 driver init');}
}

module.exports=WallRemote4Gang3Driver;
