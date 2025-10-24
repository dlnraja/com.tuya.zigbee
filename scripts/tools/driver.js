#!/usr/bin/env node
'use strict';

'use strict';

const Homey = require('homey');

class MyDriver extends Homey.Driver {
  async onInit() {
    this.log('{{DRIVER_ID}} has been initialized');
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = MyDriver;
