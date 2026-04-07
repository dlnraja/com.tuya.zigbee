'use strict';

const {Driver}=require('homey');

class SmartRemote4ButtonsDriver extends Driver{
  async onInit(){this.log('smart_remote_4_buttons driver init');}
}

module.exports=SmartRemote4ButtonsDriver;
