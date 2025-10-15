'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

 catch (err) {
      this.error('Battery change detection error:', err);
    }
  }

}

module.exports = WirelessButton2gangBatteryDevice;
