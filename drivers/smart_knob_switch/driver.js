'use strict';

const {Driver}=require('homey');

class SmartKnobSwitchDriver extends Driver{
  async onInit(){this.log('smart_knob_switch driver init');}
}

module.exports=SmartKnobSwitchDriver;
