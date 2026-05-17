'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * CoSensorDriver - v8.0.0
 * Standardized driver for Carbon Monoxide sensors.
 * Optimized flow card registration with SDK3 compliance.
 */
class CoSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('CoSensorDriver v8.0.0 initialized');
    this._registerFlowCards();
  }

  /**
   * Safe registration of all flow cards defined in app.json
   */
  _registerFlowCards() {
    this.log('[FLOW] Registering flow cards...');

    // ─────────────────────────────────────────────────────────────────────────
    // CONDITION CARDS
    // ─────────────────────────────────────────────────────────────────────────
    const conditions = [
      {
        id: 'co_sensor_co_detected',
        run: async (args) => {
          return args.device.getCapabilityValue('alarm_co') === true;
        }
      },
      {
        id: 'co_sensor_co_above',
        run: async (args) => {
          const level = args.device.getCapabilityValue('measure_co') || 0;
          return level > (args.ppm || 50);
        }
      },
      {
        id: 'co_sensor_battery_above',
        run: async (args) => {
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
        }
      },
      {
        id: 'co_sensor_co_active',
        run: async (args) => {
          return args.device.getCapabilityValue('alarm_co') === true;
        }
      },
      {
        id: 'co_sensor_tamper_active',
        run: async (args) => {
          return args.device.getCapabilityValue('alarm_tamper') === true;
        }
      }
    ];

    for (const card of conditions) {
      try {
        this.homey.flow.getConditionCard(card.id)
          .registerRunListener(card.run.bind(this));
        this.log(`[FLOW] ✅ Condition Registered: ${card.id}`);
      } catch (e) {
        this.error(`[FLOW] ❌ Failed to register condition ${card.id}:`, e.message);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION CARDS
    // ─────────────────────────────────────────────────────────────────────────
    const actions = [
      {
        id: 'co_sensor_test_alarm',
        run: async (args) => {
          this.log(`[FLOW] Action: test_alarm on ${args.device.getName()}`);
          if (args.device.sendTuyaCommand) {
            // DP 8 is often 'Self-test' for Tuya sensors
            return args.device.sendTuyaCommand(8, true, 'bool');
          }
          return false;
        }
      }
    ];

    for (const card of actions) {
      try {
        this.homey.flow.getActionCard(card.id)
          .registerRunListener(card.run.bind(this));
        this.log(`[FLOW] ✅ Action Registered: ${card.id}`);
      } catch (e) {
        this.error(`[FLOW] ❌ Failed to register action ${card.id}:`, e.message);
      }
    }

    this.log('[FLOW] All flow cards processed');
  }
}

module.exports = CoSensorDriver;
