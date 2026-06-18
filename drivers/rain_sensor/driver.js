'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

class RainSensorDriver extends BaseZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('RainSensorDriver v5.5.580 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const triggers = [
      'rain_sensor_rain_detected',
      'rain_sensor_rain_stopped',
      'rain_sensor_rain_intensity_changed',
      'rain_sensor_battery_low',
    ];
    for (const id of triggers) {
      try {
        const card = this._getFlowCard(id, 'trigger');
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return;
            args.device.emit(`flow:${id}`, args);
          });
        }
      } catch (err) { this.error(`Trigger ${id}: ${err.message}`); }
    }

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('rain_sensor_is_raining');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_water') === true;
        });
      }
    } catch (err) { this.error(`Condition rain_sensor_is_raining: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('rain_sensor_rain_intensity_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const val = args.device.getCapabilityValue('measure_humidity') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition rain_sensor_rain_intensity_above: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('rain_sensor_water_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_water') === true;
        });
      }
    } catch (err) { this.error(`Condition rain_sensor_water_detected: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = RainSensorDriver;
