'use strict';

const {Driver}=require('homey');

class SmartRemote1ButtonDriver extends Driver{
  async onInit(){this.log('smart_remote_1_button driver init');}
}

module.exports=SmartRemote1ButtonDriver;
