const { ZigBeeDriver } = require('homey-zigbeedriver');

class CrRnz1Driver extends ZigBeeDriver {

  async onInit() {
    this.log('CrRnz1Driver has been initialized');
  }

  async onPair(session) {
    this.log('CrRnz1Driver pairing started');
    
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

module.exports = CrRnz1Driver;
