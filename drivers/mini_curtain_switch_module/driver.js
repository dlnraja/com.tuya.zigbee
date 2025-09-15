const { ZigBeeDriver } = require('homey-zigbeedriver');

class MiniCurtainSwitchModuleDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MiniCurtainSwitchModuleDriver has been initialized');
  }

  async onPair(session) {
    this.log('MiniCurtainSwitchModuleDriver pairing started');
    
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

module.exports = MiniCurtainSwitchModuleDriver;
