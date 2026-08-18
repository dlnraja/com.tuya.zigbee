'use strict';

/**
 * BatteryHealthFlowHandler v1.0.0
 *
 * Handles flow card run listeners for the battery health intelligence system:
 * - Triggers: battery_health_changed, battery_needs_replacement
 * - Conditions: battery_health_below_threshold
 * - Actions: calibrate_battery_reading
 *
 * Integrates with BatteryHealthIntelligence and FlowCardManager.
 */

class BatteryHealthFlowHandler {

  constructor(homey) {
    this.homey = homey;
  }

  /**
   * Register all battery health flow card handlers.
   * Called by FlowCardManager during app initialization.
   */
  registerAll() {
    this._registerTriggers();
    this._registerConditions();
    this._registerActions();
    this.homey.log('[BATTERY-HEALTH-FLOW] All battery health flow cards registered');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════════

  _registerTriggers() {
    // Trigger: battery_health_changed
    const healthChangedCard = this.homey.flow.getTriggerCard('battery_health_changed');
    if (healthChangedCard) {
      healthChangedCard.registerRunListener(async (args, state) => {
        const device = args.device;
        if (!device) {return false;}

        const health = device.batteryHealthIntelligence;
        if (!health) {return false;}

        const report = health.getReport();
        const selectedStatus = args.health_status;

        // Match health status against filter
        if (selectedStatus) {
          const statusMap = {
            'excellent': 'EXCELLENT',
            'good': 'GOOD',
            'fair': 'FAIR',
            'poor': 'POOR',
            'replace': 'REPLACE'
          };
          const targetStatus = statusMap[selectedStatus] || selectedStatus;
          if (report.healthStatusCode !== targetStatus) {
            return false;
          }
        }

        return true;
      });
    }

    // Trigger: battery_needs_replacement
    const replacementCard = this.homey.flow.getTriggerCard('battery_needs_replacement');
    if (replacementCard) {
      replacementCard.registerRunListener(async (args, state) => {
        const device = args.device;
        if (!device) {return false;}

        const health = device.batteryHealthIntelligence;
        if (!health) {return false;}

        const report = health.getReport();
        // Trigger if health is "Poor" or "Replace" OR replacement was just detected
        return report.healthStatusCode === 'POOR' ||
               report.healthStatusCode === 'REPLACE' ||
               report.replacementDetected === true;
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONDITIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  _registerConditions() {
    // Condition: battery_health_below_threshold
    const thresholdCard = this.homey.flow.getConditionCard('battery_health_below_threshold');
    if (thresholdCard) {
      thresholdCard.registerRunListener(async (args, state) => {
        const device = args.device;
        if (!device) {return false;}

        const health = device.batteryHealthIntelligence;
        if (!health) {return false;}

        const threshold = args.threshold;
        if (typeof threshold !== 'number' || isNaN(threshold)) {return false;}

        const report = health.getReport();
        return report.healthScore < threshold;
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  _registerActions() {
    // Action: calibrate_battery_reading
    const calibrateCard = this.homey.flow.getActionCard('calibrate_battery_reading');
    if (calibrateCard) {
      calibrateCard.registerRunListener(async (args) => {
        const device = args.device;
        if (!device) {throw new Error('No device provided');}

        const health = device.batteryHealthIntelligence;
        if (!health) {throw new Error('Battery health intelligence not initialized on this device');}

        const referenceVoltage = args.reference_voltage;
        const referencePercentage = args.reference_percentage;

        if (typeof referenceVoltage !== 'number' || isNaN(referenceVoltage)) {
          throw new Error('Invalid reference voltage');
        }
        if (typeof referencePercentage !== 'number' || isNaN(referencePercentage)) {
          throw new Error('Invalid reference percentage');
        }
        if (referencePercentage < 0 || referencePercentage > 100) {
          throw new Error('Reference percentage must be between 0 and 100');
        }

        health.calibrate(referenceVoltage, referencePercentage);

        device.log(`[BATTERY-HEALTH-FLOW] Calibrated: ${referenceVoltage}V -> ${referencePercentage}%`);
        return true;
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TRIGGER HELPERS (called by BatteryHealthIntelligence via device events)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * App-level trigger cards take (tokens, state) — NOT (device, tokens).
   * Passing the Homey device as the first argument made Homey read
   * health_score from the device object (always undefined) and reject
   * the card. Seen on water_leak_sensor in diag e181bc15 (v9.0.589).
   */
  static _finiteNum(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  static _stringToken(value, fallback = '') {
    const s = value == null ? '' : String(value);
    return s || fallback;
  }

  /**
   * Trigger battery_health_changed flow card.
   * Called when health status transitions to a new level.
   *
   * @param {object} device - Homey device instance
   * @param {object} report - Health report from BatteryHealthIntelligence
   * @param {string} previousStatus - Previous health status code
   */
  static async triggerHealthChanged(device, report, previousStatus) {
    if (!device?.homey?.flow || device._destroyed) {return;}
    if (!report) {return;}

    if (report.healthStatusCode === previousStatus) {return;}

    try {
      const triggerCard = device.homey.flow.getTriggerCard('battery_health_changed');
      if (triggerCard) {
        await triggerCard.trigger({
          health_score: BatteryHealthFlowHandler._finiteNum(report.healthScore),
          health_status: BatteryHealthFlowHandler._stringToken(report.healthStatus, 'unknown'),
          battery_type: BatteryHealthFlowHandler._stringToken(report.batteryType, 'unknown'),
          estimated_remaining_days: BatteryHealthFlowHandler._finiteNum(report.estimatedRemainingDays)
        });
        device.log(`[BATTERY-HEALTH-FLOW] Triggered health_changed: ${previousStatus} -> ${report.healthStatusCode}`);
      }
    } catch (err) {
      try { device.error('[BATTERY-HEALTH-FLOW] Failed to trigger health_changed:', err.message); } catch (_e) { /* readonly */ }
    }
  }

  /**
   * Trigger battery_needs_replacement flow card.
   * Called when health drops to "Replace" level.
   *
   * @param {object} device - Homey device instance
   * @param {object} report - Health report from BatteryHealthIntelligence
   */
  static async triggerNeedsReplacement(device, report) {
    if (!device?.homey?.flow || device._destroyed) {return;}
    if (!report) {return;}

    try {
      const triggerCard = device.homey.flow.getTriggerCard('battery_needs_replacement');
      if (triggerCard) {
        await triggerCard.trigger({
          health_score: BatteryHealthFlowHandler._finiteNum(report.healthScore),
          health_status: BatteryHealthFlowHandler._stringToken(report.healthStatus, 'unknown'),
          battery_type: BatteryHealthFlowHandler._stringToken(report.batteryType, 'unknown'),
          degradation_percent: BatteryHealthFlowHandler._finiteNum(report.degradationPercent),
          cycle_count: BatteryHealthFlowHandler._finiteNum(report.cycleCount)
        });
        device.log(`[BATTERY-HEALTH-FLOW] Triggered needs_replacement: score=${report.healthScore}`);
      }
    } catch (err) {
      try { device.error('[BATTERY-HEALTH-FLOW] Failed to trigger needs_replacement:', err.message); } catch (_e) { /* readonly */ }
    }
  }
}

module.exports = BatteryHealthFlowHandler;
