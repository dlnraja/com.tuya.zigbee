'use strict';

const {Driver}=require('homey');

class SmartButtonSwitchDriver extends Driver{
  async onInit(){this.log('smart_button_switch driver init');}
}

module.exports=SmartButtonSwitchDriver;
