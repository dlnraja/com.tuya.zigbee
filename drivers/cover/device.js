const Homey = require('homey');

class CoverDriver extends Homey.Driver {
  async onInit() {
    this.log('Cover driver initialized');
  }
}

module.exports = CoverDriver;