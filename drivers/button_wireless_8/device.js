'use strict';

const ButtonDevice = require('../../lib/ButtonDevice');

/**
 * Button8GangDevice - Unified 8-button wireless controller
 * Auto-detects battery type (CR2032/CR2450/AAA)
 * Handles single/double/long press for each button
 */
class Button8GangDevice extends ButtonDevice {

  async onNodeInit() {
    // Time sync (Tuya devices)
    this.setupTimeSync().catch(() => {});

    // === AUTO-IMPLEMENTED SENSOR REPORTING ===
    await this.setupSensorReporting();

    this.log('Button8GangDevice initializing...');
    
    // Set button count for this device
    this.buttonCount = 8;
    
    // Initialize base (power detection + button detection)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('Button8GangDevice initialized - 8 buttons ready');
  }

  async onDeleted() {
    this.log('Button8GangDevice deleted');
    
    // Cleanup timers
    if (this._clickState) {
      if (this._clickState.clickTimer) {
        clearTimeout(this._clickState.clickTimer);
      }
      if (this._clickState.longPressTimer) {
        clearTimeout(this._clickState.longPressTimer);
      }
    }
  }
  async setupSensorReporting() {
    try {

      // Battery reporting
      this.registerAttrReportListener(
        'genPowerCfg',
        'batteryPercentageRemaining',
        1,
        3600,
        1,
        value => {
          const battery = Math.round(value / 2);
          this.log('Battery:', battery, '%');
          this.setCapabilityValue('measure_battery', battery).catch(this.error);
        },
        1
      ).catch(err => this.error('Battery reporting failed:', err));
      
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 'genPowerCfg',
        attributeName: 'batteryPercentageRemaining',
        minInterval: 3600,
        maxInterval: 43200,
        minChange: 2
      }]).catch(this.error);

    } catch (err) {
      this.error('Failed to configure sensor reporting:', err);
    }
  }

  /**
   * Setup Time Synchronization
   * Required for Tuya devices to function properly
   */
  async setupTimeSync() {
    try {
      // Time cluster synchronization
      if (this.zclNode.endpoints[1]?.clusters?.time) {
        this.log('Setting up time synchronization...');
        
        // Calculate Zigbee epoch time (seconds since 2000-01-01 00:00:00 UTC)
        const zigbeeEpochStart = new Date('2000-01-01T00:00:00Z').getTime();
        const currentTime = Date.now();
        const zigbeeTime = Math.floor((currentTime - zigbeeEpochStart) / 1000);
        
        // Write time to device
        await this.zclNode.endpoints[1].clusters.time.writeAttributes({
          time: zigbeeTime,
          timeStatus: {
            master: true,
            synchronized: true,
            masterZoneDst: false,
            superseding: false
          }
        }).catch(err => this.log('Time sync write failed (non-critical):', err.message));
        
        // Setup periodic time sync (every 24 hours)
        this.timeSyncInterval = setInterval(async () => {
          const newZigbeeTime = Math.floor((Date.now() - zigbeeEpochStart) / 1000);
          await this.zclNode.endpoints[1].clusters.time.writeAttributes({
            time: newZigbeeTime
          }).catch(err => this.log('Time resync failed:', err.message));
          this.log('Time resynchronized');
        }, 24 * 60 * 60 * 1000); // 24 hours
        
        this.log('Time synchronization configured');
      }
    } catch (err) {
      this.error('Time sync setup failed (non-critical):', err);
    }
  }
  
  /**
   * Cleanup time sync interval on device removal
   */
  async onDeleted() {
    if (this.timeSyncInterval) {
      clearInterval(this.timeSyncInterval);
    }
    await super.onDeleted?.();
  }

}

module.exports = Button8GangDevice;
