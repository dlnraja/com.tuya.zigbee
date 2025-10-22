'use strict';

const { Driver } = require('homey');

class UniversalWirelessButtonDriver extends Driver {

  async onInit() {
    this.log('Universal Wireless Button Driver initialized');
  }

  async onPair(session) {
    session.setHandler('showView', async (viewId) => {
      this.log(`Pairing view: ${viewId}`);
    });

    session.setHandler('list_devices', async () => {
      this.log('Listing devices during pairing...');
      return [];
    });
  }

}

module.exports = UniversalWirelessButtonDriver;
