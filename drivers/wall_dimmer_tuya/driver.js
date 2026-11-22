// P2322: flow actions MUST TX via capability listeners / _txCapability.
// setCapabilityValue alone only updates Homey state (PresentSky #2206 dead controls).
'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { isSlidingWindowPusherCouple } = require('../../lib/covers/slidingWindowPusher');

class WallDimmerTuyaDriver extends ZigBeeDriver {

  // WHY(P3374): ZC-LP01 was listed on this dimmer by a stale local hint (confidence 0.08).
  // Z2M/forum: sliding window pusher. Keep the same device id (no re-pair required)
  // by instantiating the curtain device class for this exact couple only.
  onMapDeviceClass(device) {
    try {
      const data = device && typeof device.getData === 'function' ? device.getData() : (device && device.data) || {};
      const mfr = (device && device.manufacturerName) || data.manufacturerName || data.manufacturer || '';
      const pid = data.productId || data.modelId || 'TS0601';
      if (isSlidingWindowPusherCouple(mfr, pid)) {
        return require('../curtain_motor/device');
      }
    } catch (_e) { /* keep dimmer class */ }
    return require('./device');
  }


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
      // Flow args historically named brightness; Homey capability is dim (0-1)
      // WHY(P2449): accept 0-100 range cards as well as 0-1
      const raw = args.brightness ?? args.dim;
      let dim = Number(raw);
      if (!Number.isFinite(dim)) {dim = 0;}
      if (dim > 1) {dim /= 100;}
      dim = Math.max(0, Math.min(1, dim));
      return runTx(args.device, 'dim', dim);
    });
  }
}

module.exports = WallDimmerTuyaDriver;
