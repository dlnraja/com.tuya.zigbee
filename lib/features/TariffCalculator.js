'use strict';

/**
 * TariffCalculator - Multi-Rate Energy Cost Calculation
 * FEATURE #83
 *
 * Calculates energy costs across multiple tariff tiers:
 *   - Time-of-use (TOU) tariffs with day/night/peak/shoulder/off-peak
 *   - Tiered pricing (progressive rates based on consumption)
 *   - Fixed daily charges
 *   - Currency formatting
 *   - Cost projection and budgeting
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

const HOUR_MS = 3600000;

/**
 * Built-in tariff presets
 */
const TARIFF_PRESETS = {
  FLAT: {
    name: 'Flat Rate',
    rates: [{ startHour: 0, endHour: 24, ratePerKwh: 0.25 }],
    dailyCharge: 0.50,
    currency: 'EUR'
  },
  TOU_DAY_NIGHT: {
    name: 'Day/Night',
    rates: [
      { startHour: 7, endHour: 23, ratePerKwh: 0.28, label: 'day' },
      { startHour: 23, endHour: 7, ratePerKwh: 0.15, label: 'night' }
    ],
    dailyCharge: 0.40,
    currency: 'EUR'
  },
  TOU_PEAK_SHOULDER_OFFPEAK: {
    name: 'Peak/Shoulder/Off-Peak',
    rates: [
      { startHour: 14, endHour: 20, ratePerKwh: 0.35, label: 'peak' },
      { startHour: 7, endHour: 14, ratePerKwh: 0.22, label: 'shoulder' },
      { startHour: 20, endHour: 24, ratePerKwh: 0.15, label: 'off_peak' },
      { startHour: 0, endHour: 7, ratePerKwh: 0.12, label: 'off_peak' }
    ],
    dailyCharge: 0.45,
    currency: 'EUR'
  },
  UK_ECONOMY_7: {
    name: 'UK Economy 7',
    rates: [
      { startHour: 0, endHour: 7, ratePerKwh: 0.10, label: 'night' },
      { startHour: 7, endHour: 24, ratePerKwh: 0.30, label: 'day' }
    ],
    dailyCharge: 0.30,
    currency: 'GBP'
  }
};

class TariffCalculator extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} options.tariff        - Tariff definition (or use preset name)
   * @param {string} [options.preset]      - Name of built-in preset
   * @param {number} [options.taxRate=0]   - Additional tax multiplier (0.20 = 20% VAT)
   * @param {Function} [options.logger]
   */
  constructor(options = {}) {
    super();
    this._logger = typeof options.logger === 'function' ? options.logger : () => {};
    this._destroyed = false;

    // Load tariff
    if (options.tariff) {
      this.tariff = options.tariff;
    } else if (options.preset && TARIFF_PRESETS[options.preset]) {
      this.tariff = { ...TARIFF_PRESETS[options.preset] };
    } else {
      this.tariff = { ...TARIFF_PRESETS.FLAT };
    }

    this.taxRate = options.taxRate ?? 0;
    this.currency = this.tariff.currency || 'EUR';

    // Running totals
    this._totalCost = 0;
    this._totalEnergyKwh = 0;
    this._dailyCosts = new Map(); // dateKey -> { cost, energyKwh, breakdown[] }
  }

  /* ------------------------------------------------------------------ */
  /*  Core calculation                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Get the rate for a specific hour.
   * @param {number} hour - 0..23
   * @returns {{ ratePerKwh: number, label: string }}
   */
  getRateForHour(hour) {
    const h = ((hour % 24) + 24) % 24;
    for (const rate of this.tariff.rates) {
      const start = rate.startHour % 24;
      const end = rate.endHour % 24;
      if (start < end) {
        if (h >= start && h < end) return rate;
      } else {
        // Wraps around midnight
        if (h >= start || h < end) return rate;
      }
    }
    return this.tariff.rates[0]; // Fallback
  }

  /**
   * Calculate cost for energy consumption during a time period.
   * @param {number} energyKwh
   * @param {number} startHour - 0..23
   * @param {number} endHour   - 0..23 (same or next day)
   * @returns {Object} { cost, tax, total, rateUsed }
   */
  calculateCost(energyKwh, startHour, endHour) {
    const rate = this.getRateForHour(startHour);
    const cost = energyKwh * rate.ratePerKwh;
    const tax = cost * this.taxRate;

    return {
      cost: Math.round(cost * 10000) / 10000,
      tax: Math.round(tax * 10000) / 10000,
      total: Math.round((cost + tax) * 10000) / 10000,
      ratePerKwh: rate.ratePerKwh,
      rateLabel: rate.label || 'standard',
      currency: this.currency
    };
  }

  /**
   * Record energy consumption and update running totals.
   * @param {number} energyKwh
   * @param {Date|number} [timestamp]
   * @returns {Object} cost breakdown
   */
  recordConsumption(energyKwh, timestamp) {
    const ts = timestamp instanceof Date ? timestamp : new Date(timestamp || Date.now());
    const hour = ts.getHours();
    const result = this.calculateCost(energyKwh, hour, hour + 1);

    this._totalCost += result.total;
    this._totalEnergyKwh += energyKwh;

    // Daily breakdown
    const dateKey = ts.toISOString().substring(0, 10);
    if (!this._dailyCosts.has(dateKey)) {
      this._dailyCosts.set(dateKey, { cost: 0, energyKwh: 0, breakdown: [], dailyChargeApplied: false });
    }
    const day = this._dailyCosts.get(dateKey);
    day.cost += result.total;
    day.energyKwh += energyKwh;
    day.breakdown.push({ hour, energyKwh, ...result });

    // Apply daily charge once per day
    if (!day.dailyChargeApplied && this.tariff.dailyCharge) {
      day.cost += this.tariff.dailyCharge;
      day.dailyChargeApplied = true;
    }

    return result;
  }

  /**
   * Calculate projected monthly cost based on average daily consumption.
   * @param {number} averageDailyKwh
   * @param {number} [daysInMonth=30]
   * @returns {Object}
   */
  projectMonthlyCost(averageDailyKwh, daysInMonth = 30) {
    // Use peak rate as worst-case estimate
    const peakRate = this.tariff.rates.reduce((max, r) => Math.max(max, r.ratePerKwh), 0);
    const offPeakRate = this.tariff.rates.reduce((min, r) => Math.min(min, r.ratePerKwh), Infinity);
    const avgRate = this.tariff.rates.reduce((sum, r) => sum + r.ratePerKwh, 0) / this.tariff.rates.length;

    const energyCost = averageDailyKwh * avgRate * daysInMonth;
    const dailyCharges = (this.tariff.dailyCharge || 0) * daysInMonth;
    const subtotal = energyCost + dailyCharges;
    const tax = subtotal * this.taxRate;

    return {
      estimatedCost: Math.round(subtotal * 100) / 100,
      estimatedTax: Math.round(tax * 100) / 100,
      estimatedTotal: Math.round((subtotal + tax) * 100) / 100,
      peakCost: Math.round(averageDailyKwh * peakRate * daysInMonth * 100) / 100,
      offPeakCost: Math.round(averageDailyKwh * offPeakRate * daysInMonth * 100) / 100,
      dailyCharges: Math.round(dailyCharges * 100) / 100,
      averageDailyKwh,
      daysInMonth,
      currency: this.currency
    };
  }

  /**
   * Get current period totals.
   * @returns {Object}
   */
  getTotals() {
    return {
      totalCost: Math.round(this._totalCost * 100) / 100,
      totalEnergyKwh: Math.round(this._totalEnergyKwh * 1000) / 1000,
      averageRate: this._totalEnergyKwh > 0
        ? Math.round((this._totalCost / this._totalEnergyKwh) * 10000) / 10000
        : 0,
      currency: this.currency,
      dailyBreakdown: Object.fromEntries(this._dailyCosts)
    };
  }

  /**
   * Get formatted cost string.
   * @param {number} amount
   * @returns {string}
   */
  formatCost(amount) {
    const symbols = { EUR: '€', GBP: '£', USD: '$' };
    const symbol = symbols[this.currency] || this.currency;
    return `${symbol}${(amount || 0).toFixed(2)}`;
  }

  /**
   * Change the active tariff at runtime.
   * @param {Object} tariff
   */
  setTariff(tariff) {
    this.tariff = tariff;
    this.currency = tariff.currency || this.currency;
    this.emit('tariffChanged', { tariff: this.tariff });
  }

  /**
   * Destroy and cleanup.
   */
  destroy() {
    this._destroyed = true;
    this._dailyCosts.clear();
    this.removeAllListeners();
  }
}

module.exports = TariffCalculator;
module.exports.TARIFF_PRESETS = TARIFF_PRESETS;
