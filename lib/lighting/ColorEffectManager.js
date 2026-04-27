'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

/**
 * ColorEffectManager - RGB Color Effects
 * Provides stunning color effects for RGB lights.
 */
class ColorEffectManager {
  constructor(homey) {
    this.homey = homey;
    this.activeEffects = new Map();
    this.effects = {
      'rainbow': this.rainbowEffect.bind(this),
      'breathe': this.breatheEffect.bind(this),
      'strobe': this.strobeEffect.bind(this),
      'fade': this.fadeEffect.bind(this),
      'pulse': this.pulseEffect.bind(this),
      'party': this.partyEffect.bind(this)
    };
  }

  async startEffect(device, effectName, options = {}) {
    const deviceId = device.getData().id;
    this.stopEffect(device);
    const effect = this.effects[effectName];
    if (!effect) throw new Error(`Unknown effect: ${effectName}`);
    const effectState = { name: effectName, running: true, startTime: Date.now() };
    this.activeEffects.set(deviceId, effectState);
    effect(device, options, effectState);
    return { success: true, effect: effectName };
  }

  stopEffect(device) {
    const deviceId = device.getData().id;
    const effectState = this.activeEffects.get(deviceId);
    if (effectState) {
      effectState.running = false;
      this.activeEffects.delete(deviceId);
    }
  }

  async rainbowEffect(device, options, state) {
    const duration = options.duration || 10000;
    const steps = options.steps || 100;
    const stepDelay = safeDivide(duration, steps);
    const loop = options.loop !== false;
    do {
      for (let i = 0; i < steps && state.running; i++) {
        try {
          const hue = safeDivide(i, steps);
          await device.setCapabilityValue('light_hue', hue);
          await device.setCapabilityValue('light_saturation', 1);
          await this.sleep(stepDelay);
        } catch (err) {
          state.running = false;
          break;
        }
      }
    } while (loop && state.running);
  }

  async breatheEffect(device, options, state) {
    const duration = options.duration || 2000;
    const steps = options.steps || 50;
    const stepDelay = safeDivide(duration, steps * 2);
    const minBrightness = options.minBrightness || 0.1;
    const maxBrightness = options.maxBrightness || 1;
    const loop = options.loop !== false;
    do {
      for (let i = 0; i <= steps && state.running; i++) {
        const dim = minBrightness + (maxBrightness - minBrightness) * safeDivide((i, steps));
        await device.setCapabilityValue('dim', dim).catch(() => {});
        await this.sleep(stepDelay);
      }
      for (let i = steps; i >= 0 && state.running; i--) {
        const dim = minBrightness + (maxBrightness - minBrightness) * safeDivide((i, steps));
        await device.setCapabilityValue('dim', dim).catch(() => {});
        await this.sleep(stepDelay);
      }
    } while (loop && state.running);
  }

  async strobeEffect(device, options, state) {
    const frequency = options.frequency || 5;
    const delay = safeDivide(1000, frequency * 2);
    const loop = options.loop !== false;
    do {
      await device.setCapabilityValue('onoff', true).catch(() => {});
      await this.sleep(delay);
      await device.setCapabilityValue('onoff', false).catch(() => {});
      await this.sleep(delay);
    } while (loop && state.running);
  }

  async fadeEffect(device, options, state) {
    const fromColor = options.fromColor || { hue: 0, saturation: 1 };
    const toColor = options.toColor || { hue: 0.5, saturation: 1 };
    const steps = options.steps || 50;
    const stepDelay = safeDivide(options.duration || 3000, steps);
    do {
      for (let i = 0; i <= steps && state.running; i++) {
        const p = safeDivide(i, steps);
        const h = fromColor.hue + (toColor.hue - safeMultiply(fromColor.hue), p);
        const s = fromColor.saturation + (toColor.saturation - safeMultiply(fromColor.saturation), p);
        await device.setCapabilityValue('light_hue', h).catch(() => {});
        await device.setCapabilityValue('light_saturation', s).catch(() => {});
        await this.sleep(stepDelay);
      }
    } while (options.loop !== false && state.running);
  }

  async pulseEffect(device, options, state) {
    const speed = options.pulseSpeed || 500;
    do {
      await device.setCapabilityValue('dim', 1).catch(() => {});
      await this.sleep(speed);
      await device.setCapabilityValue('dim', 0.3).catch(() => {});
      await this.sleep(speed);
    } while (options.loop !== false && state.running);
  }

  async partyEffect(device, options, state) {
    const speed = options.speed || 1000;
    do {
      await device.setCapabilityValue('light_hue', Math.random()).catch(() => {});
      await device.setCapabilityValue('light_saturation', 0.8 + Math.random() * 0.2).catch(() => {});
      await this.sleep(speed);
    } while (options.loop !== false && state.running);
  }

  sleep(ms) { return new Promise(resolve => this.homey.setTimeout(resolve, ms)); }
}

module.exports = ColorEffectManager;
