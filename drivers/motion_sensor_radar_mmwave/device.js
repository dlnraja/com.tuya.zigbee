'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

/**
 * RadarMotionSensorMmwaveDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class RadarMotionSensorMmwaveDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('RadarMotionSensorMmwaveDevice initializing...');

    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // Detect available clusters
    const endpoint = zclNode?.endpoints?.[1];
    const hasTuyaCluster = !!(endpoint?.clusters?.tuya || endpoint?.clusters?.manuSpecificTuya || endpoint?.clusters?.[61184]);
    const hasIASZone = !!endpoint?.clusters?.iasZone;
    const hasTemperature = !!endpoint?.clusters?.temperatureMeasurement;
    const hasHumidity = !!endpoint?.clusters?.relativeHumidity;
    const hasIlluminance = !!endpoint?.clusters?.illuminanceMeasurement;
    const hasBattery = !!endpoint?.clusters?.powerConfiguration;

    this.log(`[RADAR] Clusters: Tuya=${hasTuyaCluster}, IAS=${hasIASZone}, Temp=${hasTemperature}, Hum=${hasHumidity}, Lux=${hasIlluminance}, Batt=${hasBattery}`);

    // Setup Tuya DP for presence (primary)
    if (hasTuyaCluster) {
      await this._setupTuyaDPListener();
    } else if (hasIASZone) {
      await this.setupIASZone();
    }

    // ZG-204ZM is a 5-in-1 multi-sensor like Aqara FP300!
    // Setup standard ZCL clusters for additional sensors
    await this._setupZCLClusters({ hasTemperature, hasHumidity, hasIlluminance, hasBattery });

    this.log('RadarMotionSensorMmwaveDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  /**
   * Setup standard ZCL clusters for multi-sensor support
   * ZG-204ZM (_TZE200_rhgsbacq) has: temperature, humidity, illuminance, battery
   * Similar to Aqara FP300 5-in-1 sensor
   */
  async _setupZCLClusters({ hasTemperature, hasHumidity, hasIlluminance, hasBattery }) {
    const { CLUSTER } = require('zigbee-clusters');

    // Temperature (cluster 1026)
    if (hasTemperature && this.hasCapability('measure_temperature')) {
      this.log('[RADAR] Setting up temperature cluster...');
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value !== -32768 ? Math.round(value) / 100 : null
      });
    }

    // Humidity (cluster 1029)
    if (hasHumidity && this.hasCapability('measure_humidity')) {
      this.log('[RADAR] Setting up humidity cluster...');
      this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value !== 32768 ? Math.round(value) / 100 : null
      });
    }

    // Illuminance (cluster 1024)
    if (hasIlluminance && this.hasCapability('measure_luminance')) {
      this.log('[RADAR] Setting up illuminance cluster (ZCL)...');
      this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value > 0 ? Math.round(Math.pow(10, (value - 1) / 10000)) : 0
      });
    }

    // Battery (cluster 1)
    if (hasBattery && this.hasCapability('measure_battery')) {
      this.log('[RADAR] Setting up battery cluster...');
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => Math.round(value / 2) // 0-200 -> 0-100%
      });
    }

    // Configure attribute reporting for all clusters
    try {
      const reportingConfig = [];

      if (hasTemperature) {
        reportingConfig.push({
          endpointId: 1,
          cluster: CLUSTER.TEMPERATURE_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 50 // 0.5°C
        });
      }

      if (hasHumidity) {
        reportingConfig.push({
          endpointId: 1,
          cluster: CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 100 // 1%
        });
      }

      if (hasIlluminance) {
        reportingConfig.push({
          endpointId: 1,
          cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 500
        });
      }

      if (hasBattery) {
        reportingConfig.push({
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2
        });
      }

      if (reportingConfig.length > 0) {
        await this.configureAttributeReporting(reportingConfig).catch(err => {
          this.log('[RADAR] Reporting config failed (non-critical):', err.message);
        });
        this.log('[RADAR] ZCL reporting configured');
      }
    } catch (err) {
      this.log('[RADAR] ZCL setup error:', err.message);
    }
  }

  /**
   * Setup Tuya DP listener for radar sensors (ZG-204ZM, _TZE200_rhgsbacq)
   *
   * DP Mapping from DeviceFingerprintDB:
   * - DP 1: presence (boolean) -> alarm_motion
   * - DP 9: sensitivity (0-9)
   * - DP 15: battery (%)
   * - DP 101: illuminance (lux) -> measure_luminance
   */
  async _setupTuyaDPListener() {
    this.log('[RADAR] Setting up Tuya DP listener for radar sensor...');

    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[RADAR] ⚠️ No endpoint 1 found');
      return;
    }

    // Find Tuya cluster
    const tuyaCluster = endpoint.clusters?.tuya
      || endpoint.clusters?.manuSpecificTuya
      || endpoint.clusters?.[61184];

    if (!tuyaCluster) {
      this.log('[RADAR] ⚠️ No Tuya cluster found');
      return;
    }

    this.log('[RADAR] ✅ Tuya cluster found, configuring DP listener...');

    // Listen for DP reports via TuyaEF00Manager (if integrated)
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._handleRadarDP(dpId, value);
      });
      this.log('[RADAR] ✅ Using TuyaEF00Manager');
      return;
    }

    // Fallback: Direct cluster listener
    if (typeof tuyaCluster.on === 'function') {
      tuyaCluster.on('dataReport', (data) => {
        this.log('[RADAR] 📥 Raw dataReport:', JSON.stringify(data));
        if (data && data.dp !== undefined) {
          this._handleRadarDP(data.dp, data.value);
        }
      });
    }

    // Property-based listener
    tuyaCluster.onDataReport = (data) => {
      if (data && data.dp !== undefined) {
        this._handleRadarDP(data.dp, data.value);
      }
    };

    this.log('[RADAR] ✅ Tuya DP listener configured');

    // Request initial data
    this._requestRadarDPs();
  }

  /**
   * Handle incoming Tuya DP for radar sensors (FP300-like features)
   *
   * Extended DP Mapping (Zigbee2MQTT ZY-M100/ZG-204ZM):
   * - DP 1: presence (boolean)
   * - DP 2: radar_sensitivity (0-9) [ZY-M100]
   * - DP 3: minimum_range (m * 100) [ZY-M100]
   * - DP 4: maximum_range (m * 100) [ZY-M100]
   * - DP 9: sensitivity (0-9) [ZG-204ZM]
   * - DP 15: battery (%)
   * - DP 101: illuminance (lux) / detection_delay (s * 10)
   * - DP 102: detection_delay (s * 10) / fading_time (s * 10)
   * - DP 103: fading_time (s * 10) / target_distance (cm)
   * - DP 104: target_distance (cm) / illuminance (lux)
   * - DP 105: illuminance (lux) [some models]
   * - DP 106: illuminance threshold
   * - DP 107: presence_state (enum)
   * - DP 108: motion_state (enum)
   */
  _handleRadarDP(dpId, value) {
    this.log(`[RADAR] 📊 DP${dpId} = ${value}`);

    switch (dpId) {
      // ═══════════════════════════════════════════════════════════════
      // PRESENCE DETECTION
      // ═══════════════════════════════════════════════════════════════
      case 1: // Presence (boolean)
        const presence = Boolean(value);
        this.log(`[RADAR] 👤 Presence: ${presence ? 'DETECTED' : 'clear'}`);
        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', presence).catch(this.error);
        }
        // Trigger flow
        this._triggerPresenceFlow(presence);
        break;

      case 107: // Presence state (enum: none=0, presence=1, move=2)
        const presenceStates = { 0: 'none', 1: 'presence', 2: 'move' };
        const pState = presenceStates[value] || 'unknown';
        this.log(`[RADAR] 👤 Presence state: ${pState}`);
        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', value > 0).catch(this.error);
        }
        break;

      case 108: // Motion state (enum: none=0, small=1, large=2)
        const motionStates = { 0: 'none', 1: 'small_move', 2: 'large_move' };
        this.log(`[RADAR] 🏃 Motion state: ${motionStates[value] || value}`);
        break;

      // ═══════════════════════════════════════════════════════════════
      // SENSITIVITY & RANGE (FP300-like)
      // ═══════════════════════════════════════════════════════════════
      case 2: // Radar sensitivity (ZY-M100 style: 0-9)
      case 9: // Sensitivity (ZG-204ZM style: 0-9)
        this.log(`[RADAR] 📐 Sensitivity: ${value}/9`);
        this.setStoreValue('radar_sensitivity', value).catch(this.error);
        break;

      case 3: // Minimum range (m * 100, e.g., 150 = 1.5m)
        const minRange = value / 100;
        this.log(`[RADAR] 📏 Min range: ${minRange}m`);
        this.setStoreValue('minimum_range', minRange).catch(this.error);
        break;

      case 4: // Maximum range (m * 100, e.g., 600 = 6m)
        const maxRange = value / 100;
        this.log(`[RADAR] 📏 Max range: ${maxRange}m`);
        this.setStoreValue('maximum_range', maxRange).catch(this.error);
        break;

      // ═══════════════════════════════════════════════════════════════
      // TIMING PARAMETERS
      // ═══════════════════════════════════════════════════════════════
      case 101: // Detection delay (s * 10) OR Illuminance depending on model
        if (value > 1000) {
          // Likely illuminance
          this.log(`[RADAR] 💡 Illuminance: ${value} lux`);
          if (this.hasCapability('measure_luminance')) {
            this.setCapabilityValue('measure_luminance', value).catch(this.error);
          }
        } else {
          // Detection delay
          const detDelay = value / 10;
          this.log(`[RADAR] ⏱️ Detection delay: ${detDelay}s`);
          this.setStoreValue('detection_delay', detDelay).catch(this.error);
        }
        break;

      case 102: // Fading time (s * 10) - absence delay
        const fadingTime = value / 10;
        this.log(`[RADAR] ⏱️ Fading time: ${fadingTime}s (absence delay)`);
        this.setStoreValue('fading_time', fadingTime).catch(this.error);
        break;

      // ═══════════════════════════════════════════════════════════════
      // TARGET DISTANCE (FP300-like)
      // ═══════════════════════════════════════════════════════════════
      case 103: // Target distance (cm) OR fading time
      case 104: // Target distance (cm) OR illuminance
        if (value <= 1000) {
          // Target distance in cm
          const distanceM = value / 100;
          this.log(`[RADAR] 📍 Target distance: ${distanceM}m`);
          if (this.hasCapability('measure_distance')) {
            this.setCapabilityValue('measure_distance', distanceM).catch(this.error);
          }
          this.setStoreValue('target_distance', distanceM).catch(this.error);
        } else {
          // Illuminance
          this.log(`[RADAR] 💡 Illuminance: ${value} lux`);
          if (this.hasCapability('measure_luminance')) {
            this.setCapabilityValue('measure_luminance', value).catch(this.error);
          }
        }
        break;

      // ═══════════════════════════════════════════════════════════════
      // ILLUMINANCE
      // ═══════════════════════════════════════════════════════════════
      case 105: // Illuminance (lux)
        this.log(`[RADAR] 💡 Illuminance: ${value} lux`);
        if (this.hasCapability('measure_luminance')) {
          this.setCapabilityValue('measure_luminance', value).catch(this.error);
        }
        break;

      case 106: // Illuminance threshold (for light automation)
        this.log(`[RADAR] 💡 Illuminance threshold: ${value} lux`);
        this.setStoreValue('illuminance_threshold', value).catch(this.error);
        break;

      // ═══════════════════════════════════════════════════════════════
      // BATTERY
      // ═══════════════════════════════════════════════════════════════
      case 15: // Battery (%)
        const battery = Math.min(100, Math.max(0, value));
        this.log(`[RADAR] 🔋 Battery: ${battery}%`);
        if (this.hasCapability('measure_battery')) {
          this.setCapabilityValue('measure_battery', battery).catch(this.error);
        }
        break;

      default:
        this.log(`[RADAR] ❓ Unknown DP${dpId} = ${value}`);
    }
  }

  /**
   * Trigger presence flow cards
   */
  async _triggerPresenceFlow(presence) {
    try {
      const cardId = presence ? 'radar_presence_detected' : 'radar_presence_cleared';
      const triggerCard = this.homey.flow.getDeviceTriggerCard(cardId);
      if (triggerCard) {
        await triggerCard.trigger(this);
        this.log(`[RADAR] Flow triggered: ${cardId}`);
      }
    } catch (err) {
      // Card may not exist
    }
  }

  /**
   * Request initial DP values from radar sensor
   */
  async _requestRadarDPs() {
    this.log('[RADAR] Requesting initial DP values...');

    // Use TuyaEF00Manager if available
    if (this.tuyaEF00Manager) {
      // Extended DP list for FP300-like features
      const dps = [1, 2, 3, 4, 9, 15, 101, 102, 103, 104, 105];
      for (const dp of dps) {
        await this.tuyaEF00Manager.getData(dp).catch(err => {
          this.log(`[RADAR] DP${dp} request failed (may not exist):`, err.message);
        });
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  /**
   * Set radar sensitivity (0-9) - FP300-like feature
   */
  async setRadarSensitivity(sensitivity) {
    const value = Math.max(0, Math.min(9, Math.round(sensitivity)));
    this.log(`[RADAR] Setting sensitivity to ${value}`);
    await this._sendRadarDP(2, 'value', value);
    await this._sendRadarDP(9, 'value', value); // Try both DPs
  }

  /**
   * Set detection range (min/max in meters) - FP300-like feature
   */
  async setDetectionRange(minRange, maxRange) {
    this.log(`[RADAR] Setting range: ${minRange}m - ${maxRange}m`);
    await this._sendRadarDP(3, 'value', Math.round(minRange * 100));
    await this._sendRadarDP(4, 'value', Math.round(maxRange * 100));
  }

  /**
   * Set fading time (absence delay in seconds) - FP300-like feature
   */
  async setFadingTime(seconds) {
    this.log(`[RADAR] Setting fading time to ${seconds}s`);
    await this._sendRadarDP(102, 'value', Math.round(seconds * 10));
  }

  /**
   * Set detection delay (seconds) - FP300-like feature
   */
  async setDetectionDelay(seconds) {
    this.log(`[RADAR] Setting detection delay to ${seconds}s`);
    await this._sendRadarDP(101, 'value', Math.round(seconds * 10));
  }

  /**
   * Send Tuya DP command
   */
  async _sendRadarDP(dp, dataType, value) {
    try {
      if (this.tuyaEF00Manager) {
        await this.tuyaEF00Manager.setData(dp, value);
        return;
      }

      const endpoint = this.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.tuya ||
        endpoint?.clusters?.manuSpecificTuya ||
        endpoint?.clusters?.[61184];

      if (!tuyaCluster) return;

      const seq = Date.now() % 65535;
      let dataBuffer;

      if (dataType === 'value') {
        dataBuffer = Buffer.alloc(8);
        dataBuffer.writeUInt8(dp, 0);
        dataBuffer.writeUInt8(2, 1); // type: value
        dataBuffer.writeUInt16BE(4, 2);
        dataBuffer.writeUInt32BE(value, 4);
      } else {
        dataBuffer = Buffer.from([dp, 1, 0, 1, value ? 1 : 0]);
      }

      await tuyaCluster.dataRequest({ seq, dpValues: dataBuffer });
      this.log(`[RADAR] Sent DP${dp} = ${value}`);
    } catch (err) {
      this.error('[RADAR] Send DP error:', err.message);
    }
  }

  /**
   * Handle settings changes - FP300-like configuration
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[RADAR] Settings changed:', changedKeys);

    for (const key of changedKeys) {
      switch (key) {
        case 'radar_sensitivity':
          await this.setRadarSensitivity(newSettings.radar_sensitivity);
          break;
        case 'minimum_range':
          await this.setDetectionRange(newSettings.minimum_range, newSettings.maximum_range || 6);
          break;
        case 'maximum_range':
          await this.setDetectionRange(newSettings.minimum_range || 0, newSettings.maximum_range);
          break;
        case 'fading_time':
          await this.setFadingTime(newSettings.fading_time);
          break;
        case 'detection_delay':
          await this.setDetectionDelay(newSettings.detection_delay);
          break;
      }
    }
  }


  /**
   * Setup IAS Zone for Motion detection (SDK3 Compliant)
   *
   * Based on Peter's successful diagnostic patterns:
   * - Temperature/Humidity/Lux work via standard clusters [OK]
   * - IAS Zone requires special SDK3 enrollment method
   *
   * Cluster 1280 (IASZone) - Motion/Alarm detection
   */
  /**
   * Setup IAS Zone (SDK3 - Based on IASZoneEnroller_SIMPLE_v4.0.6.js)
   * Version la plus récente du projet (2025-10-21)
   */
  async setupIASZone() {
    this.log('🔐 Setting up IAS Zone (SDK3 latest method)...');

    const endpoint = this.zclNode.endpoints[1];

    if (!endpoint?.clusters?.iasZone) {
      this.log('[INFO]  IAS Zone cluster not available');
      return;
    }

    try {
      // Step 1: Setup Zone Enroll Request listener (SYNCHRONOUS - property assignment)
      // SDK3: Use property assignment, NOT .on() event listener
      endpoint.clusters.iasZone.onZoneEnrollRequest = async () => {
        this.log('[MSG] Zone Enroll Request received');

        try {
          // Send response IMMEDIATELY (synchronous, no async, no delay)
          await endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0, // 0 = Success
            zoneId: 10
          });

          this.log('[OK] Zone Enroll Response sent (zoneId: 10)');
        } catch (err) {
          this.error('Failed to send Zone Enroll Response:', err.message);
        }
      };

      this.log('[OK] Zone Enroll Request listener configured');

      // Step 2: Send proactive Zone Enroll Response (SDK3 official method)
      // Per Homey docs: "driver could send Zone Enroll Response when initializing
      // regardless of having received Zone Enroll Request"
      this.log('[SEND] Sending proactive Zone Enroll Response...');

      try {
        await endpoint.clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });

        this.log('[OK] Proactive Zone Enroll Response sent');
      } catch (err) {
        // v5.0.5: Detect "Zigbee is starting up" error and retry
        const errorMsg = String(err && err.message || err);
        if (errorMsg.includes('Zigbee is aan het opstarten') || errorMsg.includes('Zigbee is starting')) {
          this.log('[IAS] ⏰ Zigbee stack not ready yet, will retry in 30s...');
          this.log('[IAS] ℹ️  This is normal during Homey startup');

          // Schedule retry (don't await - let init continue)
          this._iasRetryTimeout = setTimeout(() => {
            this.log('[IAS] 🔄 Retrying IAS Zone enrollment...');
            this.setupIASZone().catch(retryErr => {
              this.error('[IAS] ❌ Retry failed:', retryErr.message);
            });
          }, 30000); // 30 seconds
        } else {
          this.log('[WARN]  Proactive response failed (normal if device not ready):', err.message);
        }
      }

      // Step 3: Setup Zone Status Change listener (property assignment)
      // SDK3: Use .onZoneStatusChangeNotification property, NOT .on() event
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = async (payload) => {
        this.log('[MSG] Zone notification received:', payload);

        if (payload && payload.zoneStatus !== undefined) {
          // Convert Bitmap to value if needed
          let status = payload.zoneStatus;
          if (status && typeof status.valueOf === 'function') {
            status = status.valueOf();
          }

          // Check alarm1 bit (motion/alarm detected)
          const alarm = (status & 0x01) !== 0;

          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_motion'} = ${alarm}`);
            try {
              await this.setCapabilityValue('alarm_motion', alarm);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_motion'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_motion'}`, err.message);
              throw err;
            }
          })().catch(this.error);
          this.log(`${alarm ? '[ALARM]' : '[OK]'} Alarm: ${alarm ? 'TRIGGERED' : 'cleared'}`);
        }
      };

      this.log('[OK] Zone Status listener configured');

      // Step 4: Setup Zone Status attribute listener (property assignment)
      // Alternative listener for attribute reports
      endpoint.clusters.iasZone.onZoneStatus = async (zoneStatus) => {
        this.log('[DATA] Zone attribute report:', zoneStatus);

        let status = zoneStatus;
        if (status && typeof status.valueOf === 'function') {
          status = status.valueOf();
        }

        const alarm = (status & 0x01) !== 0;
        await (async () => {
          this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_motion'} = ${alarm}`);
          try {
            await this.setCapabilityValue('alarm_motion', alarm);
            this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_motion'}`);
          } catch (err) {
            this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_motion'}`, err.message);
            throw err;
          }
        })().catch(this.error);
      };

      this.log('[OK] IAS Zone configured successfully (SDK3 latest method)');

    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('RadarMotionSensorMmwaveDevice deleted');

    // v5.0.5: Clear IAS Zone retry timeout
    if (this._iasRetryTimeout) {
      clearTimeout(this._iasRetryTimeout);
      this._iasRetryTimeout = null;
    }

    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = RadarMotionSensorMmwaveDevice;
