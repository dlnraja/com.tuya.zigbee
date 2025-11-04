'use strict';

/**
 * ColorEffectManager - RGB Color Effects
 * 
 * Inspired by fairecasoimeme/ZigWS2812_controller
 * Provides stunning color effects for RGB lights
 * 
 * Features:
 * - Rainbow effect
 * - Breathe effect
 * - Strobe effect
 * - Fade effect
 * - Custom effects
 * - Smooth transitions
 */

class ColorEffectManager {
  
  constructor(homey) {
    this.homey = homey;
    this.activeEffects = new Map();
    
    // Available effects
    this.effects = {
      'rainbow': this.rainbowEffect.bind(this),
      'breathe': this.breatheEffect.bind(this),
      'strobe': this.strobeEffect.bind(this),
      'fade': this.fadeEffect.bind(this),
      'pulse': this.pulseEffect.bind(this),
      'party': this.partyEffect.bind(this)
    };
  }
  
  /**
   * Start effect on device
   */
  async startEffect(device, effectName, options = {}) {
    const deviceId = device.getData().id;
    
    // Stop existing effect
    this.stopEffect(device);
    
    const effect = this.effects[effectName];
    
    if (!effect) {
      throw new Error(`Unknown effect: ${effectName}`);
    }
    
    // Mark as active
    const effectState = {
      name: effectName,
      running: true,
      startTime: Date.now()
    };
    
    this.activeEffects.set(deviceId, effectState);
    
    // Start effect (don't await - run in background)
    effect(device, options, effectState);
    
    return { success: true, effect: effectName };
  }
  
  /**
   * Stop effect on device
   */
  stopEffect(device) {
    const deviceId = device.getData().id;
    const effectState = this.activeEffects.get(deviceId);
    
    if (effectState) {
      effectState.running = false;
      this.activeEffects.delete(deviceId);
    }
  }
  
  /**
   * Rainbow effect
   */
  async rainbowEffect(device, options, state) {
    const duration = options.duration || 10000; // 10 seconds
    const steps = options.steps || 100;
    const stepDelay = duration / steps;
    const loop = options.loop !== false;
    
    do {
      for (let i = 0; i < steps && state.running; i++) {
        try {
          const hue = (i / steps) * 360;
          
          await device.setCapabilityValue('light_hue', hue / 360);
          await device.setCapabilityValue('light_saturation', 1);
          
          await this.sleep(stepDelay);
          
        } catch (err) {
          device.error('[Effect] Rainbow error:', err);
          state.running = false;
          break;
        }
      }
    } while (loop && state.running);
  }
  
  /**
   * Breathe effect
   */
  async breatheEffect(device, options, state) {
    const duration = options.duration || 2000; // 2 seconds per cycle
    const steps = options.steps || 50;
    const stepDelay = duration / steps;
    const minBrightness = options.minBrightness || 0.1;
    const maxBrightness = options.maxBrightness || 1;
    const loop = options.loop !== false;
    
    do {
      // Fade in
      for (let i = 0; i <= steps && state.running; i++) {
        try {
          const brightness = minBrightness + (maxBrightness - minBrightness) * (i / steps);
          await device.setCapabilityValue('dim', brightness);
          await this.sleep(stepDelay / 2);
        } catch (err) {
          device.error('[Effect] Breathe error:', err);
          state.running = false;
          break;
        }
      }
      
      // Fade out
      for (let i = steps; i >= 0 && state.running; i--) {
        try {
          const brightness = minBrightness + (maxBrightness - minBrightness) * (i / steps);
          await device.setCapabilityValue('dim', brightness);
          await this.sleep(stepDelay / 2);
        } catch (err) {
          device.error('[Effect] Breathe error:', err);
          state.running = false;
          break;
        }
      }
    } while (loop && state.running);
  }
  
  /**
   * Strobe effect
   */
  async strobeEffect(device, options, state) {
    const frequency = options.frequency || 5; // Hz
    const delay = 1000 / frequency / 2;
    const loop = options.loop !== false;
    const duration = options.duration || 5000;
    const endTime = Date.now() + duration;
    
    do {
      while (state.running && Date.now() < endTime) {
        try {
          await device.setCapabilityValue('onoff', true);
          await this.sleep(delay);
          await device.setCapabilityValue('onoff', false);
          await this.sleep(delay);
        } catch (err) {
          device.error('[Effect] Strobe error:', err);
          state.running = false;
          break;
        }
      }
    } while (loop && state.running);
  }
  
  /**
   * Fade effect (color transition)
   */
  async fadeEffect(device, options, state) {
    const fromColor = options.fromColor || { hue: 0, saturation: 1 };
    const toColor = options.toColor || { hue: 0.5, saturation: 1 };
    const duration = options.duration || 3000;
    const steps = options.steps || 50;
    const stepDelay = duration / steps;
    const loop = options.loop !== false;
    
    do {
      // Fade from -> to
      for (let i = 0; i <= steps && state.running; i++) {
        try {
          const progress = i / steps;
          const hue = fromColor.hue + (toColor.hue - fromColor.hue) * progress;
          const saturation = fromColor.saturation + (toColor.saturation - fromColor.saturation) * progress;
          
          await device.setCapabilityValue('light_hue', hue);
          await device.setCapabilityValue('light_saturation', saturation);
          
          await this.sleep(stepDelay);
        } catch (err) {
          device.error('[Effect] Fade error:', err);
          state.running = false;
          break;
        }
      }
      
      // Fade to -> from (reverse)
      for (let i = steps; i >= 0 && state.running; i--) {
        try {
          const progress = i / steps;
          const hue = fromColor.hue + (toColor.hue - fromColor.hue) * progress;
          const saturation = fromColor.saturation + (toColor.saturation - fromColor.saturation) * progress;
          
          await device.setCapabilityValue('light_hue', hue);
          await device.setCapabilityValue('light_saturation', saturation);
          
          await this.sleep(stepDelay);
        } catch (err) {
          device.error('[Effect] Fade error:', err);
          state.running = false;
          break;
        }
      }
    } while (loop && state.running);
  }
  
  /**
   * Pulse effect
   */
  async pulseEffect(device, options, state) {
    const color = options.color || { hue: 0, saturation: 1 };
    const pulseSpeed = options.pulseSpeed || 500;
    const loop = options.loop !== false;
    
    do {
      try {
        // Set color
        await device.setCapabilityValue('light_hue', color.hue);
        await device.setCapabilityValue('light_saturation', color.saturation);
        
        // Bright
        await device.setCapabilityValue('dim', 1);
        await this.sleep(pulseSpeed);
        
        // Dim
        await device.setCapabilityValue('dim', 0.3);
        await this.sleep(pulseSpeed);
        
      } catch (err) {
        device.error('[Effect] Pulse error:', err);
        state.running = false;
        break;
      }
    } while (loop && state.running);
  }
  
  /**
   * Party effect (random colors)
   */
  async partyEffect(device, options, state) {
    const speed = options.speed || 1000;
    const loop = options.loop !== false;
    
    do {
      try {
        // Random color
        const hue = Math.random();
        const saturation = 0.8 + Math.random() * 0.2;
        const brightness = 0.7 + Math.random() * 0.3;
        
        await device.setCapabilityValue('light_hue', hue);
        await device.setCapabilityValue('light_saturation', saturation);
        await device.setCapabilityValue('dim', brightness);
        
        await this.sleep(speed);
        
      } catch (err) {
        device.error('[Effect] Party error:', err);
        state.running = false;
        break;
      }
    } while (loop && state.running);
  }
  
  /**
   * Get available effects
   */
  getAvailableEffects() {
    return Object.keys(this.effects);
  }
  
  /**
   * Check if effect is running
   */
  isEffectRunning(device) {
    const deviceId = device.getData().id;
    const effectState = this.activeEffects.get(deviceId);
    return effectState && effectState.running;
  }
  
  /**
   * Get active effect
   */
  getActiveEffect(device) {
    const deviceId = device.getData().id;
    return this.activeEffects.get(deviceId);
  }
  
  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => this.homey.setTimeout(resolve, ms));
  }
}

module.exports = ColorEffectManager;
