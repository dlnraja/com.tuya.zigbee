'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CurtainMotorTiltDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
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
    const reg = (id, fn) => { try {
      this.homey.flow.getActionCard(id).registerRunListener(fn) 
  
  
  
  
  
  
  } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('curtain_motor_tilt_turn_on', async ({ device }) => { await device['setCapabilityValue']('onoff', true); return true; });
    reg('curtain_motor_tilt_turn_off', async ({ device }) => { await device['setCapabilityValue']('onoff', false); return true; });
    reg('curtain_motor_tilt_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device['setCapabilityValue']('onoff', !v); return true; });
    reg('curtain_motor_tilt_set_position', async ({ device, position }) => { await device['setCapabilityValue']('windowcoverings_set', position / 100); return true; });
    reg('curtain_motor_tilt_open', async ({ device }) => { await device['setCapabilityValue']('windowcoverings_set', 1); return true; });
    reg('curtain_motor_tilt_close', async ({ device }) => { await device['setCapabilityValue']('windowcoverings_set', 0); return true; });
    reg('curtain_motor_tilt_stop', async ({ device }) => { await device['setCapabilityValue']('windowcoverings_stop', true); return true; });

    // Actions définies inline dans driver.compose.json (flow.actions)
    this.homey.flow.getDeviceActionCard('curtain_calibrate').registerRunListener(async ({ device }) => {
      // Best-effort: cycle complet ouverture/fermeture (durée configurable)
      const secs = Number(device.getSetting?.('calibration_time')) || 30;
      await device.setCapabilityValue('windowcoverings_state', 'up');
      device.homey.setTimeout(() => {
        device.setCapabilityValue('windowcoverings_state', 'down').catch(() => {});
      }, secs * 1000);
      return true;
    });
    this.homey.flow.getDeviceActionCard('curtain_reset_position').registerRunListener(async ({ device }) => {
      await device.setCapabilityValue('windowcoverings_set', 0);
      return true;
    });
    this.homey.flow.getDeviceActionCard('curtain_hold').registerRunListener(async ({ device }) => {
      await device.setCapabilityValue('windowcoverings_state', 'idle');
      return true;
    });
    this.homey.flow.getDeviceActionCard('curtain_open_partial').registerRunListener(async ({ device, position }) => {
      await device.setCapabilityValue('windowcoverings_set', position / 100);
      return true;
    });

  }

}

module.exports = CurtainMotorTiltDriver;
