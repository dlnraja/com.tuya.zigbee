'use strict';

const {Driver}=require('homey');

class SmartRemote1Button2Driver extends Driver{
  async onInit(){this.log('smart_remote_1_button_2 driver init');}
}

module.exports=SmartRemote1Button2Driver;
