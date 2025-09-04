const Homey = require('homey');

class LockDriver extends Homey.Driver {
  async onInit() {
    this.log('Lock driver initialized');
  }
}

module.exports = LockDriver;