'use strict';

/**
 * FeatureFlowCards - Flow Card Registration for Feature Modules
 * v9.1.0
 *
 * Registers run listeners for all flow cards declared in .homeycompose/flow/
 * that correspond to the new feature modules:
 *   - SolarElevation (Adaptive Lighting)
 *   - TransitionEngine (Smooth Transitions)
 *   - EnergyHistoryStore (Energy History)
 *   - TariffCalculator (Tariff Management)
 *   - ScheduleManager (Scheduling)
 *   - ConditionEngine (Condition Evaluation)
 *   - PredictiveHealthEngine (Predictive Health)
 *   - NetworkTopologyCollector (Network Topology)
 *   - VirtualPresenceDetector (Presence Detection)
 *
 * Instantiated once in app.js onInit(). Non-critical: all handlers are wrapped
 * in try/catch so a failure in one card does not prevent others from registering.
 */

class FeatureFlowCards {
  constructor(homey) {
    this.homey = homey;
    this._solarElevation = null;
    this._transitionEngine = null;
    this._energyHistoryStore = null;
    this._tariffCalculator = null;
    this._scheduleManager = null;
    this._conditionEngine = null;
    this._predictiveHealthEngine = null;
    this._networkTopologyCollector = null;
    this._registered = { triggers: new Set(), conditions: new Set(), actions: new Set() };
  }

  /* ------------------------------------------------------------------ */
  /*  Module instance setters (called after modules are created)         */
  /* ------------------------------------------------------------------ */

  setSolarElevation(instance) { this._solarElevation = instance; }
  setTransitionEngine(instance) { this._transitionEngine = instance; }
  setEnergyHistoryStore(instance) { this._energyHistoryStore = instance; }
  setTariffCalculator(instance) { this._tariffCalculator = instance; }
  setScheduleManager(instance) { this._scheduleManager = instance; }
  setConditionEngine(instance) { this._conditionEngine = instance; }
  setPredictiveHealthEngine(instance) { this._predictiveHealthEngine = instance; }
  setNetworkTopologyCollector(instance) { this._networkTopologyCollector = instance; }

  /* ------------------------------------------------------------------ */
  /*  Registration                                                       */
  /* ------------------------------------------------------------------ */

  registerAll() {
    this._registerSolarCards();
    this._registerTransitionCards();
    this._registerEnergyCards();
    this._registerTariffCards();
    this._registerScheduleCards();
    this._registerConditionCards();
    this._registerHealthCards();
    this._registerNetworkCards();
    // VirtualPresenceDetector cards are registered in app.js _registerPresenceFlowCards()
    // but we add the enhanced ones here
    this._registerPresenceCards();

    // v9.2.0: Device Capabilities inspired features (from DC app #43287)
    this._registerDeviceCapabilitiesCards();

    const t = this._registered.triggers.size;
    const c = this._registered.conditions.size;
    const a = this._registered.actions.size;
    this.homey.log(`[FEATURE-FLOW] Registered: ${t} triggers, ${c} conditions, ${a} actions`);
  }

  /* ------------------------------------------------------------------ */
  /*  SolarElevation cards                                               */
  /* ------------------------------------------------------------------ */

  _registerSolarCards() {
    // -- Trigger: Sunrise detected --
    this._safeRegister('trigger', 'solar_sunrise_detected', (args, state) => {
      const elev = this._solarElevation?.getElevation();
      if (!Number.isFinite(elev)) return false;
      const threshold = args.elevation_threshold ?? 0;
      return state._lastWasBelow && elev > threshold;
    });
    // State tracking: observe sunrise/sunset
    if (this._solarElevation) {
      this._solarElevation.on('sunrise', (data) => {
        this._triggerFeatureCard('solar_sunrise_detected', this._getSolarFlowTokens(data), {
          _lastWasBelow: true,
          elevation_threshold: 0
        });
      });
      this._solarElevation.on('sunset', (data) => {
        this._triggerFeatureCard('solar_sunset_detected', this._getSolarFlowTokens(data), {
          _lastWasAbove: true,
          elevation_threshold: 0
        });
      });
    }

    // -- Trigger: Sunset detected --
    this._safeRegister('trigger', 'solar_sunset_detected', (args, state) => {
      const elev = this._solarElevation?.getElevation();
      if (!Number.isFinite(elev)) return false;
      const threshold = args.elevation_threshold ?? 0;
      return state._lastWasAbove && elev < threshold;
    });

    // -- Condition: It is daytime --
    this._safeRegister('condition', 'solar_is_daytime', (args) => {
      if (!this._solarElevation) return false;
      const threshold = args.elevation_threshold ?? 0;
      const elevation = this._solarElevation.getElevation();
      if (!Number.isFinite(elevation)) return false;
      return elevation > threshold;
    }, (args) => ({
      elevation: this._safeNumber(this._solarElevation?.getElevation(), 0),
      category: this._safeString(this._solarElevation?.getElevationCategory(), 'unknown')
    }));

    // -- Condition: It is golden hour --
    this._safeRegister('condition', 'solar_is_golden_hour', (args) => {
      if (!this._solarElevation) return false;
      const elev = this._solarElevation.getElevation();
      if (!Number.isFinite(elev)) return false;
      const minElev = args.min_elevation ?? 0;
      const maxElev = args.max_elevation ?? 18;
      return elev >= minElev && elev <= maxElev;
    }, (args) => ({
      elevation: this._safeNumber(this._solarElevation?.getElevation(), 0),
      category: this._safeString(this._solarElevation?.getElevationCategory(), 'unknown')
    }));

    // -- Action: Set adaptive lighting mode --
    this._safeRegister('action', 'solar_set_adaptive_lighting', async (args) => {
      if (!this._solarElevation) return false;
      const mode = args.mode || 'auto';
      const transitionSeconds = args.transition_seconds ?? 300;
      const elev = this._solarElevation.getElevation();
      if (!Number.isFinite(elev)) return { elevation: 0, color_temp: 2700 };

      // Calculate target color temp based on mode
      let targetTemp;
      switch (mode) {
      case 'day': targetTemp = 6500; break;
      case 'warm': targetTemp = 2700; break;
      case 'golden': targetTemp = 3200; break;
      case 'night': targetTemp = 2200; break;
      case 'auto':
      default:
        // Interpolate based on elevation: 0deg=2700K, 90deg=6500K
        targetTemp = Math.round(2700 + (Math.max(0, elev) / 90) * (6500 - 2700));
        targetTemp = Math.max(2700, Math.min(6500, targetTemp));
        break;
      }

      return { elevation: elev, color_temp: targetTemp };
    });

    this._registered.triggers.add('solar_sunrise_detected');
    this._registered.triggers.add('solar_sunset_detected');
    this._registered.conditions.add('solar_is_daytime');
    this._registered.conditions.add('solar_is_golden_hour');
    this._registered.actions.add('solar_set_adaptive_lighting');
  }

  /* ------------------------------------------------------------------ */
  /*  TransitionEngine cards                                             */
  /* ------------------------------------------------------------------ */

  _registerTransitionCards() {
    // -- Trigger: Transition completed --
    this._safeRegister('trigger', 'transition_completed', (args, state) => {
      return state.completed === true;
    });

    // -- Condition: Transition in progress --
    this._safeRegister('condition', 'transition_in_progress', (args) => {
      if (!this._transitionEngine) return false;
      return this._transitionEngine.getActiveCount() > 0;
    }, () => ({
      active_count: this._transitionEngine?.getActiveCount() || 0
    }));

    // -- Action: Start smooth transition --
    this._safeRegister('action', 'transition_start_smooth', async (args) => {
      if (!args.device) return false;
      if (!this._transitionEngine) {
        // Fallback: direct set
        if (args.device.setCapabilityValue) {
          await args.device.setCapabilityValue(args.capability, args.to_value);
        }
        return true;
      }

      const from = args.from_value ?? 0;
      const to = args.to_value ?? 1;
      const durationMs = (args.duration_seconds ?? 2) * 1000;
      const easing = args.easing || 'easeInOut';

      await this._transitionEngine.transition({
        from,
        to,
        durationMs,
        easing,
        onStep: async (value) => {
          if (args.device.setCapabilityValue) {
            await args.device.setCapabilityValue(args.capability, value);
          }
        }
      });

      return true;
    });

    this._registered.triggers.add('transition_completed');
    this._registered.conditions.add('transition_in_progress');
    this._registered.actions.add('transition_start_smooth');
  }

  /* ------------------------------------------------------------------ */
  /*  EnergyHistoryStore cards                                           */
  /* ------------------------------------------------------------------ */

  _registerEnergyCards() {
    // -- Trigger: Daily energy summary ready --
    this._safeRegister('trigger', 'energy_daily_summary_ready', (args, state) => {
      return state.type === 'daily';
    });

    // -- Trigger: Weekly energy summary ready --
    this._safeRegister('trigger', 'energy_weekly_summary_ready', (args, state) => {
      return state.type === 'weekly';
    });

    // -- Condition: Energy usage above threshold --
    this._safeRegister('condition', 'energy_usage_above_threshold', (args) => {
      if (!this._energyHistoryStore) return false;

      const thresholdKwh = args.threshold_kwh ?? 10;
      const period = args.period || 'today';
      const now = Date.now();
      let fromMs;

      switch (period) {
      case 'today': {
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        fromMs = midnight.getTime();
        break;
      }
      case 'yesterday': {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        d.setHours(0, 0, 0, 0);
        fromMs = d.getTime();
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        return this._getTotalEnergyKwh(fromMs, midnight.getTime()) > thresholdKwh;
      }
      case 'this_week': {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        fromMs = d.getTime();
        break;
      }
      case 'last_24h':
        fromMs = now - 86400000;
        break;
      case 'last_7d':
        fromMs = now - 604800000;
        break;
      default:
        fromMs = 0;
      }

      return this._getTotalEnergyKwh(fromMs, now) > thresholdKwh;
    }, (args) => ({
      actual_usage_kwh: this._getTotalEnergyKwh(0, Date.now()),
      threshold_kwh: args.threshold_kwh ?? 10
    }));

    // -- Action: Export energy data --
    this._safeRegister('action', 'energy_export_data', async (args) => {
      if (!this._energyHistoryStore) return { export_data: '{}', total_devices: 0, total_energy_kwh: 0 };

      const format = args.format || 'json';
      const period = args.period || 'today';
      const now = Date.now();

      let fromMs = 0;
      if (period === 'today') {
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        fromMs = midnight.getTime();
      } else if (period === 'this_week') {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        fromMs = d.getTime();
      } else if (period === 'this_month') {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        fromMs = d.getTime();
      }

      const devices = this._energyHistoryStore.getTrackedDevices();
      let totalEnergyKwh = 0;

      if (format === 'summary') {
        const summary = {};
        for (const deviceId of devices) {
          const agg = this._energyHistoryStore.getAggregation(deviceId, fromMs, now);
          summary[deviceId] = { energyKwh: agg.totalEnergyWh / 1000, avgW: agg.avgPowerW, peakW: agg.peakPowerW };
          totalEnergyKwh += agg.totalEnergyWh / 1000;
        }
        return {
          export_data: JSON.stringify(summary),
          total_devices: devices.length,
          total_energy_kwh: Math.round(totalEnergyKwh * 1000) / 1000
        };
      }

      // Full JSON export
      const exportData = {};
      for (const deviceId of devices) {
        const entries = this._energyHistoryStore.getHistory(deviceId, fromMs, now);
        exportData[deviceId] = entries.map(e => ({
          timestamp: new Date(e.timestamp).toISOString(),
          powerW: e.powerW,
          energyWh: e.energyWh
        }));
        totalEnergyKwh += entries.reduce((s, e) => s + e.energyWh, 0) / 1000;
      }

      return {
        export_data: JSON.stringify(exportData),
        total_devices: devices.length,
        total_energy_kwh: Math.round(totalEnergyKwh * 1000) / 1000
      };
    });

    this._registered.triggers.add('energy_daily_summary_ready');
    this._registered.triggers.add('energy_weekly_summary_ready');
    this._registered.conditions.add('energy_usage_above_threshold');
    this._registered.actions.add('energy_export_data');
  }

  _getTotalEnergyKwh(fromMs, toMs) {
    if (!this._energyHistoryStore) return 0;
    let totalWh = 0;
    for (const deviceId of this._energyHistoryStore.getTrackedDevices()) {
      const agg = this._energyHistoryStore.getAggregation(deviceId, fromMs, toMs);
      totalWh += agg.totalEnergyWh;
    }
    return Math.round(totalWh / 1000 * 1000) / 1000;
  }

  /* ------------------------------------------------------------------ */
  /*  TariffCalculator cards                                             */
  /* ------------------------------------------------------------------ */

  _registerTariffCards() {
    // -- Trigger: Tariff period changed --
    this._safeRegister('trigger', 'tariff_period_changed', (args, state) => {
      return state.changed === true;
    });

    // Hook into TariffCalculator events
    if (this._tariffCalculator) {
      this._tariffCalculator.on('tariffChanged', (data) => {
        try {
          const card = this.homey.flow.getTriggerCard('tariff_period_changed');
          const rate = this._tariffCalculator.getRateForHour(new Date().getHours());
          card?.trigger({}, {
            new_period: rate.label || 'standard',
            old_period: data.previousPeriod || 'unknown',
            rate_per_kwh: rate.ratePerKwh,
            currency: this._tariffCalculator.currency
          });
        } catch (_e) { /* non-critical */ }
      });
    }

    // -- Condition: Currently in peak period --
    this._safeRegister('condition', 'tariff_is_peak_period', (args) => {
      if (!this._tariffCalculator) return false;
      const periodType = args.period_type || 'peak';
      const hour = new Date().getHours();
      const rate = this._tariffCalculator.getRateForHour(hour);
      return (rate.label || 'standard') === periodType;
    }, () => {
      const hour = new Date().getHours();
      const rate = this._tariffCalculator?.getRateForHour(hour);
      return {
        current_period: rate?.label || 'standard',
        current_rate: rate?.ratePerKwh || 0
      };
    });

    // -- Action: Set tariff rate --
    this._safeRegister('action', 'tariff_set_rate', async (args) => {
      if (!this._tariffCalculator) return false;

      const preset = args.preset || 'custom';
      if (preset !== 'custom') {
        // Use built-in preset
        const { TARIFF_PRESETS } = require('../features/TariffCalculator');
        if (TARIFF_PRESETS[preset]) {
          this._tariffCalculator.setTariff({
            ...TARIFF_PRESETS[preset],
            taxRate: args.tax_rate ?? 0
          });
          return true;
        }
      }

      // Custom rate
      this._tariffCalculator.setTariff({
        name: 'Custom Rate',
        rates: [{ startHour: 0, endHour: 24, ratePerKwh: args.custom_rate_kwh ?? 0.25, label: 'standard' }],
        dailyCharge: args.daily_charge ?? 0,
        currency: args.currency || 'EUR'
      });
      this._tariffCalculator.taxRate = args.tax_rate ?? 0;
      return true;
    });

    this._registered.triggers.add('tariff_period_changed');
    this._registered.conditions.add('tariff_is_peak_period');
    this._registered.actions.add('tariff_set_rate');
  }

  /* ------------------------------------------------------------------ */
  /*  ScheduleManager cards                                              */
  /* ------------------------------------------------------------------ */

  _registerScheduleCards() {
    // -- Trigger: Scheduled action executed --
    this._safeRegister('trigger', 'schedule_action_executed', (args, state) => {
      return state.type === 'executed';
    });

    // -- Trigger: Schedule activated/deactivated --
    this._safeRegister('trigger', 'schedule_toggled', (args, state) => {
      return state.type === 'toggled';
    });

    // Hook into ScheduleManager events
    if (this._scheduleManager) {
      this._scheduleManager.on('scheduleExecuted', (data) => {
        try {
          const card = this.homey.flow.getTriggerCard('schedule_action_executed');
          const schedule = this._scheduleManager.getSchedule(data.id);
          card?.trigger({}, {
            schedule_id: data.id,
            schedule_name: data.name,
            success: data.success,
            execution_count: schedule?.executionCount || 0,
            type: 'executed'
          });
        } catch (_e) { /* non-critical */ }
      });

      this._scheduleManager.on('scheduleToggled', (data) => {
        try {
          const card = this.homey.flow.getTriggerCard('schedule_toggled');
          card?.trigger({}, {
            schedule_id: data.id,
            schedule_name: this._scheduleManager.getSchedule(data.id)?.name || data.id,
            enabled: data.enabled,
            type: 'toggled'
          });
        } catch (_e) { /* non-critical */ }
      });
    }

    // -- Condition: Schedule is active --
    this._safeRegister('condition', 'schedule_is_active', () => {
      if (!this._scheduleManager) return false;
      const stats = this._scheduleManager.getStats();
      return stats.enabled > 0;
    }, () => {
      const stats = this._scheduleManager?.getStats() || { total: 0, enabled: 0, totalExecutions: 0 };
      return {
        total_schedules: stats.total,
        active_schedules: stats.enabled,
        total_executions: stats.totalExecutions
      };
    });

    // -- Action: Create schedule --
    this._safeRegister('action', 'schedule_create', async (args) => {
      if (!this._scheduleManager) return false;

      const config = {
        name: args.schedule_name || 'Flow Schedule',
        deviceId: args.device?.id,
        action: {
          capability: args.capability || 'onoff',
          value: this._parseCapabilityValue(args.capability_value)
        },
        recurrence: {}
      };

      if (args.cron_expression) {
        config.recurrence.cron = args.cron_expression;
      } else if (args.interval_minutes > 0) {
        config.recurrence.intervalMinutes = args.interval_minutes;
      } else {
        // One-shot: fire once
        config.recurrence = {};
      }

      const scheduleId = this._scheduleManager.createSchedule(config);
      return { schedule_id: scheduleId };
    });

    // -- Action: Cancel schedule --
    this._safeRegister('action', 'schedule_cancel', async (args) => {
      if (!this._scheduleManager) return false;
      const identifier = args.schedule_id;
      if (!identifier) return false;

      // Try by ID first
      if (this._scheduleManager.getSchedule(identifier)) {
        this._scheduleManager.deleteSchedule(identifier);
        return true;
      }

      // Try by name
      const allSchedules = this._scheduleManager.getAllSchedules();
      const match = allSchedules.find(s => s.name === identifier);
      if (match) {
        this._scheduleManager.deleteSchedule(match.id);
        return true;
      }

      return false;
    });

    this._registered.triggers.add('schedule_action_executed');
    this._registered.triggers.add('schedule_toggled');
    this._registered.conditions.add('schedule_is_active');
    this._registered.actions.add('schedule_create');
    this._registered.actions.add('schedule_cancel');
  }

  _parseCapabilityValue(value) {
    if (value === undefined || value === null) return true;
    if (value === 'true') return true;
    if (value === 'false') return false;
    const num = Number(value);
    if (!isNaN(num)) return num;
    return value;
  }

  /* ------------------------------------------------------------------ */
  /*  ConditionEngine cards                                              */
  /* ------------------------------------------------------------------ */

  _registerConditionCards() {
    // -- Trigger: Condition evaluated true --
    this._safeRegister('trigger', 'condition_evaluated_true', (args, state) => {
      return state.result === true;
    });

    // -- Condition: All conditions met --
    this._safeRegister('condition', 'condition_all_met', async (args) => {
      if (!args.device) return false;

      const checkCondition = (cap, op, val) => {
        if (!cap || !op) return true; // No condition means pass
        const actual = args.device.getCapabilityValue?.(cap);
        if (actual === undefined || actual === null) return false;
        const expected = Number(val);
        const actualNum = Number(actual);
        switch (op) {
        case '==': return String(actual) === String(val);
        case '!=': return String(actual) !== String(val);
        case '>': return actualNum > expected;
        case '<': return actualNum < expected;
        case '>=': return actualNum >= expected;
        case '<=': return actualNum <= expected;
        default: return actual === val;
        }
      };

      const met1 = checkCondition(args.condition_1_cap, args.condition_1_op, args.condition_1_val);
      const met2 = checkCondition(args.condition_2_cap, args.condition_2_op, args.condition_2_val);
      return met1 && met2;
    }, (args) => ({
      all_met: true
    }));

    // -- Action: Evaluate condition set --
    this._safeRegister('action', 'condition_evaluate_set', async (args) => {
      if (!this._conditionEngine || !args.device) return { result: false, condition_set_id: args.condition_set_id || '' };

      const result = await this._conditionEngine.evaluate(
        { type: 'device_capability', params: { deviceId: args.device.id } },
        { deviceStates: {} }
      );

      return { result, condition_set_id: args.condition_set_id || '' };
    });

    this._registered.triggers.add('condition_evaluated_true');
    this._registered.conditions.add('condition_all_met');
    this._registered.actions.add('condition_evaluate_set');
  }

  /* ------------------------------------------------------------------ */
  /*  PredictiveHealthEngine cards                                       */
  /* ------------------------------------------------------------------ */

  _registerHealthCards() {
    // -- Trigger: Device failure predicted --
    this._safeRegister('trigger', 'health_failure_predicted', (args, state) => {
      return state.type === 'failure_predicted';
    });

    // -- Trigger: Battery replacement predicted --
    this._safeRegister('trigger', 'health_battery_replacement_predicted', (args, state) => {
      return state.type === 'battery_replacement';
    });

    // Hook into PredictiveHealthEngine events
    if (this._predictiveHealthEngine) {
      this._predictiveHealthEngine.on('deviceCritical', (data) => {
        try {
          const card = this.homey.flow.getTriggerCard('health_failure_predicted');
          card?.trigger({ device: { id: data.deviceId } }, {
            health_score: data.analysis?.score || 0,
            status: data.analysis?.status || 'critical',
            failure_type: data.analysis?.anomalies?.[0]?.type || 'health_degradation',
            days_until_failure: null,
            type: 'failure_predicted'
          });
        } catch (_e) { /* non-critical */ }
      });

      this._predictiveHealthEngine.on('alert', (data) => {
        if (data.type === 'battery_critical' || data.type === 'battery_low') {
          try {
            const card = this.homey.flow.getTriggerCard('health_battery_replacement_predicted');
            const analysis = this._predictiveHealthEngine.analyzeDevice(data.deviceId);
            card?.trigger({ device: { id: data.deviceId } }, {
              current_battery: analysis.battery?.currentLevel || 0,
              drain_rate_per_day: Math.abs(analysis.battery?.drainRate || 0),
              days_remaining: analysis.battery?.daysRemaining || null,
              battery_type: analysis.battery?.alert?.type || 'unknown',
              type: 'battery_replacement'
            });
          } catch (_e) { /* non-critical */ }
        }
      });
    }

    // -- Condition: Device health below threshold --
    this._safeRegister('condition', 'health_below_threshold', (args) => {
      if (!this._predictiveHealthEngine || !args.device) return false;
      const analysis = this._predictiveHealthEngine.analyzeDevice(args.device.id);
      const threshold = args.threshold ?? 50;
      return analysis.score < threshold;
    }, (args) => {
      if (!this._predictiveHealthEngine || !args?.device) return { health_score: 0, health_status: 'unknown' };
      const analysis = this._predictiveHealthEngine.analyzeDevice(args.device.id);
      return { health_score: analysis.score, health_status: analysis.status };
    });

    // -- Action: Run health prediction --
    this._safeRegister('action', 'health_run_prediction', async (args) => {
      if (!this._predictiveHealthEngine || !args.device) {
        return { health_score: 0, health_status: 'unknown', signal_quality: 'unknown', battery_days_remaining: null, error_rate: 0 };
      }

      const analysis = this._predictiveHealthEngine.analyzeDevice(args.device.id);
      const batteryDays = this._predictiveHealthEngine.predictBatteryLife(args.device.id);

      return {
        health_score: analysis.score,
        health_status: analysis.status,
        signal_quality: analysis.signal?.quality || 'unknown',
        battery_days_remaining: batteryDays,
        error_rate: analysis.reliability?.errorRate || 0
      };
    });

    this._registered.triggers.add('health_failure_predicted');
    this._registered.triggers.add('health_battery_replacement_predicted');
    this._registered.conditions.add('health_below_threshold');
    this._registered.actions.add('health_run_prediction');
  }

  /* ------------------------------------------------------------------ */
  /*  NetworkTopologyCollector cards                                     */
  /* ------------------------------------------------------------------ */

  _registerNetworkCards() {
    // -- Trigger: New device joined network --
    this._safeRegister('trigger', 'network_new_device_joined', (args, state) => {
      return state.type === 'device_joined';
    });

    // -- Trigger: Weak signal detected --
    this._safeRegister('trigger', 'network_weak_signal_detected', (args, state) => {
      return state.type === 'weak_signal';
    });

    // -- Trigger: Router offline --
    this._safeRegister('trigger', 'network_router_offline', (args, state) => {
      return state.type === 'router_offline';
    });

    // -- Condition: Network health good --
    this._safeRegister('condition', 'network_health_good', (args) => {
      if (!this._networkTopologyCollector) return false;
      const stats = this._networkTopologyCollector.getStats();
      const minCoverage = args.min_coverage ?? 80;
      const maxOrphaned = args.max_orphaned ?? 2;
      return stats.coverageScore >= minCoverage && stats.orphanedDevices <= maxOrphaned;
    }, () => {
      const stats = this._networkTopologyCollector?.getStats() || {};
      return {
        coverage_score: stats.coverageScore || 100,
        total_devices: stats.totalDevices || 0,
        orphaned_devices: stats.orphanedDevices || 0,
        average_lqi: stats.averageLQI || 0
      };
    });

    // -- Action: Scan network topology --
    this._safeRegister('action', 'network_scan_topology', async () => {
      if (!this._networkTopologyCollector) {
        return { total_devices: 0, routers: 0, end_devices: 0, coverage_score: 0, average_lqi: 0, weak_signal_devices: 0, orphaned_devices: 0, max_depth: 0 };
      }

      const stats = this._networkTopologyCollector.getStats();
      const weakDevices = this._networkTopologyCollector.findWeakSignalDevices();
      const orphans = this._networkTopologyCollector.findOrphanedDevices();

      return {
        total_devices: stats.totalDevices,
        routers: stats.routers,
        end_devices: stats.endDevices,
        coverage_score: stats.coverageScore,
        average_lqi: stats.averageLQI,
        weak_signal_devices: weakDevices.length,
        orphaned_devices: orphans.length,
        max_depth: stats.maxDepth
      };
    });

    this._registered.triggers.add('network_new_device_joined');
    this._registered.triggers.add('network_weak_signal_detected');
    this._registered.triggers.add('network_router_offline');
    this._registered.conditions.add('network_health_good');
    this._registered.actions.add('network_scan_topology');
  }

  /* ------------------------------------------------------------------ */
  /*  VirtualPresenceDetector enhanced cards                             */
  /* ------------------------------------------------------------------ */

  _registerPresenceCards() {
    // -- Trigger: Presence detected in zone --
    this._safeRegister('trigger', 'presence_detected_in_zone', (args, state) => {
      return state.type === 'presence_detected';
    });

    // -- Trigger: Presence cleared from zone --
    this._safeRegister('trigger', 'presence_cleared_from_zone', (args, state) => {
      return state.type === 'presence_cleared';
    });

    // -- Condition: Zone is occupied --
    this._safeRegister('condition', 'presence_zone_occupied', (args) => {
      if (!args.device) return false;
      // Try the detector's isPresent method
      if (typeof args.device.isPresent === 'function') return args.device.isPresent();
      // Fallback: check capability
      const val = args.device.getCapabilityValue?.('alarm_motion');
      return val === true;
    }, (args) => {
      const zoneName = args.device?.getName?.() || 'Unknown';
      const confidence = args.device?.presenceDetector?.confidence || 0;
      const state = args.device?.presenceDetector?.state || 'clear';
      const duration = args.device?.presenceDetector?.presenceDurationMinutes || 0;
      return {
        zone_name: zoneName,
        confidence,
        state,
        presence_duration_minutes: duration
      };
    });

    // -- Action: Force presence in zone --
    this._safeRegister('action', 'presence_force_in_zone', async (args) => {
      if (!args.device) return false;

      const forceState = args.force_state || 'present';
      const zoneName = args.device.getName?.() || 'Unknown';

      if (forceState === 'present') {
        if (typeof args.device.forcePresent === 'function') {
          await args.device.forcePresent();
        } else if (args.device.presenceDetector) {
          args.device.presenceDetector.forcePresent();
        }
      } else {
        if (typeof args.device.forceClear === 'function') {
          await args.device.forceClear();
        } else if (args.device.presenceDetector) {
          args.device.presenceDetector.forceClear();
        }
      }

      return {
        zone_name: zoneName,
        new_state: forceState
      };
    });

    this._registered.triggers.add('presence_detected_in_zone');
    this._registered.triggers.add('presence_cleared_from_zone');
    this._registered.conditions.add('presence_zone_occupied');
    this._registered.actions.add('presence_force_in_zone');
  }

  /* ------------------------------------------------------------------ */
  /*  Device Capabilities inspired cards (v9.2.0, from DC app #43287)    */
  /* ------------------------------------------------------------------ */

  /**
   * v9.2.0: Device Capabilities inspired features
   * Features inspired by the Device Capabilities app (QlusterIT):
   * 1. Generic capability value change watcher
   * 2. Historical value retrieval from Insights
   * 3. Zone-wide capability setter
   * 4. App started trigger
   * 5. App running condition
   */
  _registerDeviceCapabilitiesCards() {
    // Historical value store (in-memory ring buffer, 24h retention)
    if (!this._capabilityHistory) {
      this._capabilityHistory = new Map(); // key: deviceId:capability -> [{ts, value}]
      this._historyMaxAge = 24 * 60 * 60 * 1000; // 24 hours
      this._historyMaxEntries = 1440; // 1 per minute for 24h
    }

    // -- Trigger: Any capability value changed (generic watcher) --
    this._safeRegister('trigger', 'capability_value_changed_generic', (args, state) => {
      // Match if no specific device filter or device matches
      if (args.device && state.deviceId && args.device.id !== state.deviceId) return false;
      return true;
    });

    // -- Action: Retrieve historical capability value --
    this._safeRegister('action', 'capability_historical_value', async (args) => {
      const device = args.device;
      if (!device) return false;

      const capability = args.capability;
      if (!capability) return false;

      const minutesAgo = parseInt(args.minutes_ago) || 0;

      // If minutes_ago is 0, return current value
      if (minutesAgo === 0) {
        const currentValue = device.getCapabilityValue?.(capability);
        return { value: String(currentValue ?? '') };
      }

      // Try to get from Insights API first
      try {
        const insights = await this.homey.insights.getLogEntries({
          uri: `homey:device:${device.id}`,
          name: capability,
        });

        if (insights && insights.length > 0) {
          const targetTime = Date.now() - (minutesAgo * 60 * 1000);
          // Find closest entry to target time
          let closest = insights[0];
          let closestDiff = Math.abs(closest.date - targetTime);

          for (const entry of insights) {
            const diff = Math.abs(entry.date - targetTime);
            if (diff < closestDiff) {
              closest = entry;
              closestDiff = diff;
            }
          }

          return { value: String(closest.value ?? '') };
        }
      } catch (e) {
        // Insights API not available, fall back to in-memory history
      }

      // Fallback: use in-memory history
      const historyKey = `${device.id}:${capability}`;
      const history = this._capabilityHistory.get(historyKey) || [];
      const targetTime = Date.now() - (minutesAgo * 60 * 1000);

      if (history.length === 0) return { value: '' };

      // Find closest entry
      let closest = history[0];
      let closestDiff = Math.abs(closest.ts - targetTime);

      for (const entry of history) {
        const diff = Math.abs(entry.ts - targetTime);
        if (diff < closestDiff) {
          closest = entry;
          closestDiff = diff;
        }
      }

      return { value: String(closest.value ?? '') };
    });

    // -- Action: Set capability for all devices in zone --
    this._safeRegister('action', 'zone_capability_set', async (args) => {
      const zoneId = args.zone;
      const capability = args.capability;
      const value = args.value;
      const includeSubzones = args.include_subzones === true;

      if (!zoneId || !capability) return false;

      // Parse value (handle boolean strings)
      let parsedValue = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(value) && value !== '') parsedValue = Number(value);

      let devicesSet = 0;

      try {
        // Get all devices
        const drivers = Object.values(this.homey.drivers.getDrivers());
        for (const driver of drivers) {
          const devices = driver.getDevices?.() || [];
          for (const device of devices) {
            // Check if device is in the target zone
            const deviceZoneId = device.getZone?.();
            if (!deviceZoneId) continue;

            let zoneMatch = deviceZoneId === zoneId;

            // Check subzones if requested
            if (!zoneMatch && includeSubzones) {
              try {
                const zone = await this.homey.zones.getZone({ id: deviceZoneId });
                if (zone && zone.parent === zoneId) {
                  zoneMatch = true;
                }
              } catch (_e) { /* zone not found */ }
            }

            if (!zoneMatch) continue;

            // Check if device has the capability
            if (!device.hasCapability?.(capability)) continue;

            try {
              if (typeof device.triggerCapabilityListener === 'function') {
                await device.triggerCapabilityListener(capability, parsedValue);
              } else {
                await device.setCapabilityValue(capability, parsedValue).catch(() => {});
              }
              devicesSet++;
            } catch (_e) { /* device set failed, continue */ }
          }
        }
      } catch (_e) { /* zone enumeration failed */ }

      return { devices_set: devicesSet };
    });

    // -- Trigger: App is started --
    this._safeRegister('trigger', 'app_started', (args, state) => {
      if (!args.app_id) return true; // Any app
      return state.app_id === args.app_id;
    });

    // Listen for app lifecycle events
    try {
      this.homey.on('app.install', (appData) => {
        this._triggerAppStarted(appData);
      });
      this.homey.on('app.update', (appData) => {
        this._triggerAppStarted(appData);
      });
    } catch (_e) {
      // App lifecycle events may not be available in all SDK versions
    }

    // -- Condition: App is running --
    this._safeRegister('condition', 'app_running', async (args) => {
      const appId = args.app_id;
      if (!appId) return false;

      try {
        const app = await this.homey.apps.getApp({ id: appId });
        return app && app.state === 'running';
      } catch (_e) {
        return false;
      }
    });

    // Register all new cards
    this._registered.triggers.add('capability_value_changed_generic');
    this._registered.actions.add('capability_historical_value');
    this._registered.actions.add('zone_capability_set');
    this._registered.triggers.add('app_started');
    this._registered.conditions.add('app_running');

    this.homey.log('[FEATURE-FLOW] Device Capabilities cards registered (5 new cards)');
  }

  /**
   * Trigger the app_started flow card.
   * @param {Object} appData - App data from Homey event
   */
  _triggerAppStarted(appData) {
    try {
      const card = this.homey.flow.getTriggerCard('app_started');
      if (!card) return;

      const appId = appData?.id || appData?.appId || '';
      const appName = appData?.name || appId;

      card.trigger({
        app_id: appId,
      }, {
        app_name: appName,
      }).catch(() => {});
    } catch (_e) { /* non-critical */ }
  }

  /**
   * Store a capability value in the history ring buffer.
   * Called by device base classes on capability change.
   * @param {string} deviceId
   * @param {string} capability
   * @param {*} value
   */
  storeCapabilityHistory(deviceId, capability, value) {
    if (!this._capabilityHistory) return;

    const key = `${deviceId}:${capability}`;
    let history = this._capabilityHistory.get(key);

    if (!history) {
      history = [];
      this._capabilityHistory.set(key, history);
    }

    const now = Date.now();

    // Add new entry
    history.push({ ts: now, value });

    // Prune old entries
    while (history.length > 0 && (now - history[0].ts > this._historyMaxAge || history.length > this._historyMaxEntries)) {
      history.shift();
    }
  }

  /**
   * Trigger the generic capability changed flow card.
   * Called by device base classes on capability change.
   * @param {string} deviceId
   * @param {string} capability
   * @param {*} newValue
   * @param {*} oldValue
   */
  triggerCapabilityChanged(deviceId, capability, newValue, oldValue) {
    try {
      const card = this.homey.flow.getTriggerCard('capability_value_changed_generic');
      if (!card) return;

      // Store in history
      this.storeCapabilityHistory(deviceId, capability, newValue);

      card.trigger({
        device: deviceId,
      }, {
        capability,
        value: String(newValue ?? ''),
        old_value: String(oldValue ?? ''),
        deviceId,
      }).catch(() => {});
    } catch (_e) { /* non-critical */ }
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  _getSolarFlowTokens(data = {}) {
    return {
      elevation: this._safeNumber(data.elevation ?? this._solarElevation?.getElevation(), 0),
      azimuth: this._safeNumber(data.azimuth ?? this._solarElevation?.getAzimuth(), 0),
      category: this._safeString(data.category ?? this._solarElevation?.getElevationCategory(), 'unknown'),
      timestamp: this._safeString(data.timestamp instanceof Date ? data.timestamp.toISOString() : data.timestamp, new Date().toISOString())
    };
  }

  _safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  _safeString(value, fallback = '') {
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  }

  _triggerFeatureCard(cardId, tokens = {}, state = {}) {
    try {
      const card = this.homey.flow.getTriggerCard(cardId);
      if (!card || typeof card.trigger !== 'function') return;

      const result = card.trigger(tokens, state);
      if (result && typeof result.catch === 'function') {
        result.catch(err => {
          this.homey.error(`[FEATURE-FLOW] ${cardId} trigger error:`, err?.message || err);
        });
      }
    } catch (err) {
      this.homey.error(`[FEATURE-FLOW] ${cardId} trigger error:`, err?.message || err);
    }
  }

  /**
   * Safely register a flow card run listener.
   * @param {'trigger'|'condition'|'action'} type
   * @param {string} cardId
   * @param {Function} runListener
   * @param {Function} [stateFactory] - For triggers: returns state tokens
   */
  _safeRegister(type, cardId, runListener, stateFactory) {
    try {
      let card;
      switch (type) {
      case 'trigger':
        card = this.homey.flow.getTriggerCard(cardId);
        break;
      case 'condition':
        card = this.homey.flow.getConditionCard(cardId);
        break;
      case 'action':
        card = this.homey.flow.getActionCard(cardId);
        break;
      }

      if (!card) {
        this.homey.log(`[FEATURE-FLOW] Card not found in manifest: ${cardId} (${type})`);
        return;
      }

      card.registerRunListener(async (args, state) => {
        try {
          return await runListener(args, state);
        } catch (err) {
          this.homey.error(`[FEATURE-FLOW] ${cardId} listener error:`, err.message);
          return false;
        }
      });

      // For conditions: register state getter for token output
      if (type === 'condition' && typeof stateFactory === 'function') {
        try {
          card.registerConditionStateListener(async (args) => {
            try {
              return await stateFactory(args);
            } catch (_e) {
              return {};
            }
          });
        } catch (_e) {
          // registerConditionStateListener may not be available in all SDK versions
        }
      }
    } catch (err) {
      this.homey.error(`[FEATURE-FLOW] Failed to register ${type} ${cardId}:`, err.message);
    }
  }

  /**
   * Destroy and cleanup.
   */
  destroy() {
    this._solarElevation = null;
    this._transitionEngine = null;
    this._energyHistoryStore = null;
    this._tariffCalculator = null;
    this._scheduleManager = null;
    this._conditionEngine = null;
    this._predictiveHealthEngine = null;
    this._networkTopologyCollector = null;
    if (this._capabilityHistory) {
      this._capabilityHistory.clear();
      this._capabilityHistory = null;
    }
    this._registered.triggers.clear();
    this._registered.conditions.clear();
    this._registered.actions.clear();
  }
}

module.exports = FeatureFlowCards;
