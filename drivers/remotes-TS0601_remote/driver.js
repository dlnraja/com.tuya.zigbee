const Homey = require('homey');

class Remotes-TS0601_remoteDriver extends Homey.Driver {
  async onInit() {
    this.log('Remotes-TS0601_remote driver initialized');
  }
}

module.exports = Remotes-TS0601_remoteDriver;