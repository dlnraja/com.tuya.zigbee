'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaRadarSensorDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('TuyaRadarSensorDevice has been initialized');

    // Register capabilities
    this.registerCapability('alarm_motion', 'ssIasZone');
    this.registerCapability('measure_luminance', 'msIlluminanceMeasurement');
    this.registerCapability('measure_battery', 'genPowerCfg');
    this.registerCapability('alarm_battery', 'genPowerCfg');

    // Presence timeout handler
    this.presenceTimeout = null;

    // Register Tuya cluster for EF00 datapoints
    this.registerCluster('manuSpecificTuya', {
      onDataReport: (data) => {
        this.log('Tuya radar data:', data);
        this.handleTuyaDataPoint(data);
      }
    });

    // Battery debounce to prevent rapid drain reports
    this.batteryReportDebounce = this.homey.setTimeout(() => {}, 0);
  }

  handleTuyaDataPoint(data) {
    const { dp, value, datatype } = data;
    
    switch (dp) {
      case 101: // Presence detection
        if (typeof value === 'boolean' || typeof value === 'number') {
          const presence = Boolean(value);
          this.setCapabilityValue('alarm_motion', presence).catch(this.error);
          this.log('Presence detected:', presence);
          
          // Handle presence timeout
          if (presence) {
            this.clearPresenceTimeout();
          } else {
            this.startPresenceTimeout();
          }
        }
        break;
        
      case 102: // Illuminance
        if (typeof value === 'number') {
          // Convert to lux (varies by device firmware)
          const illuminance = Math.max(0, value);
          this.setCapabilityValue('measure_luminance', illuminance).catch(this.error);
          this.log('Illuminance updated:', illuminance);
        }
        break;
        
      case 103: // Radar sensitivity (read-only from device)
        this.log('Current radar sensitivity from device:', value);
        break;
        
      case 104: // Battery level with debounce
        if (typeof value === 'number') {
          this.homey.clearTimeout(this.batteryReportDebounce);
          this.batteryReportDebounce = this.homey.setTimeout(() => {
            this.setCapabilityValue('measure_battery', value).catch(this.error);
            this.setCapabilityValue('alarm_battery', value < 20).catch(this.error);
            this.log('Battery updated (debounced):', value);
          }, 5000); // 5 second debounce for battery reports
        }
        break;
        
      default:
        this.log('Unknown radar datapoint:', dp, value);
    }
  }

  startPresenceTimeout() {
    const timeout = this.getSetting('presence_timeout') || 30;
    this.clearPresenceTimeout();
    
    this.presenceTimeout = this.homey.setTimeout(() => {
      this.setCapabilityValue('alarm_motion', false).catch(this.error);
      this.log('Presence timeout - clearing motion');
    }, timeout * 1000);
  }

  clearPresenceTimeout() {
    if (this.presenceTimeout) {
      this.homey.clearTimeout(this.presenceTimeout);
      this.presenceTimeout = null;
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Radar settings changed:', changedKeys);
    
    if (changedKeys.includes('radar_sensitivity')) {
      // Send sensitivity setting to device via Tuya DP
      const sensitivityMap = { low: 1, medium: 2, high: 3 };
      const sensitivityValue = sensitivityMap[newSettings.radar_sensitivity] || 2;
      
      try {
        await this.zclNode.endpoints[1].clusters.manuSpecificTuya.sendCommand('setDataPoint', {
          dp: 2, // Sensitivity control DP
          datatype: 2, // enum
          value: sensitivityValue
        });
        this.log('Radar sensitivity updated:', newSettings.radar_sensitivity);
      } catch (error) {
        this.error('Failed to update radar sensitivity:', error);
        throw new Error('Failed to update radar sensitivity');
      }
    }
  }

  async onDeleted() {
    this.clearPresenceTimeout();
    this.homey.clearTimeout(this.batteryReportDebounce);
  }

}

module.exports = TuyaRadarSensorDevice;
