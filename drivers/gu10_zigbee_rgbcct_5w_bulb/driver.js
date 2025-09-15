const { ZigBeeDriver } = require('homey-zigbeedriver');

class Gu10ZigbeeRgbcct5wBulbDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Gu10ZigbeeRgbcct5wBulbDriver has been initialized');
  }

  async onPair(session) {
    this.log('Gu10ZigbeeRgbcct5wBulbDriver pairing started');
    
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

module.exports = Gu10ZigbeeRgbcct5wBulbDriver;
