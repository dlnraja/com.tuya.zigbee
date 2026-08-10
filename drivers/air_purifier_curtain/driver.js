'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CurtainMotorTiltDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   */
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
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    this.log('CurtainMotorTiltDriver initialized');

    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {card.registerRunListener(fn);}
      } catch (e) {
        this.error(`Error registering flow card ${id}:`, e.message);
      }
    };

    reg('curtain_motor_tilt_turn_on', async ({ device }) => { 
      await device['setCapabilityValue']('onoff', true); 
      return true; 
    });
    reg('curtain_motor_tilt_turn_off', async ({ device }) => { 
      await device['setCapabilityValue']('onoff', false); 
      return true; 
    });
    reg('curtain_motor_tilt_toggle', async ({ device }) => { 
      const v = device.getCapabilityValue('onoff'); 
      await device['setCapabilityValue']('onoff', !v); 
      return true; 
    });

    // Actions définies inline dans driver.compose.json (flow.actions)
    const regDev = (id, fn) => { try {
      const flow = this.homey.flow;
      const card = (typeof flow.getActionCard === 'function' ? flow.getActionCard(id) : null)
        || (typeof flow.getDeviceActionCard === 'function' ? flow.getDeviceActionCard(id) : null);
      if (card && typeof card.registerRunListener === 'function') {
        card.registerRunListener(fn);
      }
    } catch (e) { this.log('[Flow]', id, e.message); } };
    regDev('air_purifier_curtain_curtain_calibrate', async ({ device }) => {
      // Best-effort: cycle complet ouverture/fermeture (durée configurable)
      const secs = Number(device.getSetting?.('calibration_time')) || 30;
      await device.setCapabilityValue('windowcoverings_state', 'up');
      device.homey.setTimeout(() => {
        device.setCapabilityValue('windowcoverings_state', 'down').catch(() => {});
      }, secs * 1000);
      return true;
    });
    regDev('air_purifier_curtain_curtain_reset_position', async ({ device }) => {
      await device.setCapabilityValue('windowcoverings_set', 0);
      return true;
    });
    regDev('air_purifier_curtain_curtain_hold', async ({ device }) => {
      await device.setCapabilityValue('windowcoverings_state', 'idle');
      return true;
    });
    regDev('air_purifier_curtain_curtain_open_partial', async ({ device, position }) => {
      await device.setCapabilityValue('windowcoverings_set', position / 100);
      return true;
    });
  }
}

module.exports = CurtainMotorTiltDriver;
