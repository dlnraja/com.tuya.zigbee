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

    // Detect protocol: Tuya DP (0xEF00) vs IAS Zone
    const endpoint = zclNode?.endpoints?.[1];
    const hasTuyaCluster = !!(endpoint?.clusters?.tuya || endpoint?.clusters?.manuSpecificTuya || endpoint?.clusters?.[61184]);
    const hasIASZone = !!endpoint?.clusters?.iasZone;

    this.log(`[RADAR] Protocol detection: Tuya DP=${hasTuyaCluster}, IAS Zone=${hasIASZone}`);

    if (hasTuyaCluster) {
      // ZG-204ZM, _TZE200_rhgsbacq use Tuya DP protocol
      await this._setupTuyaDPListener();
    } else if (hasIASZone) {
      // Setup IAS Zone (SDK3 - based on Peter's success patterns)
      await this.setupIASZone();
    }

    this.log('RadarMotionSensorMmwaveDevice initialized - Power source:', this.powerSource || 'unknown');
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
   * Handle incoming Tuya DP for radar sensors
   */
  _handleRadarDP(dpId, value) {
    this.log(`[RADAR] 📊 DP${dpId} = ${value}`);

    switch (dpId) {
      case 1: // Presence (boolean)
        const presence = Boolean(value);
        this.log(`[RADAR] 👤 Presence: ${presence ? 'DETECTED' : 'clear'}`);
        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', presence).catch(this.error);
        }
        break;

      case 9: // Sensitivity (0-9)
        this.log(`[RADAR] 📐 Sensitivity: ${value}`);
        break;

      case 15: // Battery (%)
        const battery = Math.min(100, Math.max(0, value));
        this.log(`[RADAR] 🔋 Battery: ${battery}%`);
        if (this.hasCapability('measure_battery')) {
          this.setCapabilityValue('measure_battery', battery).catch(this.error);
        }
        break;

      case 101: // Illuminance (lux)
        this.log(`[RADAR] 💡 Illuminance: ${value} lux`);
        if (this.hasCapability('measure_luminance')) {
          this.setCapabilityValue('measure_luminance', value).catch(this.error);
        }
        break;

      case 102: // Detection delay
        this.log(`[RADAR] ⏱️ Detection delay: ${value}s`);
        break;

      case 103: // Fading time
        this.log(`[RADAR] ⏱️ Fading time: ${value}s`);
        break;

      case 104: // Alternative illuminance DP
        this.log(`[RADAR] 💡 Illuminance (DP104): ${value} lux`);
        if (this.hasCapability('measure_luminance')) {
          this.setCapabilityValue('measure_luminance', value).catch(this.error);
        }
        break;

      default:
        this.log(`[RADAR] ❓ Unknown DP${dpId} = ${value}`);
    }
  }

  /**
   * Request initial DP values from radar sensor
   */
  async _requestRadarDPs() {
    this.log('[RADAR] Requesting initial DP values...');

    // Use TuyaEF00Manager if available
    if (this.tuyaEF00Manager) {
      const dps = [1, 9, 15, 101]; // presence, sensitivity, battery, illuminance
      for (const dp of dps) {
        await this.tuyaEF00Manager.getData(dp).catch(err => {
          this.log(`[RADAR] DP${dp} request failed:`, err.message);
        });
        await new Promise(r => setTimeout(r, 500));
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
