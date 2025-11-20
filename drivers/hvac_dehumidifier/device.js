'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');
const { CLUSTER } = require('zigbee-clusters');

class DehumidifierDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection)
    await super.onNodeInit({ zclNode });

    // Setup IAS Zone (SDK3 - based on Peter's success patterns)
    await this.setupIASZone();

    // Setup sensor capabilities (SDK3)
    await this.setupHumiditySensor();
    await this.setupTemperatureSensor();

    this.printNode();

    // onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1
      });
    }

    // target_humidity capability via Tuya datapoints
    if (this.hasCapability('target_humidity')) {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('target_humidity', 61184,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'target_humidity', Cluster: 61184
*/
      // this.registerCapability('target_humidity', 61184, {
      //         endpoint: 1,
      //         set: async (value) => {
      //           return {
      //             dp: 2, // Tuya datapoint for target humidity
      //             datatype: 2, // Value type
      //             data: Math.round(value)
      //           };
      //         },
      //         get: 'data',
      //         reportParser: (value) => {
      //           if (value && value.dp === 2) {
      //             return value.data;
      //           }
      //           return null;
      //         }
      //     });
    }

    // measure_humidity capability via Tuya datapoints
    if (this.hasCapability('measure_humidity')) {
      /* REFACTOR: registerCapability deprecated with cluster spec.
    Original: this.registerCapability('measure_humidity', 61184,
    Replace with SDK3 pattern - see ZigbeeDevice docs
    Capability: 'measure_humidity', Cluster: 61184
    */
      // this.registerCapability('measure_humidity', 61184, {
      //         endpoint: 1,
      //         get: 'data',
      //         reportParser: (value) => {
      //       if (value && value.dp === 1) { // Current humidity datapoint
      //         return value.data;
      //       }
      //       return null;
      //     }
      //   });
    }

    // measure_temperature capability (if available)
    if (this.hasCapability('measure_temperature')) {
      /* REFACTOR: registerCapability deprecated with cluster spec.
    Original: this.registerCapability('measure_temperature', 61184,
    Replace with SDK3 pattern - see ZigbeeDevice docs
    Capability: 'measure_temperature', Cluster: 61184
    */
      // this.registerCapability('measure_temperature', 61184, {
      //         endpoint: 1,
      //         get: 'data',
      //         reportParser: (value) => {
      //       if (value && value.dp === 3) { // Temperature datapoint
      //         return value.data / 10; // Usually in 0.1°C units
      //       }
      //       return null;
      //     }
      //   });
    }

    // measure_power capability (if available)
    if (this.hasCapability('measure_power')) {
      /* REFACTOR: registerCapability deprecated with cluster spec.
    Original: this.registerCapability('measure_power', 61184,
    Replace with SDK3 pattern - see ZigbeeDevice docs
    Capability: 'measure_power', Cluster: 61184
    */
      // this.registerCapability('measure_power', 61184, {
      //         endpoint: 1,
      //         get: 'data',
      //         reportParser: (value) => {
      //           if (value && value.dp === 5) { // Power datapoint
      //             return value.data;
      //           }
      //           return null;
      //         }
      //       });
    }

    this.log('Dehumidifier device initialized');
  }

  /**
   * Setup measure_humidity capability (SDK3)
   * Cluster 1029 - measuredValue
   */
  async setupHumiditySensor() {
    if (!this.hasCapability('measure_humidity')) {
      return;
    }

    this.log('[TEMP]  Setting up measure_humidity (cluster 1029)...');

    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1029]) {
      this.log('[WARN]  Cluster 1029 not available');
      return;
    }

    try {
      /* REFACTOR: registerCapability deprecated with cluster spec.
         Original: this.registerCapability('measure_humidity', 1029, {...})
         Replace with SDK3 pattern - see ZigbeeDevice docs
         Capability: 'measure_humidity', Cluster: 1029
      */
      this.log('[INFO] setupHumiditySensor: Method needs SDK3 refactor');
    } catch (err) {
      this.error('measure_humidity setup failed:', err);
    }
  }

  /**
   * Setup IAS Zone for Water leak detection (SDK3 Compliant)
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
        this.log('[WARN]  Proactive response failed (normal if device not ready):', err.message);
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
            this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_water'} = ${alarm}`);
            try {
              await this.setCapabilityValue('alarm_water', alarm);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_water'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_water'}`, err.message);
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
          this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_water'} = ${alarm}`);
          try {
            await this.setCapabilityValue('alarm_water', alarm);
            this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_water'}`);
          } catch (err) {
            this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_water'}`, err.message);
            throw err;
          }
        })().catch(this.error);
      };

      this.log('[OK] IAS Zone configured successfully (SDK3 latest method)');

    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }
}

module.exports = DehumidifierDevice;
