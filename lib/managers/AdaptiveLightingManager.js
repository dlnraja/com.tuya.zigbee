'use strict';
const { safeDivide } = require('../utils/tuyaUtils.js');
const DaylightAtmosphere = require('../features/DaylightAtmosphere');

/**
 * AdaptiveLightingManager — Solar Sync per device (Daylight Atmosphere SSOT).
 * Soft-enables from setting adaptive_lighting_enabled. MASTER_ONLY feature path.
 */

class AdaptiveLightingManager {
  constructor(device) {
    this.device = device;
    this.homey = device.homey;
    this.active = false;
    this._timer = null;
    this._lastUpdate = 0;
    this.converter = require('../helpers/ColorConverter');
  }

  async init() {
    this.active = !!(this.device.getSetting('adaptive_lighting_enabled')
      || this.device.getSetting('enable_natural_light'));
    if (this.active) {this.start();}
  }

  start() {
    this.active = true;
    if (this._timer) {clearInterval(this._timer);}
    this._timer = this.homey.setInterval(() => { if (this._destroyed) {return;} this.update(); }, 120000);
    this.update();
  }

  stop() {
    this.active = false;
    if (this._timer) {clearInterval(this._timer);}
    this._timer = null;
  }

  async update() {
    if (!this.active) {return;}
    const hasCT = this.device.hasCapability('light_color_temp')
      || this.device.hasCapability('light_temperature');
    const hasRGB = this.device.hasCapability('light_hue') && this.device.hasCapability('light_saturation');
    const hasDim = this.device.hasCapability('dim');
    if (!hasCT && !hasRGB && !hasDim) {return;}

    const staggerDelay = Math.floor(Math.random() * 30000);
    this.homey.setTimeout(async () => {
      if (this._destroyed) {return;}
      await this._executeUpdate();
    }, staggerDelay);
  }

  _resolveLux() {
    const own = DaylightAtmosphere.luxFromDevice(this.device);
    if (own != null) {return own;}
    // Optional: paired lux from store (set by Path Light flows)
    const stored = this.device.getStoreValue?.('room_balance_lux');
    return typeof stored === 'number' ? stored : null;
  }

  async _executeUpdate() {
    if (!this.active) {return;}
    if (this.device.hasCapability('onoff') && !this.device.getCapabilityValue('onoff')) {return;}

    const solar = this.homey?.app?.solarElevation || null;
    const curve = DaylightAtmosphere.compute({
      solar,
      lux: this._resolveLux(),
    });
    const kelvin = curve.kelvin;
    const homeyValue = curve.temperature;
    const brightness = curve.bright;

    this.device.log?.(`[SOLAR-SYNC] ${curve.source} ${kelvin}K dim=${brightness} luxBias=${curve.luxBias}`);

    if (this.device.hasCapability('light_color_temp')) {
      const currentVal = this.device.getCapabilityValue('light_color_temp') || 0;
      if (Math.abs(homeyValue - currentVal) > 0.05) {
        await this.device.setCapabilityValue('light_color_temp', homeyValue).catch(() => {});
      }
    } else if (this.device.hasCapability('light_temperature')) {
      const currentVal = this.device.getCapabilityValue('light_temperature') || 0;
      if (Math.abs(homeyValue - currentVal) > 0.05) {
        const set = this.device.safeSetCapabilityValue?.bind(this.device) || this.device.setCapabilityValue.bind(this.device);
        await set('light_temperature', homeyValue).catch(() => {});
      }
    } else if (this.device.hasCapability('light_hue') && this.device.hasCapability('light_saturation')) {
      const mireds = Math.round(safeDivide(1000000, kelvin));
      const rgb = this.converter.miredToRgb(mireds);
      const hsv = this.converter.rgbToHsv(rgb.r, rgb.g, rgb.b);
      await this.device.setCapabilityValue('light_hue', hsv.h).catch(() => {});
      await this.device.setCapabilityValue('light_saturation', hsv.s).catch(() => {});
    }

    if (this.device.hasCapability('dim')) {
      const currentDim = this.device.getCapabilityValue('dim') || 0;
      if (Math.abs(brightness - currentDim) > 0.1) {
        await this.device.setCapabilityValue('dim', brightness).catch(() => {});
      }
    }
  }
}

module.exports = AdaptiveLightingManager;
