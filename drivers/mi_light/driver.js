const { ZigBeeDriver } = require('homey-zigbeedriver');

class MiLightDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MiLightDriver has been initialized');
  }

  async onPair(session) {
    this.log('MiLightDriver pairing started');
    
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

module.exports = MiLightDriver;
