'use strict';

const DeviceTelemetryEstimator = require('./DeviceTelemetryEstimator');

/**
 * Backward-compatible facade for older drivers that attach EnergyEstimator
 * directly. The shared telemetry estimator now owns energy, current, usage
 * cycles and battery fallback logic for both apps.
 */
class EnergyEstimator {
  constructor(device, options = {}) {
    this.device = device;
    this.options = options;
    this.estimator = null;
  }

  async init(options = {}) {
    this.options = { ...this.options, ...options };
    this.estimator = DeviceTelemetryEstimator.attach(this.device, this.options);
    await this.estimator?.refresh?.('legacy-energy-init');
    return this;
  }

  async update() {
    if (!this.estimator) {
      await this.init(this.options);
    }
    return this.estimator?.refresh?.('legacy-energy-update');
  }

  destroy() {
    this.estimator?.destroy?.();
  }

  static async attach(device, options = {}) {
    const estimator = new EnergyEstimator(device, options);
    await estimator.init(options);
    return estimator;
  }
}

module.exports = EnergyEstimator;
