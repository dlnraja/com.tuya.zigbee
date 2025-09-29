/**
 * Tuya Light Bulb Driver Example
 * Example implementation of a Tuya light bulb driver
 */

const { TuyaDriver } = require('homey-meshdriver');

class TuyaLightBulbExample extends TuyaDriver {
  
  async onMeshInit() {
    // Register capabilities
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('dim', 'genLevelCtrl');
    this.registerCapability('light_temperature', 'lightCtrl');
    
    // Register event listeners
    this.registerReportListener('genOnOff', 'attr', (report) => {
      this.log('On/Off report received:', report);
    });
    
    this.registerReportListener('genLevelCtrl', 'attr', (report) => {
      this.log('Dim report received:', report);
    });
  }
  
  async onSettings(oldSettings, newSettings, changedKeys) {
    this.log('Settings updated:', changedKeys);
    
    // Handle specific setting changes
    if (changedKeys.includes('pollingInterval')) {
      this.updatePollingInterval(newSettings.pollingInterval);
    }
  }
  
  async onDeleted() {
    this.log('Device deleted, cleaning up...');
    
    // Cleanup resources
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
  }
  
  updatePollingInterval(interval) {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
    
    if (interval > 0) {
      this.pollingTimer = setInterval(() => {
        this.pollDevice();
      }, interval * 1000);
    }
  }
  
  async pollDevice() {
    try {
      // Poll device for current status
      await this.node.endpoints[1].clusters.genOnOff.read('onOff');
    } catch (error) {
      this.log('Error polling device:', error);
    }
  }
}

module.exports = TuyaLightBulbExample;
