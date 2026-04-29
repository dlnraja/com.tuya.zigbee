'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');

// A8: NaN Safety - use safeDivide/safeMultiply
  require('../../lib/devices/UnifiedPlugBase');

/**
 * 
 *       SIREN / ALARM - v5.5.130 ENRICHED (Zigbee2MQTT features)               
 * 
 *   Source: https://www.zigbee2mqtt.io/devices/TS0216.html                     
 *   Features: alarm, volume, duration, melody, strobe                           
 * 
 */
class SirenDevice extends UnifiedPlugBase {

  get plugCapabilities() {
    return ['onoff', 'measure_battery', 'measure_temperature', 'measure_humidity'];
  }

  /**
   * v5.5.130: ENRICHED dpMappings from Zigbee2MQTT TS0216/TS0224
   */
  get dpMappings() {
    return {
      // 
      // ALARM CONTROL
      // 
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      13: { capability: 'onoff', transform: (v) => v === 1 || v === true },

      // 
      // v5.5.130: VOLUME & SOUND from Zigbee2MQTT
      // 
      // Volume (0=low, 1=medium, 2=high or 0-100)
      5: { capability: 'volume_set', transform: (v) => ({ 0: 0.33, 1: 0.66, 2: 1.0 }[v] ?? (v * 100)) },
      // Duration (60-3600 seconds)
      7: { setting: 'duration', writable: true },
      // Melody/Ringtone (melody_1 to melody_5)
      21: { setting: 'melody', writable: true },
      // Alarm type (sound, light, sound+light, normal)
      16: { setting: 'alarm_type', writable: true },

      // 
      // BATTERY
      // 
      14: { internal: true, type: 'battery_low', transform: (v) => v === 1 || v === 'low' }, // SDK3: alarm_battery obsolÃ¨te
      15: { capability: 'measure_battery', divisor: 1 },

      // 
      // ENVIRONMENTAL (some sirens have T/H sensors)
      // 
      104: { capability: 'onoff', transform: (v) => !!v },
      116: { capability: 'volume_set', transform: (v) => ({ 0: 0.33, 1: 0.66, 2: 1.0 }[v] ?? (v * 100)) },
      103: { setting: 'duration', writable: true },
      101: { capability: 'measure_temperature', divisor: 10 },
      102: { capability: 'measure_humidity', divisor: 1 },

      // 
      // v5.5.130: ADDITIONAL FEATURES
      // 
      // Strobe light control
      6: { setting: 'strobe' },
      // Tamper alarm
      4: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },
    };
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'ssIasZone',
          attributeName: 'zoneStatus',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1,
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

    this.log('[SIREN] v5.11.27 - DP13=alarm,DP5=vol,DP7=dur,DP21=melody | ZCL: IAS-WD,EF00');

    // Setup IAS WD cluster (parent doesn't have this)
    await this._setupIasWD(zclNode);

    // Register volume listener (send to BOTH standard DP5 + NEO DP116)
    if (this.hasCapability('volume_set')) {
      this.registerCapabilityListener('volume_set', async (v) => {
        const volume = v < 0.4 ? 0 : (v < 0.7 ? 1 : 2);
        try { await this._sendTuyaDP(5, volume, 'enum'); } catch (e) {}
        try { await this._sendTuyaDP(116, volume, 'enum'); } catch (e) {}
      });
    }

    // Flow cards registered in driver.js (NOT here to avoid double-registration)
    this.log('[SIREN]  Ready');
  }

  async _setupIasWD(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    try {
      this._iasWd = ep1?.clusters?.ssIasWd || ep1?.clusters?.iasWd;
      if (this._iasWd) this.log('[SIREN]  IAS WD cluster available' );
    } catch (e) { /* ignore */ }
  }

  /**
   * Override parent _setOnOff to add IAS WD support
   */
  async _setOnOff(value) {
    this.log(`[SIREN]  Alarm: ${value ? 'ON' : 'OFF'}`);

    // v5.11.27: TS0601=DP13, NEO=DP104, TS0216=DP1
    try { await this._sendTuyaDP(13, !!value, 'bool'); } catch (e) {}
    try { await this._sendTuyaDP(104, !!value, 'bool'); } catch (e) {}
    await super._setOnOff?.(value );

    // Also trigger IAS WD if available
    if (this._iasWd?.startWarning) {
      try {
        await this._iasWd.startWarning({
          warningMode: value ? 1 : 0,
          warningDuration: value ? 30 : 0,
          strobeDutyCycle: value ? 50 : 0,
          strobeLevel: value ? 1 : 0
        });
      } catch (e) { /* ignore */ }
    }
  }

  async _sendTuyaDP(dp, value, type) {
    // v5.11.27: Use tuyaEF00Manager from base class (the ONLY working API for EF00 cluster)
    if (this.tuyaEF00Manager?.sendDatapoint) {
      await this.tuyaEF00Manager.sendDatapoint(dp, value, type);
      return;
    }
    // Fallback: direct cluster write
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya?.datapoint) {
      await tuya.datapoint({ dp, value, type });
    } else {
      this.log(`[SIREN]  No Tuya DP transport for DP${dp}` );
    }
  }



  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = SirenDevice;


