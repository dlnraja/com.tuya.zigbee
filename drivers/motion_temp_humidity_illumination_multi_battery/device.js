'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

 catch (err) {
      this.error('Battery change detection error:', err);
    }
  }

}

module.exports = MotionTempHumidityIlluminationSensorDevice;
