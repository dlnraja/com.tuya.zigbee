'use strict';
const CI = require('../../lib/utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { WakeStrategies } = require('../../lib/tuya/TuyaGatewayEmulator');

/**
 * Motion Sensor Radar mmWave Device - v5.5.275 MODEL-SPECIFIC CONFIGS
 *
 * Sources:
 * - Z2M: TS0601_HOBEIAN_RADAR (ZG-204ZV)
 * - Hubitat: TS0601_HOBEIAN_RADAR profile
 * - Phoscon: TS0601 presence + light sensor
 */

const MODEL_CONFIGS = {
  // SIMPLE radars - basic presence only (no distance/time)
  SIMPLE: {
    models: [
      '_TZE200_rhgsbacq', '_TZE200_kb5noeto', '_TZE200_5b5noeto',
      '_TZE200_bh3n6gk8', '_TZE200_1ibpyhdc', '_TZE200_ttcovulf',
      '_TZE200_sgpeacqp', '_TZE200_holel4dk',
    ],
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery'],
    dps: [1, 4, 12, 15],  // Only query these DPs
  },
  // ADVANCED radars - full features
  ADVANCED: {
    models: [
      '_TZE200_2aaelwxk', '_TZE200_3towulqd',
      '_TZE204_ijxvkhd0', '_TZE204_qasjif9e', '_TZE204_sxm7l9xa',
      '_TZE284_fwondbzy',
    ],
    capabilities: ['alarm_motion', 'alarm_human', 'measure_luminance.distance', 'measure_presence_time', 'measure_luminance', 'measure_battery'],
    dps: [1, 2, 3, 4, 9, 10, 11, 12, 15, 101, 102, 103, 104, 105],
  },
  // RELAY radars - MTG/Wenzhi presence sensors with relay output
  RELAY: {
    models: [
      '_TZE204_clrdrnya', '_TZE200_clrdrnya', '_TZE204_sbyx0lm6', '_TZE200_sbyx0lm6',
      '_TZE204_dtzziy1e', '_TZE204_mtoaryre', '_TZE200_mp902om5', '_TZE204_pfayrzcw',
      '_TZE284_4qznlkbu',
    ],
    capabilities: ['alarm_motion', 'onoff', 'measure_luminance.distance', 'measure_luminance'],
    mainsPowered: true,
    dps: [1, 2, 3, 4, 6, 9, 104, 107, 108, 109, 110],
  },
};

function getModelConfig(manufacturerName) {
  for (const [type, config] of Object.entries(MODEL_CONFIGS)) {
    if (CI.includesCI(config.models, manufacturerName)) {
      return { type, ...config };
    }
  }
  return { type: 'ADVANCED', ...MODEL_CONFIGS.ADVANCED };
}

class MotionSensorRadarDevice extends UnifiedSensorBase {
  get mainsPowered() {
    const config = this._getModelConfig();
    return config.mainsPowered === true;
  }

  static OFFLINE_CHECK_MS = 60 * 60 * 1000;

  _getModelConfig() {
    if (!this._modelConfig) {
      const mfr = this.getSetting?.('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
      this._modelConfig = getModelConfig(mfr);
      this.log(`[MMWAVE]  Model config: ${this._modelConfig.type} for ${mfr}`);
    }
    return this._modelConfig;
  }

  get sensorCapabilities() {
    const config = this._getModelConfig();
    return config.capabilities;
  }

  get dpMappings() {
    const config = this._getModelConfig();
    if (config.type === 'RELAY') return this._relayDpMappings;
    return this._defaultDpMappings;
  }

  get _defaultDpMappings() {
    return {
      1: {
        capability: 'alarm_motion',
        transform: (v) => v === 1 || v === true,
        alsoSets: { 'alarm_human': (v) => v === 1 || v === true }
      },
      2: { capability: 'measure_humidity', divisor: 1 },
      3: { capability: 'measure_temperature', divisor: 10 },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      9: { capability: 'radar_sensitivity', isSetting: true },
      10: { capability: 'minimum_range', isSetting: true },
      11: { capability: 'maximum_range', isSetting: true },
      12: { capability: 'measure_luminance', divisor: 1 },
      101: {
        capability: 'measure_presence_time',
        divisor: 1,
        alsoSetsMotion: true
      },
      102: {
        capability: 'measure_luminance.distance',
        divisor: 1
      },
      103: { capability: 'measure_luminance', divisor: 1 },
      104: { capability: 'fading_time', isSetting: true },
      105: { capability: 'detection_delay', isSetting: true },
      107: { capability: 'indicator', isSetting: true },
      108: { capability: 'small_detection_distance', isSetting: true },
      109: { capability: 'small_detection_sensitivity', isSetting: true },
    };
  }

  get _relayDpMappings() {
    return {
      1: {
        capability: 'alarm_motion',
        transform: (v) => v === 1 || v === true
      },
      2: { capability: 'radar_sensitivity', isSetting: true },
      3: { capability: 'shield_range', isSetting: true },
      4: { capability: 'detection_range', isSetting: true },
      6: { capability: 'equipment_status', internal: true },
      9: { capability: 'measure_luminance.distance', divisor: 100 },
      104: { capability: 'measure_luminance', divisor: 10 },
      107: { capability: 'breaker_mode', isSetting: true },
      108: {
        capability: 'onoff',
        transform: (v) => v === 1 || v === true
      },
      109: { capability: 'status_indication', isSetting: true },
      110: { capability: 'illuminance_threshold', isSetting: true },
    };
  }

  async onNodeInit({ zclNode }) {
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
          cluster: 'msIlluminanceMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
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

    if (this.hasCapability('alarm_contact')) {
      await this.removeCapability('alarm_contact').catch(() => { });
      this.log('[MMWAVE]  Removed incorrect alarm_contact capability');
    }

    const config = this._getModelConfig();
    if (config.type === 'RELAY') {
      if (!this.hasCapability('onoff')) {
        await this.addCapability('onoff').catch(() => {});
        this.log('[MMWAVE]  Added onoff capability for relay');
      }
      for (const cap of ['measure_temperature', 'measure_humidity', 'alarm_human', 'measure_presence_time']) {
        if (this.hasCapability(cap)) {
          await this.removeCapability(cap).catch(() => {});
          this.log(`[MMWAVE]  Removed incorrect ${cap} for RELAY model`);
        }
      }
    }

    this.log('[MMWAVE]  mmWave radar presence sensor ready');
    this.log('[MMWAVE] Model type:', config.type);

    if (config.type === 'RELAY' && this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        this.log(`[MMWAVE]  Relay control: ${value ? 'ON' : 'OFF'} (DP108)`);
        const tuya = zclNode?.endpoints?.[1]?.clusters?.tuya;
        if (tuya?.datapoint) {
          await tuya.datapoint({ dp: 108, value: value ? 1 : 0, type: 'enum' });
        }
      });
    }

    await this._setupOccupancyCluster(zclNode);
    await this._setupIASMotionListener(zclNode);
    this._lastEventTime = Date.now();
    this._setupOfflineCheck();
    await this._setupContinuousLuminanceReporting(zclNode);
    this._sendInitialDataQuery();
    this._setupWakeStrategies();
  }

  async _setupContinuousLuminanceReporting(zclNode) {
    if (!this.hasCapability('measure_luminance')) return;
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const illuminanceCluster = endpoint?.clusters?.illuminanceMeasurement
          || endpoint?.clusters?.msIlluminanceMeasurement
          || endpoint?.clusters?.[0x0400];

      if (illuminanceCluster) {
        try {
          await illuminanceCluster.configureReporting({
            measuredValue: {
              minInterval: 30,
              maxInterval: 300,
              minChange: 50
            }
          });
          illuminanceCluster.on('attr.measuredValue', async (value) => {
            if (value !== null && value !== undefined && value >= 0) {
              await this._safeSetCapability('measure_luminance', parseFloat(value)).catch(() => { });
            }
          });
        } catch (configError) {
          this.log('[LUMINANCE-FIX]  Configure reporting failed:', configError.message);
        }
      }
      this._setupPeriodicLuminanceQuery();
    } catch (error) {
      this.log('[LUMINANCE-FIX]  Setup error:', error.message);
    }
  }

  _setupPeriodicLuminanceQuery() {
    if (this._luminanceQueryTimer) clearInterval(this._luminanceQueryTimer);
    this._luminanceQueryTimer = setInterval(async () => {
      try {
        if (this.safeTuyaDataQuery) {
          await this.safeTuyaDataQuery([12, 103], {
            logPrefix: '[LUMINANCE-PERIODIC]',
            delayBetweenQueries: 100,
            timeout: 3000
          });
        }
      } catch (e) { }
    }, 2 * 60 * 1000);
  }

  async _setupWakeStrategies() {
    try {
      const config = this._getModelConfig();
      const allDPs = config.dps || [1, 4, 12, 15];
      await WakeStrategies.onAnyDataReceived(this, allDPs, async (dps) => {
        if (this.safeTuyaDataQuery) {
          await this.safeTuyaDataQuery(dps, {
            logPrefix: '[MMWAVE-WAKE]',
            delayBetweenQueries: 50
          });
        }
      });
      await WakeStrategies.configureReporting(this).catch(() => { });
      await WakeStrategies.readAttributes(this).catch(() => { });
    } catch (err) { }
  }

  _setupOfflineCheck() {
    if (this._offlineCheckTimer) clearInterval(this._offlineCheckTimer);
    this._offlineCheckTimer = setInterval(() => {
      const elapsed = Date.now() - this._lastEventTime;
      const threshold = MotionSensorRadarDevice.OFFLINE_CHECK_MS;
      if (elapsed > threshold) {
        this.setUnavailable('Pas de signal depuis 60+ minutes').catch(() => { });
      } else {
        this.setAvailable().catch(() => { });
      }
    }, 10 * 60 * 1000);
  }

  async _sendInitialDataQuery() {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this._sendTuyaDataQuery?.().catch(() => { });
    } catch (err) { }
  }

  _updateLastEventTime() {
    this._lastEventTime = Date.now();
    this.setAvailable().catch(() => { });
  }

  async refreshAll() {
    const config = this._getModelConfig();
    return this.safeTuyaDataQuery(config.dps, {
      logPrefix: '[RADAR-REFRESH]',
      delayBetweenQueries: 150,
    });
  }

  async onDeleted() {
    if (this._offlineCheckTimer) clearInterval(this._offlineCheckTimer);
    if (this._luminanceQueryTimer) clearInterval(this._luminanceQueryTimer);
    await super.onDeleted?.();
  }

  async _setupOccupancyCluster(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const occCluster = endpoint?.clusters?.occupancySensing || endpoint?.clusters?.msOccupancySensing;
      if (occCluster) {
        occCluster.on('attr.occupancy', (value) => {
          this._updateLastEventTime();
          const motion = value > 0;
          if (this.hasCapability('alarm_motion')) {
            this.setCapabilityValue('alarm_motion', motion).catch(this.error);
          }
        });
        try {
          const attrs = await occCluster.readAttributes(['occupancy']);
          if (attrs?.occupancy !== undefined) {
            const motion = attrs.occupancy > 0;
            if (this.hasCapability('alarm_motion')) {
              this.setCapabilityValue('alarm_motion', motion).catch(this.error);
            }
          }
        } catch (e) { }
      }
    } catch (err) { }
  }

  async _setupIASMotionListener(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const iasCluster = endpoint?.clusters?.iasZone || endpoint?.clusters?.ssIasZone;
      if (iasCluster) {
        iasCluster.onZoneStatusChangeNotification = (payload) => {
          this._updateLastEventTime();
          const parsed = this._parseIASZoneStatus(payload?.zoneStatus);
          const motion = parsed.alarm1 || parsed.alarm2;
          if (this.hasCapability('alarm_motion')) {
            this.setCapabilityValue('alarm_motion', motion).catch(this.error);
          }
        };
        iasCluster.on('attr.zoneStatus', (status) => {
          this._updateLastEventTime();
          const motion = (status & 0x01) !== 0 || (status & 0x02) !== 0;
          if (this.hasCapability('alarm_motion')) {
            this.setCapabilityValue('alarm_motion', motion).catch(this.error);
          }
        });
      }
    } catch (err) { }
  }

  onTuyaStatus(status) {
    if (!status || status.dp === undefined) {
      super.onTuyaStatus(status);
      return;
    }
    this._updateLastEventTime();
    const rawValue = status.data || status.value;
    switch (status.dp) {
    case 1:
      this.log(`[ZCL-DATA] mmwave.presence_dp1 raw=${rawValue}  alarm_motion=${rawValue === 1 || rawValue === true}`);
      break;
    case 101:
      if (rawValue > 0 && this.hasCapability('alarm_motion')) {
        this.setCapabilityValue('alarm_motion', true).catch(this.error);
      }
      break;
    case 102:
      if (rawValue > 0 && this.hasCapability('alarm_motion')) {
        this.setCapabilityValue('alarm_motion', true).catch(this.error);
      }
      break;
    }
    super.onTuyaStatus(status);
  }

  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    if (this._dataRecoveryManager) this._dataRecoveryManager.triggerRecovery();
  }
}

module.exports = MotionSensorRadarDevice;
