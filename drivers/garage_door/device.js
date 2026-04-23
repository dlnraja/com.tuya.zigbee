'use strict';
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
class GarageDoorDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'ssIasZone',
          attributeName: 'zoneStatus',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    this.log('[GARAGE] initializing...');
    if (this.hasCapability('garagedoor_closed')) {
      this.registerCapabilityListener('garagedoor_closed', async (value) => {
        this.log('[GARAGE] Door ' + (value ? 'CLOSE' : 'OPEN'));
        await this.sendTuyaCommand(1, true, 'bool');
      });
    }
    this.log('[GARAGE] ready');
  }
  handleTuyaDataReport(data) {
    if (!data || data.dp === undefined) return;
    const dp = data.dp;
    const value = data.data !== undefined ? data.data : data.value;
    this.log('[GARAGE] DP' + dp + ' = ' + value);
    switch (dp) {
    case 1:
      break;
    case 2: {
      const closed = value === 0 || value === false;
      this.setCapabilityValue('garagedoor_closed', closed).catch(this.error);
      if (this.hasCapability('alarm_contact')) {
        this.setCapabilityValue('alarm_contact', !closed).catch(this.error);
      }
      break;
    }
    case 3:
      this.log('[GARAGE] Countdown: ' + value + 's');
      break;
    case 12: {
      const open = value === 1 || value === true;
      if (this.hasCapability('alarm_contact')) {
        this.setCapabilityValue('alarm_contact', open).catch(this.error);
      }
      this.setCapabilityValue('garagedoor_closed', !open).catch(this.error);
      break;
    }
    default:
      this.log('[GARAGE] Unknown DP' + dp + ' = ' + value);
    }
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = GarageDoorDevice;

