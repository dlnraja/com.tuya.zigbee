'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Aqara Door/Window Contact Sensor
 */
class AqaraContactSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Aqara Contact Sensor initializing...');

    // IAS Zone for contact detection
    if (zclNode.endpoints[1]?.clusters?.iasZone) {
      this.log('[AQARA] Setting up IAS Zone...');

      zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (payload) => {
        const alarm1 = (payload.zoneStatus & 0x01) === 1;
        this.log(`[AQARA] Contact: ${alarm1 ? 'open' : 'closed'}`);
        this.setCapabilityValue('alarm_contact', alarm1).catch(this.error);
      });

      // Read initial state
      try {
        const { zoneStatus } = await zclNode.endpoints[1].clusters.iasZone.readAttributes(['zoneStatus']);
        const alarm1 = (zoneStatus & 0x01) === 1;
        this.setCapabilityValue('alarm_contact', alarm1).catch(this.error);
      } catch (e) {
        this.log('[AQARA] Could not read zone status:', e.message);
      }
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
        this.log(`[AQARA] Battery (voltage): ${percent}%`);
        this.setCapabilityValue('measure_battery', percent).catch(this.error);
      });
    }

    // Xiaomi-specific attribute reports (custom cluster 0xFCC0)
    this._setupXiaomiCluster(zclNode);

    this.log('Aqara Contact Sensor initialized');
  }

  _setupXiaomiCluster(zclNode) {
    // Listen for Xiaomi manufacturer-specific attributes
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
      this.log('[AQARA] Xiaomi cluster setup failed:', e.message);
    }
  }

  _parseXiaomiReport(data) {
    try {
      // Xiaomi encodes battery and other values in manufacturer-specific format
      if (data && data.length > 0) {
        // Look for battery voltage (typically at offset with tag 0x01)
        for (let i = 0; i < data.length - 2; i++) {
          if (data[i] === 0x01 && data[i + 1] === 0x21) {
            const voltage = data.readUInt16LE(i + 2);
            const percent = Math.min(100, Math.max(0, Math.round((voltage - 2500) / 5)));
            this.log(`[AQARA] Xiaomi battery: ${percent}% (${voltage}mV)`);
            this.setCapabilityValue('measure_battery', percent).catch(this.error);
            break;
          }
        }
      }
    } catch (e) {
      this.log('[AQARA] Xiaomi parse error:', e.message);
    }
  }
}

module.exports = AqaraContactSensorDevice;
