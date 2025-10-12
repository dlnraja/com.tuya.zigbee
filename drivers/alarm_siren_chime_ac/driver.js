'use strict';

const { Driver } = require('homey');

/**
 * Alarm Siren Chime Ac Driver
 */
class AlarmSirenChimeAcDriver extends Driver {

  async onInit() {
    this.log('alarm_siren_chime_ac driver initialized');
  }

}

module.exports = AlarmSirenChimeAcDriver;
