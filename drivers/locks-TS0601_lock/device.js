const Homey = require('homey');

class Locks-TS0601_lockDriver extends Homey.Driver {
  async onInit() {
    this.log('Locks-TS0601_lock driver initialized');
  }
}

module.exports = Locks-TS0601_lockDriver;