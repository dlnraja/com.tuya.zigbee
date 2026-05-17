'use strict';

const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

/**
 * SMOKE DETECTOR ADVANCED - v5.5.503
 * Sources: Z2M, SmartThings, Hubitat
 */
class SmokeDetectorAdvancedDevice extends UnifiedSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['alarm_smoke', 'measure_battery', 'measure_temperature', 'measure_humidity', 'alarm_tamper']; }

  get fastInitMode() { return true; }

  get dpMappings() {
    return {
      1: {
        capability: 'alarm_smoke',
        transform: (v, device) => {
          if (device) device.log(`[SMOKE] DP1 raw value: ${v} (type: ${typeof v})`);
          
          let isAlarm = false;
          if (v === 'alarm' || v === true) {
            isAlarm = true;
          } else if (typeof v === 'number') {
            // For many Tuya smoke detectors, 0 = ALARM, 1 = NORMAL
            isAlarm = (v === 0);
          }

          if (device) {
            device.log(`[SMOKE]  Smoke alarm: ${isAlarm ? ' TRIGGERED!' : ' clear'}`);
            // Trigger flow cards
            const triggerId = isAlarm ? 'smoke_detector_advanced_alarm_smoke_true' : 'smoke_detector_advanced_alarm_smoke_false';
            device.driver?.homey?.flow?.getTriggerCard(triggerId)?.trigger(device, {}).catch(() => {});
          }
          return isAlarm;
        }
      },
      2: { capability: 'measure_temperature', divisor: 10, optional: true },
      3: { capability: 'measure_humidity', divisor: 1, optional: true },
      4: {
        capability: 'alarm_tamper',
        transform: (v, device) => {
          // Detect tamper vs battery based on value pattern
          if (v === 0 || v === 1 || v === true || v === false) {
            const isTampered = v === 1 || v === true;
            if (device) {
              device.log(`[SMOKE] DP4 as tamper: ${isTampered}`);
              if (isTampered) {
                device.driver?.homey?.flow?.getTriggerCard('smoke_detector_advanced_alarm_tamper_true')?.trigger(device, {}).catch(() => {});
              }
            }
            return isTampered;
          } else if (typeof v === 'number' && v > 1) {
            const battery = Math.min(100, v);
            if (device) {
              device.log(`[SMOKE] DP4 as battery: ${battery}%`);
              if (battery < 20) {
                device.driver?.homey?.flow?.getTriggerCard('smoke_detector_advanced_battery_low')?.trigger(device, {}).catch(() => {});
              }
            }
            device.setCapabilityValue('measure_battery', battery).catch(() => {});
            return null;
          }
          return v;
        }
      },
      14: {
        capability: 'measure_battery',
        transform: (v, device) => {
          const batteryMap = { 0: 10, 1: 50, 2: 100 };
          const battery = batteryMap[v] ?? (v > 2 ? v : 50);
          if (device) device.log(`[SMOKE] DP14 battery state: ${v} -> ${battery}%`);
          return battery;
        }
      },
      15: { capability: 'measure_battery', divisor: 1 },
      5: { 
        capability: 'alarm_volume',
        transform: (v, device) => {
          const volumeMap = { 0: 'low', 1: 'medium', 2: 'high' };
          const volume = volumeMap[v] ?? 'unknown';
          if (device) device.log(`[SMOKE] DP5 alarm_volume: ${v} (${volume})`);
          return v;
        }
      }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    const mfr = this.getSetting('zb_manufacturer_name') || this.getData().manufacturerName || 'UNKNOWN';
    this.log(`[SMOKE-ADV] Smart Smoke Detector Advanced Ready. Mfr: ${mfr}`);

    // Setup IAS Zone
    try {
      const iasZoneCluster = zclNode.endpoints[1]?.clusters.iasZone || zclNode.endpoints[1]?.clusters[1280];
      if (iasZoneCluster) {
        iasZoneCluster.on('attr.zoneStatus', (zoneStatus) => {
          const smokeAlarm = !!(zoneStatus & 0x0001);
          const tamperAlarm = !!(zoneStatus & 0x0004);
          const batteryLow = !!(zoneStatus & 0x0008);
          
          this.log(`[SMOKE-ADV] IAS Zone: smoke=${smokeAlarm}, tamper=${tamperAlarm}, batteryLow=${batteryLow}`);
          
          this.setCapabilityValue('alarm_smoke', smokeAlarm).catch(() => {});
          if (this.hasCapability('alarm_tamper')) {
            this.setCapabilityValue('alarm_tamper', tamperAlarm).catch(() => {});
          }
          if (batteryLow && this.hasCapability('measure_battery')) {
            this.setCapabilityValue('measure_battery', 10).catch(() => {});
          }
        });

        // Zone enrollment
        this._performIASZoneEnrollment(zclNode);
      }
    } catch (e) {
      this.error('[SMOKE-ADV] IAS Zone setup error:', e.message);
    }
  }

  async _performIASZoneEnrollment(zclNode) {
    try {
      const iasZone = zclNode.endpoints[1]?.clusters.iasZone;
      if (!iasZone) return;

      const ieeeAddress = this.homey.zigbee?.ieeeAddress || await this.homey.zigbee?.getIeeeAddress?.();

      if (ieeeAddress) {
        await iasZone.writeAttributes({ iasCieAddress: ieeeAddress }).catch(() => {});
      }
    } catch (e) { }
  }

  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = SmokeDetectorAdvancedDevice;
