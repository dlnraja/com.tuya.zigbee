'use strict';

const { CLUSTER } = require('zigbee-clusters');
const { AutoAdaptiveDevice } = require('../dynamic');

/**
 * SwitchDevice - Base class for wall switches
 * Handles multiple gangs with onoff control
 * Automatically detects power source (AC/DC)
 */
class SwitchDevice extends AutoAdaptiveDevice {

  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection)
    await super.onNodeInit({ zclNode });
    
    // Setup switch-specific functionality
    await this.setupSwitchControl();
    
    this.log('SwitchDevice ready');
  }

  /**
   * Setup switch control for all gangs (SDK3 compliant)
   */
  async setupSwitchControl() {
    this.log('[POWER] Setting up switch control (SDK3)...');
    
    const gangCount = this.gangCount || 1;
    
    // Register main onoff capability (gang 1)
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        return await this.onCapabilityOnoff(value, 1);
      });
      this.log('[OK] Gang 1 control registered');
    }
    
    // Register additional gangs
    for (let gang = 2; gang <= gangCount; gang++) {
      const capabilityId = `onoff.gang${gang}`;
      
      if (this.hasCapability(capabilityId)) {
        this.registerCapabilityListener(capabilityId, async (value) => {
          return await this.onCapabilityOnoff(value, gang);
        });
        this.log(`[OK] Gang ${gang} control registered`);
      }
    }
    
    // SDK3: Setup direct cluster listeners for each endpoint
    for (let ep = 1; ep <= gangCount; ep++) {
      try {
        const capabilityId = ep === 1 ? 'onoff' : `onoff.gang${ep}`;
        const endpoint = this.zclNode.endpoints[ep];
        
        if (endpoint?.clusters?.onOff) {
          // SDK3: Direct cluster listener (device → Homey) with guards
          endpoint.clusters.onOff.on('attr.onOff', async (value) => {
            try {
              this.log(`[RECV] Gang ${ep} cluster update: ${value}`);
              
              // Safe capability value setting
              if (this.hasCapability(capabilityId)) {
                await this.setCapabilityValue(capabilityId, value).catch(err => {
                  this.log(`[ERROR] Failed to set ${capabilityId}:`, err.message);
                });
              } else {
                this.log(`[WARN] Capability ${capabilityId} not found, skipping update`);
              }
              
              // Safe resolve availability if needed
              if (typeof this._safeResolveAvailable === 'function') {
                this._safeResolveAvailable(true);
              }
            } catch (err) {
              this.log('[ERROR] OnOff handler error:', err);
              // Don't crash the app on cluster report errors
            }
          });
          
          // SDK3: Configure attribute reporting (call super directly to avoid recursion)
          try {
            await super.configureAttributeReporting([{
              endpointId: ep,
              cluster: CLUSTER.ON_OFF,
              attributeName: 'onOff',
              minInterval: 0,
              maxInterval: 300,
              minChange: 0
            }]);
            
            if (!this._reportingConfiguredForEp) this._reportingConfiguredForEp = {};
            if (!this._reportingConfiguredForEp[ep]) {
              this.log(`[OK] Attribute reporting configured for endpoint ${ep}`);
              this._reportingConfiguredForEp[ep] = true;
            }
          } catch (err) {
            this.log(`[WARN] Attribute reporting failed for endpoint ${ep}:`, err.message);
          }
          
          this.log(`[OK] Gang ${ep} SDK3 cluster listeners configured`);
        } else {
          this.log(`[WARN]  Gang ${ep}: onOff cluster not available`);
        }
      } catch (err) {
        this.log(`Gang ${ep} cluster setup failed (non-critical):`, err.message);
      }
    }
    
    this.log(`[OK] Switch control configured for ${gangCount} gang(s) (SDK3)`);
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
      
      this.log(`[OK] Gang ${gang} set to:`, value);
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
    this.log(`[OK] All ${gangCount} gangs turned ON`);
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
    this.log(`[OK] All ${gangCount} gangs turned OFF`);
  }
}

module.exports = SwitchDevice;
