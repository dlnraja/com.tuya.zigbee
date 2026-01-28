'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * Rain Sensor Device
 * v5.5.889: Added IAS Zone support for TS0207 devices (Dominique_C forum report)
 * v5.3.64: SIMPLIFIED base implementation
 */
class RainSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_water', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_water', transform: (v) => v === 1 || v === true }, // Rain detected
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    // v5.5.889: IAS Zone support for TS0207 rain sensors
    await this._setupIASZone(zclNode);
    
    this.log('[RAIN] ✅ Rain sensor ready');
  }

  /**
   * v5.5.889: IAS Zone setup for TS0207 devices
   * These devices use IAS Zone cluster (0x0500) for rain detection
   */
  async _setupIASZone(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const iasCluster = endpoint?.clusters?.iasZone || endpoint?.clusters?.ssIasZone;

      if (!iasCluster) {
        this.log('[RAIN-IAS] No IAS Zone cluster found');
        return;
      }

      this.log('[RAIN-IAS] IAS Zone cluster found - setting up rain detection');

      // Handle Zone Enroll Request
      iasCluster.onZoneEnrollRequest = async (payload) => {
        this.log('[RAIN-IAS] 📥 Zone Enroll Request received:', payload);
        try {
          await iasCluster.zoneEnrollResponse({
            enrollResponseCode: 0, // Success
            zoneId: 23
          });
          this.log('[RAIN-IAS] ✅ Zone Enroll Response sent');
        } catch (err) {
          this.log('[RAIN-IAS] Zone enroll response error:', err.message);
        }
      };

      // Try to write CIE address
      try {
        const homeyIeeeAddress = this.homey.zigbee?.getNetwork?.()?.ieeeAddress;
        if (homeyIeeeAddress) {
          await iasCluster.writeAttributes({ iasCieAddress: homeyIeeeAddress });
          this.log('[RAIN-IAS] ✅ CIE address written:', homeyIeeeAddress);
        }
      } catch (cieErr) {
        this.log('[RAIN-IAS] CIE address write (normal if already set):', cieErr.message);
      }

      // Zone Status Change Notification (rain detected)
      iasCluster.onZoneStatusChangeNotification = (payload) => {
        const parsed = this._parseIASZoneStatus(payload?.zoneStatus);
        const raining = parsed.alarm1 || parsed.alarm2;
        
        this.log(`[RAIN-IAS] 🌧️ Zone status: raw=${parsed.raw} alarm1=${parsed.alarm1} alarm2=${parsed.alarm2} → raining=${raining}`);

        if (this.hasCapability('alarm_water')) {
          this.setCapabilityValue('alarm_water', raining).catch(this.error);
        }
      };

      // Attribute listener for zone status
      iasCluster.on('attr.zoneStatus', (status) => {
        const raining = (status & 0x01) !== 0 || (status & 0x02) !== 0;
        this.log(`[RAIN-IAS] 🌧️ Zone attr status: ${status} → raining=${raining}`);
        
        if (this.hasCapability('alarm_water')) {
          this.setCapabilityValue('alarm_water', raining).catch(this.error);
        }
      });

      this.log('[RAIN-IAS] ✅ IAS Zone listeners configured');
    } catch (err) {
      this.log('[RAIN-IAS] Setup error:', err.message);
    }
  }
}

module.exports = RainSensorDevice;
