'use strict';

const { Driver } = require('homey');

class SwitchWall7gangDriver extends Driver {
  
  async onInit() {
    this.log('Wall Switch 7-Gang driver has been initialized');
  }
}

module.exports = SwitchWall7gangDriver;
