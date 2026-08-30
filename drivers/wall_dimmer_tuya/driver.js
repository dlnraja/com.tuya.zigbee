// P2322: flow actions MUST TX via capability listeners / _txCapability.
// setCapabilityValue alone only updates Homey state (PresentSky #2206 dead controls).
'use strict';

const { Driver } = require('homey');

class WallDimmerTuyaDriver extends Driver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    const runTx = async (device, capability, value) => {
      if (!device) {return false;}
      if (typeof device._txCapability === 'function') {
        const r = await device._txCapability(capability, value);
        if (r && r.ok === false) {
          throw r.error || new Error(`${capability} TX failed`);
        }
        // Keep Homey UI in sync after successful mesh TX
        await device.safeSetCapabilityValue?.(capability, value)
          || device.setCapabilityValue?.(capability, value)?.catch?.(() => {});
        return true;
      }
      if (typeof device.triggerCapabilityListener === 'function') {
        await device.triggerCapabilityListener(capability, value);
        return true;
      }
      await device.setCapabilityValue(capability, value);
      return true;
    };

    this.homey.flow.getActionCard('wall_dimmer_tuya_turn_on')?.registerRunListener(async (args) => {
      return runTx(args.device, 'onoff', true);
    });
    this.homey.flow.getActionCard('wall_dimmer_tuya_turn_off')?.registerRunListener(async (args) => {
      return runTx(args.device, 'onoff', false);
    });
    this.homey.flow.getActionCard('wall_dimmer_tuya_toggle')?.registerRunListener(async (args) => {
      const v = args.device?.getCapabilityValue?.('onoff');
      return runTx(args.device, 'onoff', !v);
    });
    this.homey.flow.getActionCard('wall_dimmer_tuya_set_brightness')?.registerRunListener(async (args) => {
      // Flow args historically named brightness; Homey capability is dim (0–1)
      const raw = args.brightness ?? args.dim;
      const dim = Math.max(0, Math.min(1, Number(raw)));
      return runTx(args.device, 'dim', Number.isFinite(dim) ? dim : 0);
    });
  }
}

module.exports = WallDimmerTuyaDriver;
