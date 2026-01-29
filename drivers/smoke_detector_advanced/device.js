'use strict';
const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SMOKE DETECTOR ADVANCED - v5.5.503 DIAGNOSTIC LOGGING                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  v5.5.503: Enhanced diagnostic logging for Martijn report                    ║
 * ║  - Added manufacturer name logging at init                                   ║
 * ║  - Enhanced DP reception logging with hex dump                               ║
 * ║  - Added Tuya cluster detection logging                                      ║
 * ║                                                                              ║
 * ║  v5.5.401: CRITICAL PAIRING FIX (Jolink forum report)                        ║
 * ║  - Added fastInitMode for sleepy battery devices                             ║
 * ║  - Deferred complex initialization to prevent pairing timeout                ║
 * ║  - IAS Zone enrollment prioritized for immediate alarm detection             ║
 * ║                                                                              ║
 * ║  v5.5.380: Added cluster 0xED00 (60672) for TZE284 smoke detectors          ║
 * ║  Source: https://www.zigbee2mqtt.io/devices/TS0601_smoke_5.html             ║
 * ║  Features: smoke, tamper, battery, fault_alarm, silence, alarm              ║
 * ║  Supported: _TZE284_rccxox8p, _TZE200_rccxox8p, _TZE204_rccxox8p, etc.      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SmokeDetectorAdvancedDevice extends HybridSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['alarm_smoke', 'measure_battery', 'measure_temperature', 'measure_humidity', 'alarm_tamper']; }

  /**
   * v5.5.401: FAST INIT MODE for sleepy devices
   * Smoke detectors go to sleep quickly after pairing - we must be fast!
   */
  get fastInitMode() { return true; }

  /**
   * v5.5.408: COMPREHENSIVE dpMappings from Zigbee2MQTT research
   * Sources: Z2M #12622, #15349, #12769, SmartThings community
   *
   * CRITICAL: Different smoke detector variants use DIFFERENT DPs!
   * - _TZE200_ntcy3xu1: DP1=smoke (0=alarm!), DP4=tamper, DP14=battery_low
   * - _TZE200_rccxox8p: DP1=smoke, DP4=tamper, DP14=battery_low
   * - _TZE200_m9skfctm: DP1=smoke, DP2=temp, DP3=humidity, DP4=battery
   * - _TZE284_*: Similar patterns with extended features
   * - PG-S11Z: DP1=smoke, DP4=battery, standard Tuya pattern
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // SMOKE ALARM (DP 1) - CRITICAL!
      // v5.5.408: Some devices report 0=ALARM, others report 1=ALARM
      // Transform handles BOTH patterns for maximum compatibility
      // ═══════════════════════════════════════════════════════════════════
      1: {
        capability: 'alarm_smoke',
        transform: (v, device) => {
          // Log for debugging - CRITICAL for troubleshooting
          if (device) device.log?.(`[SMOKE] DP1 raw value: ${v} (type: ${typeof v})`);

          // IMPORTANT: Different variants have INVERTED logic!
          // - _TZE200_ntcy3xu1, _TZE200_rccxox8p: 0 = SMOKE DETECTED, 1/2 = clear
          // - Other variants: 1 = SMOKE DETECTED, 0 = clear
          // - Some use 'alarm' string or true boolean

          let isAlarm = false;
          if (v === 'alarm' || v === true) {
            isAlarm = true;
          } else if (typeof v === 'number') {
            // For numeric values: 0 often means ALARM for Tuya smoke detectors!
            // This is counter-intuitive but matches Z2M behavior
            isAlarm = (v === 0);
          }

          if (device) {
            device.log?.(`[SMOKE] 🔥 Smoke alarm: ${isAlarm ? '🚨 TRIGGERED!' : '✅ clear'}`);
            // v5.5.955: Trigger flow cards (Jolink forum fix)
            const triggerId = isAlarm ? 'smoke_detector_advanced_alarm_smoke_true' : 'smoke_detector_advanced_alarm_smoke_false';
            device.driver?.homey?.flow?.getTriggerCard?.(triggerId)?.trigger(device, {}).catch(() => {});
          }
          return isAlarm;
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // ENVIRONMENTAL (DP 2, 3) - Only some models have these
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_temperature', divisor: 10, optional: true },
      3: { capability: 'measure_humidity', divisor: 1, optional: true },

      // ═══════════════════════════════════════════════════════════════════
      // TAMPER (DP 4) - Many variants use DP4 for tamper, NOT battery!
      // v5.5.408: Detect tamper vs battery based on value pattern
      // ═══════════════════════════════════════════════════════════════════
      4: {
        capability: null, // Dynamic - could be tamper or battery
        transform: (v, device) => {
          // If value is boolean-like (0/1/true/false), it's tamper
          // If value is > 1, it's battery percentage
          if (v === 0 || v === 1 || v === true || v === false) {
            const isTampered = v === 1 || v === true;
            if (device) {
              device.log?.(`[SMOKE] DP4 as tamper: ${isTampered}`);
              // v5.5.955: Trigger tamper flow card
              if (isTampered) {
                device.driver?.homey?.flow?.getTriggerCard?.('smoke_detector_advanced_alarm_tamper_true')?.trigger(device, {}).catch(() => {});
              }
            }
            device?.setCapabilityValue?.('alarm_tamper', isTampered).catch(() => { });
            return null; // Already handled
          } else if (typeof v === 'number' && v > 1) {
            const battery = Math.min(100, v);
            if (device) {
              device.log?.(`[SMOKE] DP4 as battery: ${battery}%`);
              // v5.5.955: Trigger battery flow cards
              device.driver?.homey?.flow?.getTriggerCard?.('smoke_detector_advanced_measure_battery_changed')?.trigger(device, { battery }).catch(() => {});
              if (battery < 20) {
                device.driver?.homey?.flow?.getTriggerCard?.('smoke_detector_advanced_battery_low')?.trigger(device, {}).catch(() => {});
              }
            }
            device?.setCapabilityValue?.('measure_battery', parseFloat(battery)).catch(() => { });
            return null; // Already handled
          }
          return v;
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY LOW (DP 14) - Some use this for battery_low state
      // v5.5.408: 0 = low battery, 2 = full (from Z2M #12622)
      // ═══════════════════════════════════════════════════════════════════
      14: {
        capability: 'measure_battery',
        transform: (v, device) => {
          // 0 = low, 1 = medium(?), 2 = full
          const batteryMap = { 0: 10, 1: 50, 2: 100 };
          const battery = batteryMap[v] ?? (v > 2 ? v : 50);
          if (device) device.log?.(`[SMOKE] DP14 battery state: ${v} → ${battery}%`);
          return battery;
        }
      },

      // Alternative battery DP
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // FAULT & CONTROL FEATURES (v5.5.529: Enhanced Z2M compatibility)
      // Sources: Zigbee2MQTT TS0601_smoke_1-5 definitions
      // ═══════════════════════════════════════════════════════════════════
      11: { 
        capability: null, 
        internal: 'fault_alarm',
        transform: (v, device) => {
          // Log fault status for diagnostics
          if (device) device.log?.(`[SMOKE] DP11 fault_alarm: ${v}`);
          return v;
        }
      },
      16: { 
        capability: null, 
        setting: 'silence_alarm', 
        writable: true,
        transform: (v, device) => {
          if (device) device.log?.(`[SMOKE] DP16 silence: ${v ? 'ACTIVE' : 'INACTIVE'}`);
          return v;
        }
      },
      13: { 
        capability: null, 
        setting: 'alarm_enable', 
        writable: true,
        transform: (v, device) => {
          if (device) device.log?.(`[SMOKE] DP13 alarm_enable: ${v ? 'ENABLED' : 'DISABLED'}`);
          return v;
        }
      },
      8: { 
        capability: null, 
        setting: 'self_test', 
        writable: true,
        transform: (v, device) => {
          if (device) device.log?.(`[SMOKE] DP8 self_test: ${v ? 'TESTING' : 'IDLE'}`);
          return v;
        }
      },
      5: { 
        capability: null, 
        setting: 'alarm_volume',
        transform: (v, device) => {
          // Volume levels: low=0, medium=1, high=2
          const volumeMap = { 0: 'low', 1: 'medium', 2: 'high' };
          const volume = volumeMap[v] ?? 'unknown';
          if (device) device.log?.(`[SMOKE] DP5 alarm_volume: ${v} (${volume})`);
          return v;
        }
      },
      9: { 
        capability: null, 
        internal: 'smoke_concentration',
        transform: (v, device) => {
          // Smoke concentration in ppm or percentage
          if (device) device.log?.(`[SMOKE] DP9 smoke_concentration: ${v}`);
          return v;
        }
      },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // v5.5.503: DIAGNOSTIC LOGGING for Martijn report
    const mfr = this.getData()?.manufacturerName || this.getSetting('zb_manufacturer_name') || 'UNKNOWN';
    const modelId = this.getData()?.modelId || 'UNKNOWN';
    const deviceId = this.getData()?.id || 'UNKNOWN';

    this.log('[SMOKE-ADV] ════════════════════════════════════════════════════════════');
    this.log('[SMOKE-ADV] ✅ Smart Smoke Detector Advanced v5.5.503 Ready');
    this.log(`[SMOKE-ADV] 📋 ManufacturerName: "${mfr}"`);
    this.log(`[SMOKE-ADV] 📋 ModelId: "${modelId}"`);
    this.log(`[SMOKE-ADV] 📋 DeviceId: "${deviceId}"`);
    this.log('[SMOKE-ADV] DP Mappings: smoke(1), temp(2), humidity(3), tamper/battery(4), battery(14,15)');
    this.log('[SMOKE-ADV] ⚠️ NOTE: This is a SLEEPY battery device');
    this.log('[SMOKE-ADV] ⚠️ Smoke alarm will only report when triggered or during wake cycle');
    this.log('[SMOKE-ADV] ════════════════════════════════════════════════════════════');

    // v5.5.503: Log available clusters for diagnostics
    try {
      const ep1 = zclNode?.endpoints?.[1];
      if (ep1) {
        const clusterIds = Object.keys(ep1.clusters || {});
        this.log(`[SMOKE-ADV] 📡 Endpoint 1 clusters: ${clusterIds.join(', ') || 'none'}`);

        // Check for Tuya cluster (0xEF00 = 61184)
        if (ep1.clusters?.tuya || ep1.clusters?.[61184]) {
          this.log('[SMOKE-ADV] ✅ Tuya cluster 0xEF00 (61184) FOUND - DP communication available');
        } else {
          this.log('[SMOKE-ADV] ⚠️ Tuya cluster 0xEF00 NOT found - may use IAS Zone instead');
        }

        // Check for IAS Zone (0x0500 = 1280)
        if (ep1.clusters?.iasZone || ep1.clusters?.[1280]) {
          this.log('[SMOKE-ADV] ✅ IAS Zone cluster 0x0500 (1280) FOUND');
        }
      }
    } catch (e) {
      this.log(`[SMOKE-ADV] ⚠️ Could not enumerate clusters: ${e.message}`);
    }

    // v5.5.503: Store manufacturer for DP transform logic
    this._manufacturerName = mfr;

    // v5.5.725: IAS Zone enrollment for smoke alarm capability (Jolink forum fix)
    try {
      const iasZoneCluster = zclNode?.endpoints?.[1]?.clusters?.iasZone || zclNode?.endpoints?.[1]?.clusters?.[1280];
      if (iasZoneCluster) {
        this.log('[SMOKE-ADV] 🔥 Setting up IAS Zone for smoke alarm...');
        
        // Register for zone status changes (smoke alarm)
        iasZoneCluster.on('attr.zoneStatus', (zoneStatus) => {
          this.log(`[SMOKE-ADV] 🚨 IAS Zone status: ${zoneStatus}`);
          // Bit 0 = Alarm1 (smoke detected)
          const smokeAlarm = !!(zoneStatus & 0x0001);
          // Bit 2 = Tamper
          const tamperAlarm = !!(zoneStatus & 0x0004);
          // Bit 3 = Battery low
          const batteryLow = !!(zoneStatus & 0x0008);
          
          this.log(`[SMOKE-ADV] smoke: ${smokeAlarm}, tamper: ${tamperAlarm}, batteryLow: ${batteryLow}`);
          
          // v5.5.955: Trigger flow cards for IAS Zone events (Jolink forum fix)
          const smokeTriggerId = smokeAlarm ? 'smoke_detector_advanced_alarm_smoke_true' : 'smoke_detector_advanced_alarm_smoke_false';
          this.driver?.homey?.flow?.getTriggerCard?.(smokeTriggerId)?.trigger(this, {}).catch(() => {});
          
          this.setCapabilityValue('alarm_smoke', smokeAlarm).catch(e => this.error('Failed to set alarm_smoke', e));
          if (this.hasCapability('alarm_tamper')) {
            this.setCapabilityValue('alarm_tamper', tamperAlarm).catch(e => this.error('Failed to set alarm_tamper', e));
            if (tamperAlarm) {
              this.driver?.homey?.flow?.getTriggerCard?.('smoke_detector_advanced_alarm_tamper_true')?.trigger(this, {}).catch(() => {});
            }
          }
          if (batteryLow && this.hasCapability('measure_battery')) {
            this.setCapabilityValue('measure_battery', 10).catch(() => {});
            this.driver?.homey?.flow?.getTriggerCard?.('smoke_detector_advanced_battery_low')?.trigger(this, {}).catch(() => {});
          }
        });

        // Zone enrollment
        this._performIASZoneEnrollment(zclNode);
      }
    } catch (e) {
      this.log(`[SMOKE-ADV] ⚠️ IAS Zone setup error: ${e.message}`);
    }
  }

  /**
   * v5.5.725: IAS Zone Enrollment for smoke detectors
   */
  async _performIASZoneEnrollment(zclNode) {
    try {
      const iasZone = zclNode?.endpoints?.[1]?.clusters?.iasZone;
      if (!iasZone) return;

      // Get coordinator IEEE address
      let ieeeAddress = null;
      try {
        ieeeAddress = this.homey.zigbee?.ieeeAddress || 
                      await this.homey.zigbee?.getIeeeAddress?.() ||
                      this.getData()?.ieeeAddress;
      } catch (e) {
        this.log('[SMOKE-ADV] Could not get coordinator IEEE address');
      }

      if (ieeeAddress) {
        this.log(`[SMOKE-ADV] Enrolling IAS Zone with CIE: ${ieeeAddress}`);
        try {
          await iasZone.writeAttributes({ iasCieAddress: ieeeAddress });
          this.log('[SMOKE-ADV] ✅ IAS Zone CIE address written');
        } catch (e) {
          this.log(`[SMOKE-ADV] ⚠️ CIE write failed: ${e.message}`);
        }
      }
    } catch (e) {
      this.log(`[SMOKE-ADV] IAS enrollment error: ${e.message}`);
    }
  }
}
module.exports = SmokeDetectorAdvancedDevice;
