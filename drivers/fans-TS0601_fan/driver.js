const Homey = require('homey');

class Fans-TS0601_fanDriver extends Homey.Driver {
  async onInit() {
    this.log('Fans-TS0601_fan driver initialized');
  }
}

module.exports = Fans-TS0601_fanDriver;