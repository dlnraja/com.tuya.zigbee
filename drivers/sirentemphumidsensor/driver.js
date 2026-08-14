'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { setActuatorCapability } = require('../../lib/flow/ActuatorFlowHelper');

class SirentemphumidsensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;

    const reg = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) { card.registerRunListener(fn); }
      } catch (err) {
        this.log(`[FLOW] ${id}: ${err.message}`);
      }
    };

    reg('sirentemphumidsensor_alarm_state', async (args) => {
      if (!args.device) { return false; }
      const on = args.state === true || args.state === 'on' || args.state === 'true' || args.value === true;
      return setActuatorCapability(args.device, 'onoff', on);
    });

    reg('sirentemphumidsensor_alarm_duration', async (args) => {
      if (!args.device) { return false; }
      const duration = Number(args.duration ?? args.value ?? 60);
      if (typeof args.device.sendAlarmDuration === 'function') {
        await args.device.sendAlarmDuration(duration).catch(() => {});
      }
      return true;
    });

    reg('sirentemphumidsensor_siren_volume', async (args) => {
      if (!args.device) { return false; }
      const volume = Number(args.volume ?? args.value ?? 0);
      if (typeof args.device.sendAlarmVolume === 'function') {
        await args.device.sendAlarmVolume(volume).catch(() => {});
      }
      return true;
    });

    reg('sirentemphumidsensor_alarm_tune', async (args) => {
      if (!args.device) { return false; }
      const tune = Number(args.tune ?? args.melody ?? args.value ?? 0);
      if (typeof args.device.sendAlarmTune === 'function') {
        await args.device.sendAlarmTune(tune).catch(() => {});
      }
      return true;
    });

    this.log('[FLOW] Siren temp/humidity actions registered (P130)');
  }
}

module.exports = SirentemphumidsensorDriver;
