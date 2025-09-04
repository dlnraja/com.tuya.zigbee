const Homey = require('homey');

class Fans-TS0602_fanDriver extends Homey.Driver {
  async onInit() {
    this.log('Fans-TS0602_fan driver initialized');
  }
}

module.exports = Fans-TS0602_fanDriver;