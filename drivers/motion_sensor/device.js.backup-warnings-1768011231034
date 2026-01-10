'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');
const { MotionLuxInference, BatteryInference } = require('../../lib/IntelligentSensorInference');

/**
 * Motion Sensor Device - HybridSensorBase implementation
 *
 * v5.5.317: INTELLIGENT INFERENCE - Infer motion from lux changes when PIR fails
 * v5.5.299: SLEEPY DEVICE COMMUNICATION FIX (@fiek diagnostic d8b86ec9)
 * - Smart ZCL timeout reduction for sleepy devices (5s → 2s)
 * - Prioritize Tuya DP communication over ZCL for battery devices
 * - Skip ZCL queries when device detected as sleeping
 * - Enhanced wake strategy for critical attribute reads
 * - Improved error handling and timeout management
 *
 * v5.5.107: TEMPERATURE FIX (Peter's diagnostic report)
 * - Force add temp/humidity capabilities if clusters detected
 * - Improved cluster detection with multiple name variants
 * - Read temp/humidity on EVERY wake event, not just motion
 *
 * v5.5.104: CRITICAL FIX for 4-in-1 Multisensors (Peter's bug)
 * - Read temp/humidity WHEN device is awake (after motion detection)
 * - Configure reporting for passive updates
 * - These sleepy devices don't respond to queries when sleeping!
 *
 * v5.5.86: Added temperature + humidity for 4-in-1 multisensors
 * Supports: Fantem ZB003-x, Immax 07502L, Generic Tuya Multisensor
 * Source: https://community.home-assistant.io/t/tuya-zigbee-multi-sensor-4-in-1/409780
 */
class MotionSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  /**
   * v5.5.299: Sleepy device detection for smart communication
   * Helps prioritize Tuya DP over ZCL for battery devices
   */
  get isSleepyDevice() { return true; }

  /**
   * v5.5.299: Smart ZCL timeout for sleepy devices
   * Reduces timeout from 5s to 2s to prevent excessive waiting
   */
  get zclTimeout() { return 2000; }

  /**
   * v5.5.113: Only include CORE capabilities by default
   * Temperature and humidity are added dynamically if clusters are detected
   * This fixes the "incorrect labels" issue (Cam's report #604)
   */
  get sensorCapabilities() {
    // Core capabilities only - temp/humidity added dynamically if detected
    return [
      'alarm_motion',
      'measure_battery',
      'measure_luminance',
    ];
  }

  /**
   * v5.5.86: ENHANCED DP MAPPINGS
   * Added temperature/humidity DPs for Fantem ZB003-x and similar 4-in-1 sensors
   * Source: Zigbee2MQTT device definitions
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // MOTION / OCCUPANCY
      // v5.5.228: Fixed DP101 - it's presence_time in seconds, not boolean motion
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },
      101: { capability: null, setting: 'presence_time' },  // Presence time (seconds) - NOT motion boolean!

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_battery', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // LUMINANCE (LUX)
      // ═══════════════════════════════════════════════════════════════════
      3: { capability: 'measure_luminance', divisor: 1 },
      9: { capability: 'measure_luminance', divisor: 1 },
      12: { capability: 'measure_luminance', divisor: 1 },
      102: { capability: 'measure_luminance', divisor: 1 },  // Fantem lux
      106: { capability: 'measure_luminance', divisor: 1 },  // ZG-204ZM radar (v5.5.138)

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.107: TEMPERATURE (for 4-in-1 multisensors) - with validation
      // Fantem ZB003-x, Immax 07502L use these DPs
      // NOTE: transform is applied AFTER divisor, so values are in °C
      // ═══════════════════════════════════════════════════════════════════
      5: {
        capability: 'measure_temperature',
        divisor: 10,
        transform: (v) => (v >= -40 && v <= 80) ? Math.round(v * 10) / 10 : null
      },
      18: {
        capability: 'measure_temperature',
        divisor: 10,
        transform: (v) => (v >= -40 && v <= 80) ? Math.round(v * 10) / 10 : null
      },
      103: {
        capability: 'measure_temperature',
        divisor: 10,
        transform: (v) => (v >= -40 && v <= 80) ? Math.round(v * 10) / 10 : null
      },

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.107: HUMIDITY (for 4-in-1 multisensors) - with validation
      // ═══════════════════════════════════════════════════════════════════
      6: {
        capability: 'measure_humidity',
        divisor: 1,
        transform: (v) => (v >= 0 && v <= 100) ? Math.round(v) : null
      },
      19: {
        capability: 'measure_humidity',
        divisor: 1,
        transform: (v) => (v >= 0 && v <= 100) ? Math.round(v) : null
      },
      104: {
        capability: 'measure_humidity',
        divisor: 1,
        transform: (v) => (v >= 0 && v <= 100) ? Math.round(v) : null
      },

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.139: ZG-204ZM RADAR SENSOR DPs (24GHz mmWave)
      // Source: https://github.com/Koenkk/zigbee2mqtt/issues/21919
      // ═══════════════════════════════════════════════════════════════════
      // DP1 = presence (also mapped above as alarm_motion)
      // DP2 = large_motion_detection_sensitivity (0-10)
      // DP4 = large_motion_detection_distance (/100 = meters) - also battery above

      // DP101 = motion_state (0=none, 1=large, 2=medium, 3=small)
      // 101 already mapped to alarm_motion above

      // DP102 = fading_time (presence keep time in seconds)
      // 102 already mapped to measure_luminance above for Fantem

      // DP104 = medium_motion_detection_distance (/100 = meters)
      // 104 already mapped to measure_humidity for some sensors

      // DP107 = LED indicator (on/off)
      107: { capability: null, setting: 'led_indicator' },

      // DP108 = small_detection_distance (/100 = meters)
      108: { capability: null, setting: 'small_detection_distance' },

      // DP109 = small_detection_sensitivity (0-10)
      109: { capability: null, setting: 'small_detection_sensitivity' },

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.130: SETTINGS from Zigbee2MQTT TS0601_motion_sensor (PIR)
      // https://www.zigbee2mqtt.io/devices/TS0601_motion_sensor.html
      // ═══════════════════════════════════════════════════════════════════
      // O-Sensitivity (enum: sensitive, normal, cautious)
      9: { capability: null, setting: 'o_sensitivity' },
      // V-Sensitivity (enum: speed_priority, normal_priority, accuracy_priority)
      10: { capability: null, setting: 'v_sensitivity' },
      // LED status (ON/OFF)
      13: { capability: null, setting: 'led_status' },
      // Vacancy delay (0-1000 sec)
      110: { capability: null, setting: 'vacancy_delay' },
      // Light-on luminance prefer (0-10000)
      111: { capability: null, setting: 'light_on_luminance_prefer' },
      // Light-off luminance prefer (0-10000)
      112: { capability: null, setting: 'light_off_luminance_prefer' },
      // Mode (general_model, temporary_stay, basic_detection, sensor_test)
      113: { capability: null, setting: 'mode' },
      // Keep time (seconds)
      105: { capability: null, setting: 'keep_time' },

      // Tamper alarm
      20: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },
    };
  }

  /**
   * v5.5.86: ZCL cluster handlers for 4-in-1 multisensors
   * These sensors report via standard ZCL clusters (0x0402, 0x0405)
   */
  get clusterHandlers() {
    return {
      // Temperature cluster (0x0402) - v5.5.107: Add sanity check
      temperatureMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined && data.measuredValue !== -32768) {
            const temp = Math.round((data.measuredValue / 100) * 10) / 10;
            // v5.5.107: Sanity check - ignore extreme values
            if (temp >= -40 && temp <= 80) {
              this.log(`[ZCL] 🌡️ Temperature: ${temp}°C (raw: ${data.measuredValue})`);
              this._registerZigbeeHit?.();
              this._lastTempSource = 'ZCL';
              this.setCapabilityValue('measure_temperature', temp).catch(() => { });
            } else {
              this.log(`[ZCL] ⚠️ Temperature out of range: ${temp}°C (raw: ${data.measuredValue})`);
            }
          }
        }
      },

      // Humidity cluster (0x0405) - v5.5.107: Add sanity check
      relativeHumidity: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined && data.measuredValue !== 65535) {
            const hum = Math.round(data.measuredValue / 100);
            // v5.5.107: Sanity check - ignore extreme values
            if (hum >= 0 && hum <= 100) {
              this.log(`[ZCL] 💧 Humidity: ${hum}% (raw: ${data.measuredValue})`);
              this._registerZigbeeHit?.();
              this._lastHumSource = 'ZCL';
              this.setCapabilityValue('measure_humidity', hum).catch(() => { });
            } else {
              this.log(`[ZCL] ⚠️ Humidity out of range: ${hum}% (raw: ${data.measuredValue})`);
            }
          }
        }
      },

      // Illuminance cluster (0x0400)
      illuminanceMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const lux = Math.round(Math.pow(10, (data.measuredValue - 1) / 10000));
            this.log(`[ZCL] 💡 Luminance: ${lux} lux`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_luminance', lux).catch(() => { });

            // v5.5.317: Feed lux to motion inference engine
            this._handleLuxForMotionInference(lux);
          }
        }
      },

      // Battery cluster (0x0001)
      // v5.5.366: Added throttling to prevent battery spam (4x4_Pete forum #851)
      powerConfiguration: {
        attributeReport: (data) => {
          if (data.batteryPercentageRemaining !== undefined) {
            // v5.5.366: Throttle battery reports to prevent spam
            const now = Date.now();
            const lastBatteryReport = this._lastBatteryReportTime || 0;
            const throttleMs = MotionSensorDevice.BATTERY_THROTTLE_MS;

            if (now - lastBatteryReport < throttleMs) {
              // Suppress frequent battery reports
              return;
            }
            this._lastBatteryReportTime = now;

            let battery = Math.round(data.batteryPercentageRemaining / 2);
            // v5.5.317: Validate battery with inference
            battery = this._batteryInference?.validateBattery(battery) ?? battery;
            this.log(`[ZCL] 🔋 Battery: ${battery}%`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_battery', battery).catch(() => { });
          }
        }
      }
    };
  }

  async onNodeInit({ zclNode }) {
    // v5.5.228: Remove alarm_contact if wrongly added (motion sensors use alarm_motion only)
    if (this.hasCapability('alarm_contact')) {
      await this.removeCapability('alarm_contact').catch(() => { });
      this.log('[MOTION] ⚠️ Removed incorrect alarm_contact capability');
    }

    // v5.5.113: Detect available clusters BEFORE super.onNodeInit
    // This adds temp/humidity capabilities only if clusters exist
    await this._detectAvailableClusters(zclNode);

    await super.onNodeInit({ zclNode });

    // v5.5.299: Initialize sleepy device state tracking
    this._isDeviceAwake = false;
    this._lastWakeTime = 0;
    this._pendingZclReads = new Set();

    // v5.5.317: Initialize intelligent inference engines
    this._motionLuxInference = new MotionLuxInference(this, {
      luxChangeThreshold: 8,      // 8% change triggers motion inference
      motionHoldTime: 60000,      // Hold motion for 60s
      luxActivityWindow: 5000     // 5s window for activity detection
    });
    this._batteryInference = new BatteryInference(this);
    this._useMotionInference = false; // Enable after detecting PIR issues
    this._pirFailCount = 0;

    // v5.5.355: SMART LUX REPORTING - Independent luminance updates
    this._luxSmartReporting = {
      lastLuxValue: null,
      lastLuxTime: 0,
      luxReportInterval: 5 * 60 * 1000, // 5 minutes base interval
      luxChangeThreshold: 10, // 10% change threshold
      forceReportInterval: 30 * 60 * 1000, // Force report every 30 minutes
      enabled: this.getSetting('smart_lux_reporting') !== false
    };

    // Start smart lux reporting timer
    this._startSmartLuxReporting();

    // v5.5.18: Explicit IAS Zone setup for HOBEIAN and other non-Tuya motion sensors
    await this._setupMotionIASZone(zclNode);

    // v5.5.292: Flow triggers now handled by HybridSensorBase._triggerCustomFlowsIfNeeded()
    this.log('[MOTION] v5.5.292 ✅ Motion sensor ready');
    this.log('[MOTION] Manufacturer:', this.getSetting('zb_manufacturer_name') || 'unknown');
    this.log(`[MOTION] Clusters: temp=${this._hasTemperatureCluster}, hum=${this._hasHumidityCluster}`);
  }

  /**
   * v5.5.335: Manufacturer IDs that DON'T have temp/humidity (PIR only + luminance)
   * Per forum feedback from 4x4_Pete: _TZE200_3towulqd shows incorrect temp/humidity
   * These devices should only show: motion, luminance, battery
   * v5.5.353: Added battery report throttling for ZG-204ZM to prevent spam
   */
  /**
   * v5.5.366: Battery report throttling interval (minimum ms between reports)
   * Prevents "battery spam" on devices that report battery with every DP
   */
  static get BATTERY_THROTTLE_MS() {
    return 300000;  // 5 minutes minimum between battery updates
  }

  static get PIR_ONLY_MANUFACTURERS() {
    return [
      // v5.5.366: Expanded list per 4x4_Pete forum feedback #851
      // These devices only have motion + luminance, NO temp/humidity
      '_TZE200_3towulqd',  // ZG-204ZL PIR only
      '_tze200_3towulqd',
      '_TZE204_3towulqd',
      '_tze204_3towulqd',
      '_TZE200_1ibpyhdc',  // ZG-204ZL variant
      '_tze200_1ibpyhdc',
      '_TZE200_bh3n6gk8',  // ZG-204ZL variant
      '_tze200_bh3n6gk8',
      '_TZE200_2aaelwxk',  // ZG-204ZM battery
      '_tze200_2aaelwxk',
      '_TZE204_2aaelwxk',
      '_tze204_2aaelwxk',
      '_TZE200_kb5noeto',  // ZG-204ZM variant
      '_tze200_kb5noeto',
    ];
  }

  /**
   * v5.5.113: Cluster detection AND dynamic capability addition
   * Only add temp/humidity capabilities if device actually has these clusters
   * Fixes "incorrect labels" issue (Cam's report #604)
   * v5.5.335: Skip temp/humidity for PIR-only devices (4x4_Pete forum feedback)
   */
  async _detectAvailableClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    const clusters = ep1?.clusters || {};
    const clusterNames = Object.keys(clusters);

    this.log(`[MOTION-CLUSTERS] Available clusters: ${clusterNames.join(', ')}`);

    // v5.5.335: Check if this is a PIR-only device that doesn't have temp/humidity
    const manufacturerName = this.getData()?.manufacturerName || this.getSetting('zb_manufacturer_name') || '';
    const isPirOnly = MotionSensorDevice.PIR_ONLY_MANUFACTURERS.includes(manufacturerName);

    if (isPirOnly) {
      this.log(`[MOTION-CLUSTERS] ⚠️ PIR-only device detected: ${manufacturerName}`);
      this.log('[MOTION-CLUSTERS] Skipping temp/humidity - device only has motion + luminance');
      this._hasTemperatureCluster = false;
      this._hasHumidityCluster = false;

      // Remove any incorrectly added capabilities
      if (this.hasCapability('measure_temperature')) {
        await this.removeCapability('measure_temperature').catch(() => { });
        this.log('[MOTION-CLUSTERS] ✅ Removed incorrect measure_temperature');
      }
      if (this.hasCapability('measure_humidity')) {
        await this.removeCapability('measure_humidity').catch(() => { });
        this.log('[MOTION-CLUSTERS] ✅ Removed incorrect measure_humidity');
      }
      return;
    }

    // Check for temperature cluster (0x0402) - ALL possible names
    this._hasTemperatureCluster = !!(
      clusters.temperatureMeasurement ||
      clusters.msTemperatureMeasurement ||
      clusters.genTemperatureMeasurement ||
      clusters[0x0402] ||
      clusters['0x0402'] ||
      clusters['1026']
    );

    // Check for humidity cluster (0x0405) - ALL possible names
    this._hasHumidityCluster = !!(
      clusters.relativeHumidity ||
      clusters.relativeHumidityMeasurement ||
      clusters.msRelativeHumidity ||
      clusters.genRelativeHumidity ||
      clusters[0x0405] ||
      clusters['0x0405'] ||
      clusters['1029']
    );

    // v5.5.113: DYNAMICALLY add capabilities ONLY if clusters detected
    // This prevents "incorrect labels" for simple PIR motion sensors
    if (this._hasTemperatureCluster) {
      if (!this.hasCapability('measure_temperature')) {
        await this.addCapability('measure_temperature').catch(() => { });
        this.log('[MOTION-CLUSTERS] ✅ Added measure_temperature (cluster detected)');
      }
    }

    if (this._hasHumidityCluster) {
      if (!this.hasCapability('measure_humidity')) {
        await this.addCapability('measure_humidity').catch(() => { });
        this.log('[MOTION-CLUSTERS] ✅ Added measure_humidity (cluster detected)');
      }
    }

    this.log(`[MOTION-CLUSTERS] Temperature ZCL: ${this._hasTemperatureCluster}`);
    this.log(`[MOTION-CLUSTERS] Humidity ZCL: ${this._hasHumidityCluster}`);
  }

  /**
   * v5.5.18: Setup IAS Zone for motion detection
   * Required for HOBEIAN ZG-204ZM and similar non-Tuya sensors
   */
  async _setupMotionIASZone(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const iasCluster = endpoint?.clusters?.iasZone || endpoint?.clusters?.ssIasZone;

      if (!iasCluster) {
        this.log('[MOTION-IAS] No IAS Zone cluster');
        return;
      }

      this.log('[MOTION-IAS] IAS Zone cluster found - setting up motion detection');

      // Zone Status Change Notification (motion detected)
      iasCluster.onZoneStatusChangeNotification = (payload) => {
        // v5.5.299: Mark device as awake on ANY motion event
        this._markDeviceAwake();

        // v5.5.17: Use universal parser from HybridSensorBase
        const parsed = this._parseIASZoneStatus(payload?.zoneStatus);
        const motion = parsed.alarm1 || parsed.alarm2;

        this.log(`[ZCL-DATA] motion_sensor.ias_zone raw=${parsed.raw} alarm1=${parsed.alarm1} alarm2=${parsed.alarm2} → motion=${motion}`);

        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        }

        // v5.5.18: Trigger flow card
        if (motion && this.driver?.motionTrigger) {
          this.driver.motionTrigger.trigger(this, {}, {}).catch(this.error);
        }

        // v5.5.104: Read temp/humidity NOW while device is awake (Peter's 4-in-1 fix)
        // v5.5.299: Enhanced with smart wake detection
        if (motion) {
          this._readTempHumidityWhileAwake(zclNode);
        }
      };

      // Attribute listener for zone status
      iasCluster.on('attr.zoneStatus', (status) => {
        // v5.5.299: Mark device as awake on zone status changes
        this._markDeviceAwake();

        const motion = (status & 0x01) !== 0 || (status & 0x02) !== 0;
        this.log(`[ZCL-DATA] motion_sensor.zone_status raw=${status} → alarm_motion=${motion}`);

        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        }

        // v5.5.104: Also read temp/humidity on this event
        // v5.5.299: Enhanced with smart wake detection
        if (motion) {
          this._readTempHumidityWhileAwake(zclNode);
        }
      });

      // Send Zone Enroll Response
      try {
        await iasCluster.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 23
        });
        this.log('[MOTION-IAS] ✅ Zone Enroll Response sent');
      } catch (e) {
        this.log('[MOTION-IAS] Zone enroll (normal if already enrolled):', e.message);
      }

      this.log('[MOTION-IAS] ✅ Motion detection via IAS Zone configured');
    } catch (err) {
      this.log('[MOTION-IAS] Setup error:', err.message);
    }
  }

  /**
   * v5.5.107: ENHANCED temp/humidity reading with ALL cluster name variants
   * This is crucial for 4-in-1 multisensors (Fantem ZB003-x, Immax 07502L)
   * which only respond to ZCL reads when awake (after motion detection)
   */
  async _readTempHumidityWhileAwake(zclNode) {
    // Debounce - don't spam reads
    if (this._lastTempHumRead && Date.now() - this._lastTempHumRead < 3000) {
      return;
    }
    this._lastTempHumRead = Date.now();

    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const clusters = ep1.clusters || {};
    this.log('[MOTION-AWAKE] 🌡️ Device awake - reading temp/humidity NOW');
    this.log(`[MOTION-AWAKE] Available clusters: ${Object.keys(clusters).join(', ')}`);

    // v5.5.107: Find temperature cluster with ALL possible names
    const tempCluster =
      clusters.temperatureMeasurement ||
      clusters.msTemperatureMeasurement ||
      clusters.genTemperatureMeasurement ||
      clusters[0x0402] ||
      clusters['0x0402'] ||
      clusters['1026'];

    if (tempCluster?.readAttributes) {
      try {
        this.log('[MOTION-AWAKE] 🌡️ Smart temperature read while device is awake...');
        const data = await this._smartZclRead(tempCluster, ['measuredValue'], 3000);
        if (data?.measuredValue !== undefined && data.measuredValue !== -32768 && data.measuredValue !== 0x8000) {
          const temp = Math.round((data.measuredValue / 100) * 10) / 10;
          this.log(`[MOTION-AWAKE] 🌡️ Temperature: ${temp}°C (raw: ${data.measuredValue})`);
          // Auto-add capability if needed
          if (!this.hasCapability('measure_temperature')) {
            await this.addCapability('measure_temperature').catch(() => { });
          }
          await this.setCapabilityValue('measure_temperature', temp).catch(() => { });
        } else {
          this.log(`[MOTION-AWAKE] Temperature invalid: ${data?.measuredValue}`);
        }
      } catch (e) {
        this.log('[MOTION-AWAKE] Temperature read failed (device may have gone to sleep):', e.message);
      }
    } else {
      this.log('[MOTION-AWAKE] No temperature cluster found');
    }

    // v5.5.107: Find humidity cluster with ALL possible names
    const humCluster =
      clusters.relativeHumidity ||
      clusters.relativeHumidityMeasurement ||
      clusters.msRelativeHumidity ||
      clusters.genRelativeHumidity ||
      clusters[0x0405] ||
      clusters['0x0405'] ||
      clusters['1029'];

    if (humCluster?.readAttributes) {
      try {
        this.log('[MOTION-AWAKE] 💧 Smart humidity read while device is awake...');
        const data = await this._smartZclRead(humCluster, ['measuredValue'], 3000);
        if (data?.measuredValue !== undefined && data.measuredValue !== 65535 && data.measuredValue !== 0xFFFF) {
          const hum = Math.round(data.measuredValue / 100);
          this.log(`[MOTION-AWAKE] 💧 Humidity: ${hum}% (raw: ${data.measuredValue})`);
          // Auto-add capability if needed
          if (!this.hasCapability('measure_humidity')) {
            await this.addCapability('measure_humidity').catch(() => { });
          }
          await this.setCapabilityValue('measure_humidity', hum).catch(() => { });
        } else {
          this.log(`[MOTION-AWAKE] Humidity invalid: ${data?.measuredValue}`);
        }
      } catch (e) {
        this.log('[MOTION-AWAKE] Humidity read failed (device may have gone to sleep):', e.message);
      }
    } else {
      this.log('[MOTION-AWAKE] No humidity cluster found');
    }

    // Also try to configure reporting for future passive updates
    this._configureReportingOnce(ep1);

    // v5.5.111: Also read battery while awake!
    await this._readBatteryWhileAwake(zclNode);
  }

  /**
   * v5.5.299: Smart wake state management
   * Tracks device wake state to optimize ZCL communication
   */
  _markDeviceAwake() {
    this._isDeviceAwake = true;
    this._lastWakeTime = Date.now();
    this.log('[SLEEPY] 🔔 Device marked as awake');

    // Auto-sleep after 10 seconds of inactivity
    clearTimeout(this._sleepTimer);
    this._sleepTimer = setTimeout(() => {
      this._isDeviceAwake = false;
      this.log('[SLEEPY] 💤 Device assumed sleeping (timeout)');
    }, 10000);
  }

  /**
   * v5.5.299: Smart ZCL read with sleepy device optimization
   * Only attempts ZCL reads when device is likely awake
   */
  async _smartZclRead(cluster, attributes, timeout = null) {
    timeout = timeout || this.zclTimeout;

    if (!this._isDeviceAwake && Date.now() - this._lastWakeTime > 30000) {
      this.log(`[SLEEPY] ⏭️ Skipping ZCL read - device sleeping (${attributes.join(', ')})`);
      return null;
    }

    try {
      const readId = `${cluster.name || cluster.constructor.name}_${attributes.join('_')}`;

      if (this._pendingZclReads.has(readId)) {
        this.log(`[SLEEPY] ⏯️ ZCL read already pending: ${readId}`);
        return null;
      }

      this._pendingZclReads.add(readId);
      this.log(`[SLEEPY] 🔄 Smart ZCL read: ${readId} (timeout: ${timeout}ms)`);

      const data = await Promise.race([
        cluster.readAttributes(attributes),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Smart timeout')), timeout))
      ]);

      this._pendingZclReads.delete(readId);
      this.log(`[SLEEPY] ✅ ZCL read success: ${readId}`);
      return data;
    } catch (err) {
      this._pendingZclReads.delete(readId);
      this.log(`[SLEEPY] ⚠️ ZCL read failed: ${err.message}`);
      return null;
    }
  }

  /**
   * v5.5.111: Read battery while device is awake (after motion detection)
   * v5.5.299: Enhanced with smart ZCL communication
   */
  async _readBatteryWhileAwake(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const clusters = ep1.clusters || {};

    // Find power configuration cluster
    const powerCluster =
      clusters.powerConfiguration ||
      clusters.genPowerCfg ||
      clusters[0x0001] ||
      clusters['0x0001'] ||
      clusters['1'];

    if (!powerCluster?.readAttributes) {
      this.log('[MOTION-BATTERY] No powerConfiguration cluster');
      return;
    }

    try {
      this.log('[MOTION-BATTERY] 🔋 Smart battery read while device is awake...');
      const data = await this._smartZclRead(powerCluster, ['batteryPercentageRemaining', 'batteryVoltage'], 3000);

      // v5.5.366: Throttle battery reports to prevent spam
      const now = Date.now();
      const lastBatteryReport = this._lastBatteryReportTime || 0;
      const throttleMs = MotionSensorDevice.BATTERY_THROTTLE_MS;

      if (now - lastBatteryReport < throttleMs) {
        this.log('[MOTION-BATTERY] ⏱️ Battery report throttled (spam prevention)');
        return;
      }

      if (data?.batteryPercentageRemaining !== undefined && data.batteryPercentageRemaining !== 255) {
        this._lastBatteryReportTime = now;
        const battery = Math.round(data.batteryPercentageRemaining / 2);
        this.log(`[MOTION-BATTERY] 🔋 Battery: ${battery}% (raw: ${data.batteryPercentageRemaining})`);
        if (this.hasCapability('measure_battery')) {
          await this.setCapabilityValue('measure_battery', battery).catch(() => { });
        }
      } else if (data?.batteryVoltage !== undefined && data.batteryVoltage > 0) {
        this._lastBatteryReportTime = now;
        // Fallback: estimate from voltage (typical CR2450: 3.0V = 100%, 2.0V = 0%)
        const voltage = data.batteryVoltage / 10;
        const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
        this.log(`[MOTION-BATTERY] 🔋 Battery from voltage: ${voltage}V → ${battery}%`);
        if (this.hasCapability('measure_battery')) {
          await this.setCapabilityValue('measure_battery', battery).catch(() => { });
        }
      } else {
        this.log('[MOTION-BATTERY] Battery data invalid:', data);
      }
    } catch (e) {
      this.log('[MOTION-BATTERY] Battery read failed (device may have gone to sleep):', e.message);
    }
  }

  /**
   * v5.5.104: Configure attribute reporting (once per session)
   * This tells the device to send updates automatically
   */
  async _configureReportingOnce(endpoint) {
    if (this._reportingConfigured) return;
    this._reportingConfigured = true;

    this.log('[MOTION-REPORTING] Configuring attribute reporting for temp/humidity...');

    // Configure temperature reporting
    const tempCluster = endpoint.clusters?.temperatureMeasurement;
    if (tempCluster?.configureReporting) {
      try {
        await tempCluster.configureReporting({
          measuredValue: {
            minInterval: 60,      // Min 1 minute between reports
            maxInterval: 3600,    // Max 1 hour
            minChange: 50         // Report if change >= 0.5°C
          }
        });
        this.log('[MOTION-REPORTING] ✅ Temperature reporting configured');
      } catch (e) {
        this.log('[MOTION-REPORTING] Temperature reporting failed (device may not support)');
      }
    }

    // Configure humidity reporting
    const humCluster = endpoint.clusters?.relativeHumidity || endpoint.clusters?.relativeHumidityMeasurement;
    if (humCluster?.configureReporting) {
      try {
        await humCluster.configureReporting({
          measuredValue: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 100        // Report if change >= 1%
          }
        });
        this.log('[MOTION-REPORTING] ✅ Humidity reporting configured');
      } catch (e) {
        this.log('[MOTION-REPORTING] Humidity reporting failed (device may not support)');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.317: INTELLIGENT LUX-BASED MOTION INFERENCE
  // Infers motion from rapid lux changes when PIR sensor fails or is unreliable
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handle lux updates for motion inference
   * When PIR is unreliable, use lux changes to infer motion
   */
  _handleLuxForMotionInference(lux) {
    if (!this._motionLuxInference) return;

    // Feed lux to inference engine
    const inferredMotion = this._motionLuxInference.updateLux(lux);

    // Only use inference if PIR has been unreliable
    if (!this._useMotionInference) return;

    if (inferredMotion !== null && inferredMotion !== this._lastInferredMotion) {
      this._lastInferredMotion = inferredMotion;

      const confidence = this._motionLuxInference.getConfidence();
      this.log(`[MOTION-INFER] 🔦 Lux-inferred motion: ${inferredMotion} (confidence: ${confidence}%)`);

      // Only update if confidence is high enough
      if (confidence >= 50) {
        this.setCapabilityValue('alarm_motion', inferredMotion).catch(() => { });

        // Trigger flow if motion detected
        if (inferredMotion && this.driver?.motionTrigger) {
          this.driver.motionTrigger.trigger(this, { source: 'lux_inference' }, {}).catch(() => { });
        }
      }
    }
  }

  /**
   * Track PIR reliability and enable inference if needed
   * Called when PIR reports contradictory or stuck values
   */
  _trackPirReliability(pirValue) {
    // Calibrate inference with actual PIR value
    this._motionLuxInference?.updateDirectMotion(pirValue);

    // Track if PIR seems stuck (same value for too long with lux changes)
    if (this._lastPirValue === pirValue) {
      const luxHasActivity = this._motionLuxInference?.hasRecentActivity('lux', 60000);

      if (luxHasActivity) {
        this._pirFailCount++;

        if (this._pirFailCount >= 5 && !this._useMotionInference) {
          this._useMotionInference = true;
          this.log('[MOTION-INFER] ⚠️ PIR appears stuck - enabling lux-based motion inference');
        }
      }
    } else {
      // PIR is working, reduce fail count
      this._pirFailCount = Math.max(0, this._pirFailCount - 1);

      if (this._pirFailCount === 0 && this._useMotionInference) {
        this._useMotionInference = false;
        this.log('[MOTION-INFER] ✅ PIR working again - disabling lux-based inference');
      }
    }

    this._lastPirValue = pirValue;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.355: SMART LUX REPORTING SYSTEM
  // Independent luminance reporting not tied to motion events
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start smart lux reporting timer for frequent luminance updates
   */
  _startSmartLuxReporting() {
    if (!this._luxSmartReporting?.enabled) return;

    // Clear any existing timer
    if (this._luxReportTimer) {
      clearInterval(this._luxReportTimer);
    }

    this._luxReportTimer = setInterval(() => {
      this._requestLuxUpdate();
    }, this._luxSmartReporting.luxReportInterval);

    this.log('[LUX-SMART] 🌟 Smart luminance reporting started (5min intervals)');
  }

  /**
   * Request luminance update from device
   */
  async _requestLuxUpdate() {
    if (!this._luxSmartReporting?.enabled) return;

    try {
      // Try Tuya DP first (more reliable for sleepy devices)
      const luxDPs = [3, 9, 12, 102, 106];
      let luxValue = null;

      // Check if we have recent lux data from DPs
      for (const dp of luxDPs) {
        if (this._dpCache && this._dpCache[dp]) {
          luxValue = this._dpCache[dp].value;
          break;
        }
      }

      // If no DP data, try ZCL (only if device appears awake)
      if (luxValue === null && this._isDeviceAwake) {
        try {
          const illuminanceCluster = this.zclNode?.endpoints?.[1]?.clusters?.illuminanceMeasurement;
          if (illuminanceCluster) {
            const data = await illuminanceCluster.readAttributes(['measuredValue']);
            if (data.measuredValue !== undefined) {
              luxValue = Math.round(Math.pow(10, (data.measuredValue - 1) / 10000));
            }
          }
        } catch (err) {
          this.log('[LUX-SMART] ZCL read failed (device sleeping?):', err.message);
        }
      }

      // Process lux value if obtained
      if (luxValue !== null) {
        this._processSmartLuxUpdate(luxValue);
      }

    } catch (err) {
      this.log('[LUX-SMART] ⚠️ Error requesting lux update:', err.message);
    }
  }

  /**
   * Process smart lux update with intelligent reporting logic
   */
  _processSmartLuxUpdate(luxValue) {
    const now = Date.now();
    const config = this._luxSmartReporting;

    // Validate lux value
    if (luxValue < 0 || luxValue > 100000) {
      this.log(`[LUX-SMART] ⚠️ Invalid lux value: ${luxValue}`);
      return;
    }

    const lastLux = config.lastLuxValue;
    const timeSinceLastReport = now - config.lastLuxTime;

    let shouldReport = false;
    let reason = '';

    // First reading ever
    if (lastLux === null) {
      shouldReport = true;
      reason = 'initial';
    }
    // Force report after long interval
    else if (timeSinceLastReport >= config.forceReportInterval) {
      shouldReport = true;
      reason = 'force-interval';
    }
    // Significant change detected
    else if (lastLux > 0) {
      const changePercent = Math.abs((luxValue - lastLux) / lastLux) * 100;
      if (changePercent >= config.luxChangeThreshold) {
        shouldReport = true;
        reason = `change-${changePercent.toFixed(1)}%`;
      }
    }
    // Handle transition from/to zero
    else if ((lastLux === 0 && luxValue > 0) || (lastLux > 0 && luxValue === 0)) {
      shouldReport = true;
      reason = 'zero-transition';
    }

    if (shouldReport) {
      this.log(`[LUX-SMART] 💡 Smart lux update: ${luxValue} lux (${reason})`);
      this.setCapabilityValue('measure_luminance', luxValue).catch(() => { });

      config.lastLuxValue = luxValue;
      config.lastLuxTime = now;

      // Feed to motion inference as well
      this._handleLuxForMotionInference(luxValue);

      // Trigger lux-specific flow if available
      if (this.driver?.luxChangedTrigger) {
        this.driver.luxChangedTrigger.trigger(this, {
          lux: luxValue,
          source: 'smart_reporting'
        }, {}).catch(() => { });
      }
    }
  }

  /**
   * Enhanced lux handling - also feeds smart reporting system
   */
  _enhancedLuxUpdate(luxValue, source = 'unknown') {
    // Update smart reporting cache
    if (this._luxSmartReporting) {
      this._processSmartLuxUpdate(luxValue);
    }

    // Original lux inference logic
    this._handleLuxForMotionInference(luxValue);
  }

  /**
   * Cleanup timers on device destroy
   */
  async onDeleted() {
    if (this._luxReportTimer) {
      clearInterval(this._luxReportTimer);
    }
    await super.onDeleted?.();
  }

}

module.exports = MotionSensorDevice;
