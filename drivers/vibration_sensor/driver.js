'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class VibrationSensorDriver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('VibrationSensorDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const P = 'vibration_sensor';
    const conditions = ['is_vibrating', 'battery_above', 'vibration_active', 'tamper_active'];

    conditions.forEach(cond => {
      try {
        const id = `${P}_${cond}`;
        const card = this._getFlowCard(id, 'condition');
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            if (cond === 'battery_above') {
              const battery = args.device.getCapabilityValue('measure_battery') || 0;
              return battery > (args.threshold || 20);
            }
            const cap = cond.includes('vibrat') ? 'alarm_vibration' : 'alarm_tamper';
            return args.device.getCapabilityValue(cap) === true;
          });
          this.log(`[FLOW] Registered: ${id}`);
        }
      } catch (err) { this.error(`Condition ${cond} failed:`, err.message); }
    });
  }
}

module.exports = VibrationSensorDriver;
