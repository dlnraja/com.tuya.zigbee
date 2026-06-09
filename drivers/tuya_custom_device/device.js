'use strict';

const UniversalZigbeeDevice = require('../../lib/UniversalZigbeeDevice');

class tuya_custom_device extends UniversalZigbeeDevice {
  async onNodeInit() {
    this.log('Tuya Dynamic Override Device Initializing...');

    try {
      const overrides = this.homey.settings.get('tuya_overrides') || {};
      
      // Attempt to find the manufacturer name
      let mfrName = this.getSetting('manufacturerName');
      if (!mfrName && this.node && this.node.manufacturerName) {
        mfrName = this.node.manufacturerName;
      }
      if (!mfrName) {
        mfrName = this.getStoreValue('manufacturerName');
      }

      this.log(`Detected Manufacturer: ${mfrName || 'Unknown'}`);

      if (mfrName && overrides[mfrName]) {
        const targetDriverId = overrides[mfrName];
        this.log(`Applying White Label Override -> Mapping to driver: ${targetDriverId}`);
        
        const drivers = this.homey.manifest.drivers;
        const targetDriver = drivers.find(d => d.id === targetDriverId);
        
        if (targetDriver && targetDriver.capabilities) {
          this.log(`Adding capabilities for ${targetDriverId}: ${targetDriver.capabilities.join(', ')}`);
          for (const cap of targetDriver.capabilities) {
            if (!this.hasCapability(cap)) {
              await this.addCapability(cap).catch(e => this.error(`Failed to add capability ${cap}`, e));
            }
          }
          // Remove old capabilities not in target
          const currentCaps = this.getCapabilities();
          for (const cap of currentCaps) {
            if (!targetDriver.capabilities.includes(cap) && cap !== 'measure_battery') {
              await this.removeCapability(cap).catch(e => this.error(`Failed to remove capability ${cap}`, e));
            }
          }
        }
      } else {
        this.log('No override mapping found for this device. Waiting for configuration.');
      }
    } catch (err) {
      this.error('Error applying override capabilities:', err.message);
    }

    // Delegate to UniversalZigbeeDevice to handle the real adaptation and ZCL binding
    await super.onNodeInit();
  }
}

module.exports = tuya_custom_device;
