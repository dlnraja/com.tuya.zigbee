'use strict';

const { Driver } = require('homey');

class SwitchWall8gangDriver extends Driver {
  
  async onInit() {
    this.log('Wall Switch 8-Gang driver has been initialized');
  }
}

module.exports = SwitchWall8gangDriver;
