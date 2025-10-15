'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

 catch (err) {
      this.error('Battery change detection error:', err);
    }
  }

}

module.exports = SOSEmergencyButtonDevice;
