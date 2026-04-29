'use strict';
const fs = require('fs');
const path = require('path');

const files = [
    'drivers/device_air_purifier_din_hybrid/driver.js',
    'drivers/device_air_purifier_hybrid/driver.js',
    'drivers/device_air_purifier_motion_hybrid/driver.js',
    'drivers/device_air_purifier_plug_hybrid/driver.js',
    'drivers/device_air_purifier_presence_hybrid/device.js'
];

const driverTemplate = `'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericAirPurifierDriver extends ZigBeeDriver {
  onInit() {
    super.onInit();
  }
}

module.exports = GenericAirPurifierDriver;
`;

const deviceTemplate = `'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');

class GenericAirPurifierDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
  }

  handleTuyaDataReport(data) {
     this.log('DP:', data.dp, data.value);
  }
}

module.exports = GenericAirPurifierDevice;
`;

files.forEach(f => {
    const fullPath = path.join('c:/Users/HP/Desktop/homey app/tuya_repair', f);
    const content = f.endsWith('driver.js') ? driverTemplate : deviceTemplate      ;
    fs.writeFileSync(fullPath, content);
    console.log('Restored:', f);
});
