'use strict';
const { safeMultiply, safeParse, safeDivide } = require('./tuyaUtils.js');

/**
 * RetryWithBackoff - Exponential backoff retry utility for Zigbee operations
 */
class RetryWithBackoff {
  constructor(device, options = {}) {
    this.device = device;
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 2000;
    this.maxDelay = options.maxDelay || 30000;
    this.timeout = options.timeout || 10000;
    this.jitter = options.jitter !== false;
  }

  calculateDelay(attempt) {
    let delay = safeMultiply(this.baseDelay, Math.pow(2, attempt));
    delay = Math.min(delay, this.maxDelay);

    if (this.jitter) {
      const jitterRange = safeMultiply(delay, 0.25);
      delay += (Math.random() * jitterRange * 2) - jitterRange;
    }
    return Math.floor(delay);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async execute(fn, context = {}) {
    const { operation = 'operation' } = context;
    let lastError = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await this.withTimeout(fn(), this.timeout);
        if (attempt > 0) this.device.log(`[RETRY] ${operation} succeeded on attempt ${attempt + 1}`);
        return result;
      } catch (error) {
        lastError = error;
        if (attempt === this.maxRetries - 1) {
          this.device.log(`[RETRY] ${operation} failed after ${this.maxRetries} attempts: ${error.message}`);
          break;
        }
        const delay = this.calculateDelay(attempt);
        this.device.log(`[RETRY] ${operation} attempt ${attempt + 1} failed: ${error.message}, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    throw lastError;
  }

  withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
      promise.then(res => { clearTimeout(timer); resolve(res); })
             .catch(err => { clearTimeout(timer); reject(err); });
    });
  }
}

RetryWithBackoff.PRESETS = {
  BATTERY_DEVICE: { maxRetries: 2, baseDelay: 3000, timeout: 5000, jitter: true },
  MAINS_DEVICE: { maxRetries: 3, baseDelay: 1000, timeout: 8000, jitter: true },
  SLEEPY_DEVICE: { maxRetries: 1, baseDelay: 5000, timeout: 3000, jitter: false },
  TUYA_TS0601: { maxRetries: 2, baseDelay: 2000, timeout: 8000, jitter: true }
};

const CI = require('./CaseInsensitiveMatcher');

RetryWithBackoff.forDevice = function(device) {
  let preset = RetryWithBackoff.PRESETS.MAINS_DEVICE;
  try {
    const data = device.getData() || {};
    if (CI.equalsIgnoreCase(data.modelId, 'TS0601')) preset = RetryWithBackoff.PRESETS.TUYA_TS0601;
    else if (device.hasCapability('measure_battery')) {
      if (device.hasCapability('alarm_motion') || device.hasCapability('alarm_contact')) {
        preset = RetryWithBackoff.PRESETS.SLEEPY_DEVICE;
      } else {
        preset = RetryWithBackoff.PRESETS.BATTERY_DEVICE;
      }
    }
  } catch (err) {}
  return new RetryWithBackoff(device, preset);
};

module.exports = RetryWithBackoff;
