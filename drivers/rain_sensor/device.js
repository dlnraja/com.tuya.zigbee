'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');
const { boolean } = require('../../lib/converters/ValueConverterRegistry');

/**
 * Rain Sensor Device
 * v9.7.4: FIX for Issue #326 - _TZE200_u6x1zyv2 pairs but reports no values
 *         Added DP 2 → measure_humidity (rain level %) and DP 106 mappings
 *         Fixed TS0601 rain sensors using Tuya EF00 DP protocol
 * v5.5.889: Added IAS Zone support for TS0207 devices (Dominique_C forum report)
 * v5.3.64: SIMPLIFIED base implementation
 */
class RainSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_water', 'measure_humidity', 'measure_battery'];
  }

    get dpMappings() {
    const mfr = typeof this.getSetting === 'function' ? (this.getSetting('zb_manufacturer_name') || '') : '';

    // ── TS0601 HOBEIAN variants (ZG-223Z) ──
    if (includesCI(mfr, 'u6x1zyv2') || includesCI(mfr, 'jsaqgakf') || includesCI(mfr, '2pddnnrk')) {
      return {
        1: { capability: 'alarm_water', transform: (v) => v !== 0 && v !== '0' && v !== false && v !== 'false' && v !== 'normal' },
        2: { capability: 'measure_humidity', divisor: 1 },
        102: { capability: 'measure_luminance', divisor: 1 },
        4: { capability: 'measure_battery', divisor: 1 },
        104: { capability: 'measure_battery', divisor: 1 },
        106: { capability: 'measure_humidity', divisor: 1 }
      };
    }

    // ── TS0207 Solar Rain Sensor (RB-SRAIN01) ──
    // _TZ3210_tgvtvdoc / _TZ3210_p68kms0l
    // Per Z2M: DP4=battery, DP101=solar mV, DP102=avg20min mV,
    //   DP103=maxToday mV, DP104=cleaning reminder, DP105=rain intensity mV
    // Rain detection: IAS Zone (cluster 0x0500, zoneType "rain") + DP105 fallback
    // v9.0.40 FIX (#417): Map solar voltage to measure_luminance (declared capability),
    //   use measure_humidity for rain intensity, keep alarm_water from DP105 + IAS Zone
    if (includesCI(mfr, 'tgvtvdoc') || includesCI(mfr, 'p68kms0l')) {
      return {
        4:  { capability: 'measure_battery', divisor: 1 },                    // Battery %
        101: { capability: 'measure_luminance', divisor: 1 },                 // Solar voltage (mV) -> illuminance
        102: { capability: 'measure_humidity', divisor: 1 },                  // Avg 20min solar mV -> humidity (secondary metric)
        105: { capability: 'alarm_water', transform: (v) => typeof v === 'number' ? v > 50 : !!v } // Rain intensity > 50mV = raining
      };
    }

    // ── TS0601 generic fallback ──
    return {
      // TS0601 DP layout (_TZE200_u6x1zyv2, _TZE200_jsaqgakf, etc.)
      1: { capability: 'alarm_water', transform: boolean() }, // Rain alarm boolean
      2: { capability: 'measure_humidity', divisor: 1 }, // Rain level 0-100% (mapped as humidity)
      4: { capability: 'measure_battery', divisor: 1 },  // Battery %
      // TS0207 and some TS0601 variants
      15: { capability: 'measure_battery', divisor: 1 },
      101: { capability: 'measure_luminance', divisor: 1 }, // Illuminance (lux)
      105: { capability: 'alarm_water', transform: (v) => typeof v === 'number' ? v > 0 : (v !== 0 && v !== false) }, // Rain intensity -> rain alarm
      106: { capability: 'measure_humidity', divisor: 1 }  // Rain level on some variants
    };
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 100,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    // v8.4.1: _registerCapabilityListeners removed — UnifiedSensorBase uses
    // capability listeners via dpMappings + UnifiedSensorBase native handlers
    
    // v5.5.889: IAS Zone support for TS0207 rain sensors
    await this._setupIASZone(zclNode);
    
    this.log('[RAIN]  Rain sensor ready');
  }

  /**
   * v5.5.889/v9.7.5/v9.7.6: IAS Zone setup for TS0207 devices
   * These devices use IAS Zone cluster (0x0500) for rain detection
   * Z2M reference: extend: [m.iasZoneAlarm({zoneType: "rain", zoneAttributes: ["alarm_1"]})]
   *
   * v9.7.6: Added onReport listener for zoneStatus attribute reports
   *         which is the primary mechanism for TS0207 rain detection
   */
  async _setupIASZone(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[RAIN-IAS] No endpoint 1 found');
        return;
      }

      // v9.7.5: Try to bind IAS Zone cluster (0x0500) if not already present
      let iasCluster = endpoint.clusters?.iasZone || endpoint.clusters?.ssIasZone;
      if (!iasCluster && typeof endpoint.bind === 'function') {
        try {
          await endpoint.bind('iasZone');
          iasCluster = endpoint.clusters?.iasZone || endpoint.clusters?.ssIasZone;
          this.log('[RAIN-IAS] IAS Zone cluster bound successfully');
        } catch (bindErr) {
          this.log('[RAIN-IAS] IAS Zone bind attempt:', bindErr.message);
        }
      }

      // v9.7.6: Also try binding via numeric cluster ID (0x0500 = 1280)
      if (!iasCluster && typeof endpoint.bind === 'function') {
        try {
          await endpoint.bind(1280);
          iasCluster = endpoint.clusters?.iasZone || endpoint.clusters?.ssIasZone;
          if (iasCluster) {
            this.log('[RAIN-IAS] IAS Zone cluster bound via numeric ID');
          }
        } catch (bindErr) {
          this.log('[RAIN-IAS] IAS Zone bind via numeric ID attempt:', bindErr.message);
        }
      }

      if (!iasCluster) {
        this.log('[RAIN-IAS] No IAS Zone cluster available - TS0207 may use EF00 DP for rain');
        return;
      }

      this.log('[RAIN-IAS] IAS Zone cluster found - setting up rain detection');

      // Handle Zone Enroll Request (IAS Zone enrollment for coordinator)
      if (typeof iasCluster.zoneEnrollRequest === 'function' || iasCluster.onZoneEnrollRequest !== undefined) {
        iasCluster.onZoneEnrollRequest = async (payload) => {
          this.log('[RAIN-IAS] Zone Enroll Request received:', payload);
          try {
            await iasCluster.zoneEnrollResponse({
              enrollResponseCode: 0, // Success
              zoneId: 23
            });
            this.log('[RAIN-IAS] Zone Enroll Response sent');
          } catch (err) {
            this.log('[RAIN-IAS] Zone enroll response error:', err.message);
          }
        };
      }

      // Try to write CIE address
      try {
        const homeyIeeeAddress = this.homey.zigbee?.getNetwork?.()?.ieeeAddress;
        if (homeyIeeeAddress) {
          await iasCluster.writeAttributes({ iasCieAddress: homeyIeeeAddress });
          this.log('[RAIN-IAS] CIE address written:', homeyIeeeAddress);
        }
      } catch (cieErr) {
        this.log('[RAIN-IAS] CIE address write (normal if already set):', cieErr.message);
      }

      // Zone Status Change Notification (rain detected via IAS Zone)
      iasCluster.onZoneStatusChangeNotification = (payload) => {
        const parsed = this._parseIASZoneStatus(payload?.zoneStatus);
        const raining = parsed.alarm1 || parsed.alarm2;

        this.log(`[RAIN-IAS] Zone status: raw=${parsed.raw} alarm1=${parsed.alarm1} alarm2=${parsed.alarm2} raining=${raining}`);

        if (this.hasCapability('alarm_water')) {
          this.safeSetCapabilityValue('alarm_water', raining).catch(this.error);
        }
      };

      // Attribute listener for zone status (SDK3 event-based)
      iasCluster.on('attr.zoneStatus', (status) => {
        const raining = (status & 0x01) !== 0 || (status & 0x02) !== 0;
        this.log(`[RAIN-IAS] Zone attr status: ${status} raining=${raining}`);

        if (this.hasCapability('alarm_water')) {
          this.safeSetCapabilityValue('alarm_water', raining).catch(this.error);
        }
      });

      this.log('[RAIN-IAS] IAS Zone listeners configured');

      // v9.7.6: Also try to configure attribute reporting for zoneStatus
      // This ensures the device sends zone status updates periodically
      try {
        await this.configureAttributeReporting([{
          cluster: 'iasZone',
          attributeName: 'zoneStatus',
          minInterval: 1,
          maxInterval: 300,
          minChange: 1,
        }]);
        this.log('[RAIN-IAS] Zone status attribute reporting configured');
      } catch (reportErr) {
        this.log('[RAIN-IAS] Zone status reporting config (may not be supported):', reportErr.message);
      }
    } catch (err) {
      this.log('[RAIN-IAS] Setup error:', err.message);
    }
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') {this._updateLastSeen();}
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager?.forceRecovery?.();
    }
  }
}

module.exports = RainSensorDevice;

