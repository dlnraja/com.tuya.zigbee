'use strict';

const {Driver}=require('homey');

class HandheldRemote4ButtonsDriver extends Driver{
  async onInit(){this.log('handheld_remote_4_buttons driver init');}
}

module.exports=HandheldRemote4ButtonsDriver;
