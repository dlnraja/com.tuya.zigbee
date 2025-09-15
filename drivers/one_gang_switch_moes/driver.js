const { ZigBeeDriver } = require('homey-zigbeedriver');

class OneGangSwitchMoesDriver extends ZigBeeDriver {

  async onInit() {
    this.log('OneGangSwitchMoesDriver has been initialized');
  }

  async onPair(session) {
    this.log('OneGangSwitchMoesDriver pairing started');
    
    session.setHandler('list_devices', async () => {
      return this.onPairListDevices();
    });

    session.setHandler('pincode', async (pincode) => {
      return this.onPairPincode(pincode);
    });
  }

  async onPairListDevices() {
    this.log('Listing devices for pairing...');
    
    // Return discovered devices
    return [];
  }

  async onPairPincode(pincode) {
    this.log('Pincode received:', pincode);
    return true;
  }

}

module.exports = OneGangSwitchMoesDriver;
