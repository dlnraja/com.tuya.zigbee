'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Aqara/Xiaomi Motion Sensor
 */
class AqaraMotionSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Aqara Motion Sensor initializing...');
    this._motionResetTimer = null;

    // Occupancy via occupancySensing cluster
    if (zclNode.endpoints[1]?.clusters?.occupancySensing) {
      this.log('[AQARA] Setting up occupancy sensing...');

      zclNode.endpoints[1].clusters.occupancySensing.on('attr.occupancy', (value) => {
        const motion = (value & 0x01) === 1;
        this.log(`[AQARA] Motion: ${motion}`);
        this._handleMotion(motion);
      });
    }

    // IAS Zone (alternative method)
    if (zclNode.endpoints[1]?.clusters?.iasZone) {
      zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (payload) => {
        const motion = (payload.zoneStatus & 0x01) === 1;
        this.log(`[AQARA] Motion (IAS): ${motion}`);
        this._handleMotion(motion);
      });
    }

    // Illuminance
    if (this.hasCapability('measure_luminance') && zclNode.endpoints[1]?.clusters?.illuminanceMeasurement) {
      zclNode.endpoints[1].clusters.illuminanceMeasurement.on('attr.measuredValue', (value) => {
        const lux = value > 0 ? Math.pow(10, (value - 1) / 10000) : 0;
        this.log(`[AQARA] Illuminance: ${Math.round(lux)} lux`);
        this.setCapabilityValue('measure_luminance', Math.round(lux)).catch(this.error);
      });
    }

    // Battery
    if (zclNode.endpoints[1]?.clusters?.genPowerCfg) {
      zclNode.endpoints[1].clusters.genPowerCfg.on('attr.batteryPercentageRemaining', (value) => {
        const battery = Math.round(value / 2);
        this.log(`[AQARA] Battery: ${battery}%`);
        this.setCapabilityValue('measure_battery', battery).catch(this.error);
      });

      zclNode.endpoints[1].clusters.genPowerCfg.on('attr.batteryVoltage', (voltage) => {
        const percent = Math.min(100, Math.max(0, Math.round((voltage - 25) * 2)));
        this.setCapabilityValue('measure_battery', percent).catch(this.error);
      });
    }

    // Xiaomi manufacturer-specific reports
    this._setupXiaomiReports(zclNode);

    this.log('Aqara Motion Sensor initialized');
  }

  _handleMotion(motion) {
    this.setCapabilityValue('alarm_motion', motion).catch(this.error);

    // Clear existing timer
    if (this._motionResetTimer) {
      clearTimeout(this._motionResetTimer);
      this._motionResetTimer = null;
    }

    // Auto-reset motion after configured time
    if (motion) {
      const resetTime = (this.getSetting('motion_reset_time') || 60) * 1000;
      this._motionResetTimer = setTimeout(() => {
        this.setCapabilityValue('alarm_motion', false).catch(this.error);
        this._motionResetTimer = null;
      }, resetTime);
    }
  }

  _setupXiaomiReports(zclNode) {
    try {
      const endpoint = zclNode.endpoints[1];
      if (endpoint) {
        endpoint.on('raw', (frame) => {
          if (frame.cluster === 0xFCC0 || frame.cluster === 0xFF01) {
            this._parseXiaomiReport(frame.data);
          }
        });
      }
    } catch (e) {
      this.log('[AQARA] Xiaomi setup error:', e.message);
    }
  }

  _parseXiaomiReport(data) {
    try {
      if (!data || data.length < 4) return;

      // Parse Xiaomi attribute report
      for (let i = 0; i < data.length - 3; i++) {
        // Battery voltage (tag 0x01, type 0x21 = uint16)
        if (data[i] === 0x01 && data[i + 1] === 0x21) {
          const voltage = data.readUInt16LE(i + 2);
          const percent = Math.min(100, Math.max(0, Math.round((voltage - 2500) / 5)));
          this.log(`[AQARA] Xiaomi battery: ${percent}%`);
          this.setCapabilityValue('measure_battery', percent).catch(this.error);
        }
        // Illuminance (tag 0x0B, type 0x21 = uint16)
        if (data[i] === 0x0B && data[i + 1] === 0x21 && this.hasCapability('measure_luminance')) {
          const lux = data.readUInt16LE(i + 2);
          this.log(`[AQARA] Xiaomi illuminance: ${lux} lux`);
          this.setCapabilityValue('measure_luminance', lux).catch(this.error);
        }
      }
    } catch (e) {
      this.log('[AQARA] Xiaomi parse error:', e.message);
    }
  }

  onDeleted() {
    if (this._motionResetTimer) {
      clearTimeout(this._motionResetTimer);
    }
  }
}

module.exports = AqaraMotionSensorDevice;
