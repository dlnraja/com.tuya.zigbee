'use strict';

const TuyaZigbeeDriver = require('../../lib/TuyaZigbeeDriver');

class FingerbotDriver extends TuyaZigbeeDriver {

  onInit() {
    super.onInit();
    this.log('Fingerbot driver initialized');
  }

}

module.exports = FingerbotDriver;
