'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CurtainMotorTiltDriver extends ZigBeeDriver {

  async onInit() {
    this.log('CurtainMotorTiltDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try { this.homey.flow.getActionCard(id).registerRunListener(fn); } catch (e) { this.log("[Flow]", id, e.message); } };
    reg('curtain_motor_tilt_turn_on', async ({ device }) => { await device.setCapabilityValue('onoff', true); return true; });
    reg('curtain_motor_tilt_turn_off', async ({ device }) => { await device.setCapabilityValue('onoff', false); return true; });
    reg('curtain_motor_tilt_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.setCapabilityValue('onoff', !v); return true; });

  }

}

module.exports = CurtainMotorTiltDriver;
