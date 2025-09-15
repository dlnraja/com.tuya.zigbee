const { ZigBeeDriver } = require('homey-zigbeedriver');

class HumanPresenceDetectorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('HumanPresenceDetectorDriver has been initialized');
  }

  async onPair(session) {
    this.log('HumanPresenceDetectorDriver pairing started');
    
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

module.exports = HumanPresenceDetectorDriver;
