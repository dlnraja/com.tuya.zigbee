'use strict';

const BaseHybridDevice = require('./BaseHybridDevice');

/**
 * SwitchDevice - Base class for wall switches
 * Handles multiple gangs with onoff control
 * Automatically detects power source (AC/DC)
 */
class SwitchDevice extends BaseHybridDevice {

  async onNodeInit() {
    // Initialize hybrid base (power detection)
    await super.onNodeInit();
    
    // Setup switch-specific functionality
    await this.setupSwitchControl();
    
    this.log('SwitchDevice ready');
  }

  /**
   * Setup switch control for all gangs
   */
  async setupSwitchControl() {
    this.log('🔌 Setting up switch control...');
    
    const gangCount = this.gangCount || 1;
    
    // Register main onoff capability (gang 1)
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        return await this.onCapabilityOnoff(value, 1);
      });
      this.log('✅ Gang 1 control registered');
    }
    
    // Register additional gangs
    for (let gang = 2; gang <= gangCount; gang++) {
      const capabilityId = `onoff.gang${gang}`;
      
      if (this.hasCapability(capabilityId)) {
        this.registerCapabilityListener(capabilityId, async (value) => {
          return await this.onCapabilityOnoff(value, gang);
        });
        this.log(`✅ Gang ${gang} control registered`);
      }
    }
    
    // Register onOff cluster for each endpoint
    for (let ep = 1; ep <= gangCount; ep++) {
      try {
        this.registerCapability('onoff' + (ep > 1 ? `.gang${ep}` : ''), 6, { // Cluster 6 = onOff
          endpoint: ep,
          get: 'onOff',
          set: 'onOff',
          setParser: (value) => ({ onOff: value }),
          report: 'onOff',
          reportParser: (value) => value
        });
      } catch (err) {
        this.log(`Gang ${ep} cluster registration failed (non-critical):`, err.message);
      }
    }
    
    this.log(`✅ Switch control configured for ${gangCount} gang(s)`);
  }

  /**
   * Handle onoff capability change
   */
  async onCapabilityOnoff(value, gang = 1) {
    this.log(`Gang ${gang} onoff:`, value);
    
    try {
      const endpoint = this.zclNode.endpoints[gang];
      
      if (!endpoint?.clusters?.onOff) {
        throw new Error(`Endpoint ${gang} not available`);
      }
      
      if (value) {
        await endpoint.clusters.onOff.setOn();
      } else {
        await endpoint.clusters.onOff.setOff();
      }
      
      this.log(`✅ Gang ${gang} set to:`, value);
      return true;
      
    } catch (err) {
      this.error(`Gang ${gang} control failed:`, err.message);
      throw err;
    }
  }

  /**
   * Set number of gangs for this device
   */
  setGangCount(count) {
    this.gangCount = count;
  }

  /**
   * Get gang count
   */
  getGangCount() {
    return this.gangCount || 1;
  }

  /**
   * Toggle specific gang
   */
  async toggleGang(gang = 1) {
    const capabilityId = gang === 1 ? 'onoff' : `onoff.gang${gang}`;
    
    if (this.hasCapability(capabilityId)) {
      const currentValue = this.getCapabilityValue(capabilityId);
      await this.setCapabilityValue(capabilityId, !currentValue);
      return !currentValue;
    }
    
    throw new Error(`Gang ${gang} not available`);
  }

  /**
   * Turn all gangs on
   */
  async allOn() {
    const promises = [];
    const gangCount = this.getGangCount();
    
    for (let gang = 1; gang <= gangCount; gang++) {
      const capabilityId = gang === 1 ? 'onoff' : `onoff.gang${gang}`;
      if (this.hasCapability(capabilityId)) {
        promises.push(this.setCapabilityValue(capabilityId, true));
      }
    }
    
    await Promise.all(promises);
    this.log(`✅ All ${gangCount} gangs turned ON`);
  }

  /**
   * Turn all gangs off
   */
  async allOff() {
    const promises = [];
    const gangCount = this.getGangCount();
    
    for (let gang = 1; gang <= gangCount; gang++) {
      const capabilityId = gang === 1 ? 'onoff' : `onoff.gang${gang}`;
      if (this.hasCapability(capabilityId)) {
        promises.push(this.setCapabilityValue(capabilityId, false));
      }
    }
    
    await Promise.all(promises);
    this.log(`✅ All ${gangCount} gangs turned OFF`);
  }
}

module.exports = SwitchDevice;
