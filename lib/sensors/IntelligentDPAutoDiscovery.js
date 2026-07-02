'use strict';

const DEFAULT_LEARNING_WINDOW_MS = 15 * 60 * 1000;
const MIN_LEARNING_WINDOW_MS = 15 * 60 * 1000;
const MAX_SAMPLE_COUNT = 240;
const MAX_FRAME_COUNT = 160;
const STORE_THROTTLE_MS = 30 * 1000;

const DP_PRIORS = {
  battery: new Set([4, 10, 15, 21, 33, 35, 121]),
  presence: new Set([1, 6, 101, 102, 104, 105, 106, 112]),
  contact: new Set([1, 7, 16, 104]),
  distance: new Set([9, 19, 101, 109, 119]),
  lux: new Set([12, 20, 102, 103, 106]),
  temperature: new Set([1, 3, 18, 101, 111]),
  humidity: new Set([2, 5, 19, 102]),
  power: new Set([19, 102, 103]),
  voltage: new Set([20, 101]),
  current: new Set([18, 105]),
  energy: new Set([17, 106]),
  button: new Set([1, 2, 3, 4, 5, 6, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 120, 121]),
  onoff: new Set([1, 2, 3, 4, 5, 6, 7, 14, 16])
};

const PROFILE_LABELS = {
  button_wireless: 'Tuya Wireless Button',
  button_wireless_1: 'Tuya Wireless Button 1-Gang',
  button_wireless_2: 'Tuya Wireless Button 2-Gang',
  button_wireless_3: 'Tuya Wireless Button 3-Gang',
  button_wireless_4: 'Tuya Wireless Button 4-Gang',
  button_wireless_5: 'Tuya Wireless Button 5-Gang',
  button_wireless_6: 'Tuya Wireless Button 6-Gang',
  presence_sensor_radar: 'Tuya Presence Radar Sensor',
  sensor_illuminance_presence: 'Tuya Illuminance Presence Sensor',
  sensor_climate_presence: 'Tuya Climate Presence Sensor',
  climate_sensor: 'Tuya Climate Sensor',
  contact_sensor: 'Tuya Contact Sensor',
  power_plug: 'Tuya Power Plug',
  switch: 'Tuya Switch',
  generic_tuya: 'Tuya Generic Zigbee Device'
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function average(values) {
  if (!values.length) {return null;}
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stableStringify(value) {
  if (Buffer.isBuffer(value)) {return `buffer:${value.length}:${value.toString('hex', 0, Math.min(value.length, 8))}`;}
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Learns unknown Tuya DPs over a real observation window.
 *
 * The class keeps only compact samples and frame summaries, never raw long
 * payloads. It is intentionally conservative: it may recommend a better
 * profile/driver, but automatic driver migration is left to the existing safe
 * driver-switching layer.
 */
class IntelligentDPAutoDiscovery {
  constructor(device, options = {}) {
    this.device = device;
    this.discoveredDPs = new Map();
    this.zclObservations = new Map();
    this.frameLog = [];
    this.learningPhase = true;
    this.learningStartTime = options.startTime || Date.now();
    this.learningDurationMs = this._resolveLearningDuration(options.learningDurationMs);
    this.minSamplesForConfidence = options.minSamplesForConfidence || 3;
    this.maxSamples = options.maxSamples || MAX_SAMPLE_COUNT;
    this.maxFrames = options.maxFrames || MAX_FRAME_COUNT;
    this.profileRecommendation = null;
    this._lastStoreAt = 0;
  }

  _resolveLearningDuration(explicitValue) {
    const settingValue = this._getSetting('dp_learning_window_minutes');
    const envValue = process.env.TUYA_DP_LEARNING_MINUTES;
    const minutes = Number(settingValue || envValue);
    const fromMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : null;
    const resolved = explicitValue || fromMinutes || DEFAULT_LEARNING_WINDOW_MS;
    return Math.max(MIN_LEARNING_WINDOW_MS, resolved);
  }

  /**
   * Backward-compatible entrypoint used by existing drivers.
   */
  analyzeDP(dpId, value, meta = {}) {
    return this.recordDP(dpId, value, meta);
  }

  recordDP(dpId, value, meta = {}) {
    const numericDp = Number(dpId);
    if (!Number.isInteger(numericDp) || numericDp <= 0) {return null;}

    const now = Number(meta.timestamp) || Date.now();
    const direction = meta.direction || 'rx';
    const source = meta.source || 'tuya_dp';
    const normalized = this._normalizeValue(value);
    const sampleKey = this._sampleKey(normalized, meta.dpType || meta.type);
    const dpInfo = this._getOrCreateDP(numericDp, now);

    if (dpInfo.lastSampleKey === sampleKey && now - dpInfo.lastUpdate < 250 && direction !== 'tx') {
      dpInfo.duplicateCount += 1;
      return dpInfo;
    }

    dpInfo.samples.push({
      time: now,
      value: normalized.value,
      numeric: normalized.numeric,
      kind: normalized.kind,
      dpType: meta.dpType || meta.type || 'unknown',
      direction,
      source,
      endpoint: meta.endpoint,
      clusterId: meta.clusterId,
      commandId: meta.commandId,
      estimated: Boolean(meta.estimated)
    });

    if (dpInfo.samples.length > this.maxSamples) {
      dpInfo.samples.splice(0, dpInfo.samples.length - this.maxSamples);
    }

    dpInfo.lastValue = normalized.value;
    dpInfo.lastNumeric = normalized.numeric;
    dpInfo.lastKind = normalized.kind;
    dpInfo.lastUpdate = now;
    dpInfo.lastSampleKey = sampleKey;
    dpInfo.directions[direction] = (dpInfo.directions[direction] || 0) + 1;
    dpInfo.sources[source] = (dpInfo.sources[source] || 0) + 1;
    dpInfo.dpTypes[meta.dpType || meta.type || 'unknown'] = (dpInfo.dpTypes[meta.dpType || meta.type || 'unknown'] || 0) + 1;

    this._inferDPType(numericDp, dpInfo);
    this._updateLearningPhase(now);
    this._updateProfileRecommendation();
    this._storeLearningReportThrottled(false);

    return dpInfo;
  }

  recordFrame(frame, direction = 'rx', meta = {}) {
    const now = Number(meta.timestamp) || Date.now();
    const summary = this._normalizeFrame(frame, direction, meta, now);
    if (!summary) {return null;}

    this.frameLog.push(summary);
    if (this.frameLog.length > this.maxFrames) {
      this.frameLog.splice(0, this.frameLog.length - this.maxFrames);
    }

    const datapoints = Array.isArray(summary.datapoints) ? summary.datapoints : [];
    for (const dp of datapoints) {
      if (dp && dp.dpId !== undefined) {
        this.recordDP(dp.dpId, dp.value, {
          dpType: dp.dpType,
          direction,
          source: summary.source || 'frame',
          endpoint: summary.endpoint,
          clusterId: summary.clusterId,
          commandId: summary.commandId,
          timestamp: now
        });
      }
    }

    this._storeLearningReportThrottled(false);
    return summary;
  }

  recordRxFrame(frame, meta = {}) {
    return this.recordFrame(frame, 'rx', meta);
  }

  recordTxFrame(frame, meta = {}) {
    return this.recordFrame(frame, 'tx', meta);
  }

  recordZCL(type, value, meta = {}) {
    const now = Number(meta.timestamp) || Date.now();
    const normalized = this._normalizeValue(value);
    const key = String(type || 'unknown');
    const current = this.zclObservations.get(key) || {
      type: key,
      firstSeen: now,
      lastSeen: now,
      count: 0,
      samples: []
    };

    current.lastSeen = now;
    current.count += 1;
    current.samples.push({
      time: now,
      value: normalized.value,
      numeric: normalized.numeric,
      unit: meta.unit || ''
    });

    if (current.samples.length > 40) {
      current.samples.splice(0, current.samples.length - 40);
    }

    this.zclObservations.set(key, current);
    this._updateProfileRecommendation();
    this._storeLearningReportThrottled(false);
    return current;
  }

  _getOrCreateDP(dpId, now) {
    if (!this.discoveredDPs.has(dpId)) {
      this.discoveredDPs.set(dpId, {
        dpId,
        samples: [],
        firstSeen: now,
        lastUpdate: now,
        lastValue: null,
        lastNumeric: null,
        lastKind: null,
        lastSampleKey: null,
        duplicateCount: 0,
        directions: {},
        sources: {},
        dpTypes: {},
        inferredType: null,
        inferredCapability: null,
        confidence: 0,
        divisor: 1,
        estimated: false,
        pressMap: null,
        button: null,
        evidence: [],
        contradictions: []
      });
    }
    return this.discoveredDPs.get(dpId);
  }

  _normalizeValue(value) {
    if (Buffer.isBuffer(value)) {
      let numeric = null;
      if (value.length === 1) {numeric = value.readUInt8(0);}
      else if (value.length === 2) {numeric = value.readUInt16BE(0);}
      else if (value.length === 4) {numeric = value.readInt32BE(0);}
      return {
        kind: 'buffer',
        value: { kind: 'buffer', length: value.length, hexPrefix: value.toString('hex', 0, Math.min(value.length, 8)) },
        numeric
      };
    }

    if (typeof value === 'boolean') {
      return { kind: 'boolean', value, numeric: value ? 1 : 0 };
    }

    if (typeof value === 'number') {
      return { kind: 'number', value, numeric: Number.isFinite(value) ? value : null };
    }

    if (typeof value === 'string') {
      const numeric = value.trim() !== '' ? Number(value) : NaN;
      return {
        kind: Number.isFinite(numeric) ? 'numeric_string' : 'string',
        value: value.length > 80 ? `${value.slice(0, 80)}...` : value,
        numeric: Number.isFinite(numeric) ? numeric : null
      };
    }

    if (value && typeof value === 'object') {
      const known = value.value ?? value.dpValue ?? value.data ?? value.raw;
      if (known !== undefined && known !== value) {return this._normalizeValue(known);}
      return {
        kind: 'object',
        value: { kind: 'object', keys: Object.keys(value).slice(0, 8) },
        numeric: null
      };
    }

    return { kind: value === null ? 'null' : 'undefined', value: value ?? null, numeric: null };
  }

  _sampleKey(normalized, dpType) {
    return `${dpType || 'unknown'}:${normalized.kind}:${stableStringify(normalized.value)}`;
  }

  _inferDPType(dpId, dpInfo) {
    const stats = this._buildStats(dpInfo);
    const candidates = [];
    const add = candidate => {
      if (candidate && candidate.confidence > 0) {candidates.push(candidate);}
    };

    add(this._batteryCandidate(dpId, stats));
    add(this._buttonCandidate(dpId, stats));
    add(this._presenceCandidate(dpId, stats));
    add(this._contactCandidate(dpId, stats));
    add(this._distanceCandidate(dpId, stats));
    add(this._luxCandidate(dpId, stats));
    add(this._temperatureCandidate(dpId, stats));
    add(this._humidityCandidate(dpId, stats));
    add(this._powerCandidate(dpId, stats));
    add(this._voltageCandidate(dpId, stats));
    add(this._currentCandidate(dpId, stats));
    add(this._energyCandidate(dpId, stats));
    add(this._onOffCandidate(dpId, stats));
    add(this._enumCandidate(dpId, stats));

    candidates.sort((a, b) => b.confidence - a.confidence);
    const winner = candidates[0] || null;

    if (!winner || winner.confidence < 35) {
      dpInfo.inferredType = dpInfo.inferredType || 'unknown';
      dpInfo.inferredCapability = null;
      dpInfo.confidence = 0;
      dpInfo.evidence = stats.reasons.slice(0, 8);
      dpInfo.contradictions = stats.contradictions.slice(0, 8);
      return;
    }

    dpInfo.inferredType = winner.type;
    dpInfo.inferredCapability = winner.capability;
    dpInfo.confidence = winner.confidence;
    dpInfo.divisor = winner.divisor || 1;
    dpInfo.estimated = Boolean(winner.estimated);
    dpInfo.pressMap = winner.pressMap || null;
    dpInfo.button = winner.button || null;
    dpInfo.evidence = winner.evidence.slice(0, 10);
    dpInfo.contradictions = winner.contradictions.slice(0, 8);
  }

  _buildStats(dpInfo) {
    const samples = dpInfo.samples;
    const numeric = samples.map(sample => sample.numeric).filter(isFiniteNumber);
    const values = samples.map(sample => sample.value);
    const uniqueStrings = [...new Set(values.map(stableStringify))];
    const uniqueNumbers = [...new Set(numeric.map(value => round(value, 3)))];
    const min = numeric.length ? Math.min(...numeric) : null;
    const max = numeric.length ? Math.max(...numeric) : null;
    const avgValue = average(numeric);
    const range = numeric.length ? max - min : null;
    const first = samples[0]?.time || dpInfo.firstSeen;
    const last = samples[samples.length - 1]?.time || dpInfo.lastUpdate;
    const elapsedMs = Math.max(0, last - first);
    const boolish = samples.length > 0 && samples.every(sample => {
      if (sample.kind === 'boolean') {return true;}
      return isFiniteNumber(sample.numeric) && (sample.numeric === 0 || sample.numeric === 1);
    });
    const integerish = numeric.length > 0 && numeric.every(value => Number.isInteger(value));
    const changes = samples.reduce((count, sample, index) => {
      if (index === 0) {return count;}
      return stableStringify(sample.value) === stableStringify(samples[index - 1].value) ? count : count + 1;
    }, 0);
    const monotonic = numeric.length > 2 && numeric.every((value, index) => index === 0 || value >= numeric[index - 1]);
    const sampleConfidence = Math.min(18, samples.length * 3);
    const coverageConfidence = Math.min(14, (elapsedMs / this.learningDurationMs) * 14);
    const stableRange = range !== null && range <= Math.max(2, Math.abs(avgValue || 0) * 0.08);

    return {
      samples,
      numeric,
      values,
      uniqueStrings,
      uniqueNumbers,
      uniqueCount: uniqueStrings.length,
      min,
      max,
      avg: avgValue,
      range,
      first,
      last,
      elapsedMs,
      boolish,
      integerish,
      changes,
      monotonic,
      stableRange,
      sampleConfidence,
      coverageConfidence,
      sampleCount: samples.length,
      numericRatio: samples.length ? numeric.length / samples.length : 0,
      dpTypes: dpInfo.dpTypes,
      reasons: [],
      contradictions: []
    };
  }

  _confidence(base, dpId, stats, priorName, options = {}) {
    let score = base + stats.sampleConfidence + stats.coverageConfidence;
    const evidence = [];
    const contradictions = [];

    if (priorName && DP_PRIORS[priorName]?.has(dpId)) {
      score += options.priorBonus ?? 18;
      evidence.push(`dp_id_prior:${priorName}`);
    }

    if (stats.sampleCount >= this.minSamplesForConfidence) {
      score += 6;
      evidence.push(`samples:${stats.sampleCount}`);
    } else {
      score -= 8;
      contradictions.push(`few_samples:${stats.sampleCount}`);
    }

    if (stats.elapsedMs >= this.learningDurationMs) {
      score += 8;
      evidence.push('learning_window_complete');
    } else {
      evidence.push(`learning:${Math.round(stats.elapsedMs / 1000)}s/${Math.round(this.learningDurationMs / 1000)}s`);
    }

    if (stats.numericRatio < (options.minNumericRatio || 0.75)) {
      score -= 10;
      contradictions.push(`numeric_ratio:${round(stats.numericRatio, 2)}`);
    }

    if (options.stable && stats.stableRange) {
      score += 8;
      evidence.push('stable_values');
    }

    if (options.changing && stats.changes > 0) {
      score += 4;
      evidence.push(`changes:${stats.changes}`);
    }

    if (options.penalty) {
      score -= options.penalty;
    }

    return {
      confidence: clamp(Math.round(score), 0, 99),
      evidence,
      contradictions
    };
  }

  _batteryCandidate(dpId, stats) {
    if (!stats.numeric.length) {return null;}
    const hasPrior = DP_PRIORS.battery.has(dpId);
    const directPercent = stats.min >= 0 && stats.max <= 100 && !stats.boolish;
    const halfPercent = stats.min >= 0 && stats.max <= 200 && stats.max > 100 && hasPrior && !stats.boolish;
    const voltage = this._looksLikeBatteryVoltage(stats.avg, stats.max) && (hasPrior || this._hasCapability('measure_battery'));

    if (!directPercent && !halfPercent && !voltage) {return null;}

    const kind = voltage ? 'battery_voltage_estimated' : halfPercent ? 'battery_half_percent' : 'battery_percent';
    const scored = this._confidence(voltage ? 42 : 50, dpId, stats, 'battery', {
      stable: true,
      priorBonus: hasPrior ? 24 : 8,
      penalty: stats.range !== null && stats.range > 40 ? 12 : 0
    });

    return {
      type: kind,
      capability: 'measure_battery',
      divisor: halfPercent ? 2 : 1,
      estimated: voltage,
      confidence: scored.confidence,
      evidence: [...scored.evidence, voltage ? 'voltage_curve_estimate' : 'percent_range'],
      contradictions: scored.contradictions
    };
  }

  _buttonCandidate(dpId, stats) {
    const modelId = this._getModelId();
    const hasButtonHint = DP_PRIORS.button.has(dpId) || this._hasAnyCapability(/^button(\.\d+)?$/) || /^TS004|TS0601$/i.test(modelId);
    const enumValues = stats.integerish && stats.uniqueNumbers.every(value => value >= 0 && value <= 6);
    const eventLike = enumValues && stats.uniqueNumbers.length <= 7 && stats.sampleCount >= 1;
    if (!hasButtonHint || !eventLike) {return null;}

    const button = this._buttonIndexForDP(dpId);
    const scored = this._confidence(44, dpId, stats, 'button', {
      changing: true,
      priorBonus: this._hasAnyCapability(/^button(\.\d+)?$/) ? 28 : 18,
      penalty: stats.boolish && this._hasCapability('alarm_motion') ? 20 : 0
    });

    return {
      type: 'button_event',
      capability: `button.${button}`,
      button,
      pressMap: { 0: 'single', 1: 'double', 2: 'long', 3: 'release', 4: 'multi', 5: 'multi', 6: 'multi' },
      confidence: scored.confidence,
      evidence: [...scored.evidence, 'small_enum_press_map'],
      contradictions: scored.contradictions
    };
  }

  _presenceCandidate(dpId, stats) {
    const hasPresenceHint = DP_PRIORS.presence.has(dpId) || this._hasCapability('alarm_motion') || this._hasCapability('alarm_presence');
    if (!hasPresenceHint || (!stats.boolish && !(stats.integerish && stats.uniqueNumbers.every(value => value >= 0 && value <= 3)))) {return null;}

    const scored = this._confidence(48, dpId, stats, 'presence', {
      changing: true,
      priorBonus: this._hasCapability('alarm_motion') || this._hasCapability('alarm_presence') ? 26 : 18,
      penalty: this._hasAnyCapability(/^button(\.\d+)?$/) ? 12 : 0
    });

    return {
      type: stats.boolish ? 'presence_bool' : 'presence_enum',
      capability: this._hasCapability('alarm_presence') ? 'alarm_presence' : 'alarm_motion',
      confidence: scored.confidence,
      evidence: [...scored.evidence, stats.boolish ? 'boolish_presence' : 'enum_presence'],
      contradictions: scored.contradictions
    };
  }

  _contactCandidate(dpId, stats) {
    if (!stats.boolish) {return null;}
    const hasContactHint = DP_PRIORS.contact.has(dpId) || this._hasCapability('alarm_contact');
    if (!hasContactHint) {return null;}

    const scored = this._confidence(42, dpId, stats, 'contact', {
      changing: true,
      priorBonus: this._hasCapability('alarm_contact') ? 24 : 16,
      penalty: this._hasCapability('alarm_motion') ? 12 : 0
    });

    return {
      type: 'contact_bool',
      capability: 'alarm_contact',
      confidence: scored.confidence,
      evidence: [...scored.evidence, 'boolish_contact'],
      contradictions: scored.contradictions
    };
  }

  _distanceCandidate(dpId, stats) {
    if (!stats.numeric.length) {return null;}
    const plausible = stats.min >= 0 && stats.max <= 10000 && (DP_PRIORS.distance.has(dpId) || this._hasCapability('measure_distance') || this._hasCapability('target_distance'));
    if (!plausible) {return null;}
    const divisor = stats.avg > 30 ? 100 : 1;
    const scored = this._confidence(45, dpId, stats, 'distance', { stable: true, priorBonus: 20 });

    return {
      type: 'distance',
      capability: this._hasCapability('target_distance') ? 'target_distance' : 'measure_distance',
      divisor,
      confidence: scored.confidence,
      evidence: [...scored.evidence, `distance_divisor:${divisor}`],
      contradictions: scored.contradictions
    };
  }

  _luxCandidate(dpId, stats) {
    if (!stats.numeric.length || stats.boolish) {return null;}
    const plausible = stats.min >= 0 && stats.max <= 200000 && (DP_PRIORS.lux.has(dpId) || this._hasCapability('measure_luminance') || stats.max > 100);
    if (!plausible) {return null;}
    const scored = this._confidence(38, dpId, stats, 'lux', {
      changing: true,
      priorBonus: DP_PRIORS.lux.has(dpId) ? 22 : 8
    });

    return {
      type: 'lux_direct',
      capability: 'measure_luminance',
      confidence: scored.confidence,
      evidence: [...scored.evidence, 'non_negative_lux_range'],
      contradictions: scored.contradictions
    };
  }

  _temperatureCandidate(dpId, stats) {
    if (!stats.numeric.length || stats.boolish) {return null;}
    const hasHint = DP_PRIORS.temperature.has(dpId) || this._hasCapability('measure_temperature');
    const direct = stats.min >= -40 && stats.max <= 85;
    const x10 = stats.min >= -400 && stats.max <= 850 && Math.max(Math.abs(stats.avg || 0), Math.abs(stats.max || 0)) > 85;
    const x100 = stats.min >= -4000 && stats.max <= 8500 && Math.max(Math.abs(stats.avg || 0), Math.abs(stats.max || 0)) > 850;
    if (!hasHint && !x10 && !x100) {return null;}
    if (!direct && !x10 && !x100) {return null;}

    const divisor = x100 ? 100 : x10 ? 10 : 1;
    const scored = this._confidence(38, dpId, stats, 'temperature', {
      stable: true,
      priorBonus: hasHint ? 22 : 6,
      penalty: !hasHint && direct ? 12 : 0
    });

    return {
      type: 'temperature',
      capability: 'measure_temperature',
      divisor,
      confidence: scored.confidence,
      evidence: [...scored.evidence, `temperature_divisor:${divisor}`],
      contradictions: scored.contradictions
    };
  }

  _humidityCandidate(dpId, stats) {
    if (!stats.numeric.length || stats.boolish) {return null;}
    const hasHint = DP_PRIORS.humidity.has(dpId) || this._hasCapability('measure_humidity');
    const direct = stats.min >= 0 && stats.max <= 100;
    const x10 = stats.min >= 0 && stats.max <= 1000 && stats.max > 100;
    if (!hasHint && !x10) {return null;}
    if (!direct && !x10) {return null;}

    const divisor = x10 ? 10 : 1;
    const scored = this._confidence(38, dpId, stats, 'humidity', {
      stable: true,
      priorBonus: hasHint ? 22 : 6,
      penalty: !hasHint && direct ? 10 : 0
    });

    return {
      type: 'humidity',
      capability: 'measure_humidity',
      divisor,
      confidence: scored.confidence,
      evidence: [...scored.evidence, `humidity_divisor:${divisor}`],
      contradictions: scored.contradictions
    };
  }

  _powerCandidate(dpId, stats) {
    if (!stats.numeric.length || stats.boolish) {return null;}
    const plausible = stats.min >= 0 && stats.max <= 100000 && (DP_PRIORS.power.has(dpId) || this._hasCapability('measure_power'));
    if (!plausible) {return null;}
    const divisor = stats.max > 5000 ? 10 : 1;
    const scored = this._confidence(34, dpId, stats, 'power', { changing: true, priorBonus: 16 });

    return {
      type: 'power',
      capability: 'measure_power',
      divisor,
      confidence: scored.confidence,
      evidence: [...scored.evidence, `power_divisor:${divisor}`],
      contradictions: scored.contradictions
    };
  }

  _voltageCandidate(dpId, stats) {
    if (!stats.numeric.length || stats.boolish) {return null;}
    const plausible = stats.min >= 0 && stats.max <= 300000 && (DP_PRIORS.voltage.has(dpId) || this._hasCapability('measure_voltage'));
    if (!plausible) {return null;}
    let divisor = 1;
    if (stats.avg > 1000) {divisor = 10;}
    if (stats.avg > 10000) {divisor = 100;}
    const scored = this._confidence(32, dpId, stats, 'voltage', { stable: true, priorBonus: 14 });

    return {
      type: 'voltage',
      capability: 'measure_voltage',
      divisor,
      confidence: scored.confidence,
      evidence: [...scored.evidence, `voltage_divisor:${divisor}`],
      contradictions: scored.contradictions
    };
  }

  _currentCandidate(dpId, stats) {
    if (!stats.numeric.length || stats.boolish) {return null;}
    const plausible = stats.min >= 0 && stats.max <= 100000 && (DP_PRIORS.current.has(dpId) || this._hasCapability('measure_current'));
    if (!plausible) {return null;}
    const divisor = stats.max > 100 ? 1000 : 1;
    const scored = this._confidence(32, dpId, stats, 'current', { changing: true, priorBonus: 14 });

    return {
      type: 'current',
      capability: 'measure_current',
      divisor,
      confidence: scored.confidence,
      evidence: [...scored.evidence, `current_divisor:${divisor}`],
      contradictions: scored.contradictions
    };
  }

  _energyCandidate(dpId, stats) {
    if (!stats.numeric.length || stats.boolish) {return null;}
    const plausible = stats.min >= 0 && stats.max <= 100000000 && (DP_PRIORS.energy.has(dpId) || this._hasCapability('meter_power') || stats.monotonic);
    if (!plausible) {return null;}
    const divisor = stats.max > 10000 ? 1000 : 1;
    const scored = this._confidence(32, dpId, stats, 'energy', {
      changing: true,
      priorBonus: DP_PRIORS.energy.has(dpId) ? 18 : 8,
      penalty: stats.monotonic ? 0 : 10
    });

    return {
      type: 'energy',
      capability: 'meter_power',
      divisor,
      confidence: scored.confidence,
      evidence: [...scored.evidence, `energy_divisor:${divisor}`, stats.monotonic ? 'monotonic' : 'not_monotonic'],
      contradictions: scored.contradictions
    };
  }

  _onOffCandidate(dpId, stats) {
    if (!stats.boolish) {return null;}
    const hasHint = DP_PRIORS.onoff.has(dpId) || this._hasCapability('onoff') || this._hasAnyCapability(/^onoff\./);
    if (!hasHint) {return null;}

    const scored = this._confidence(34, dpId, stats, 'onoff', {
      changing: true,
      priorBonus: this._hasCapability('onoff') ? 20 : 10,
      penalty: this._hasCapability('alarm_motion') || this._hasAnyCapability(/^button\./) ? 12 : 0
    });

    return {
      type: 'onoff_bool',
      capability: 'onoff',
      confidence: scored.confidence,
      evidence: [...scored.evidence, 'boolish_onoff'],
      contradictions: scored.contradictions
    };
  }

  _enumCandidate(dpId, stats) {
    if (!stats.integerish || stats.boolish || stats.uniqueNumbers.length > 12 || stats.uniqueNumbers.length < 2) {return null;}
    const scored = this._confidence(24, dpId, stats, null, {
      changing: true,
      priorBonus: 0,
      minNumericRatio: 0.5
    });

    return {
      type: 'enum_unknown',
      capability: null,
      confidence: Math.min(scored.confidence, 55),
      evidence: [...scored.evidence, 'bounded_enum_unknown'],
      contradictions: scored.contradictions
    };
  }

  _looksLikeBatteryVoltage(avgValue, maxValue) {
    if (!isFiniteNumber(avgValue) || !isFiniteNumber(maxValue)) {return false;}
    return (avgValue >= 2 && avgValue <= 3.7) ||
      (avgValue >= 20 && avgValue <= 37) ||
      (avgValue >= 2000 && avgValue <= 3700);
  }

  _buttonIndexForDP(dpId) {
    if (dpId >= 1 && dpId <= 6) {return dpId;}
    if (dpId >= 101 && dpId <= 106) {return dpId - 100;}
    return 1;
  }

  _normalizeFrame(frame, direction, meta, timestamp) {
    if (!frame && !meta) {return null;}
    const sourceFrame = frame || {};
    const payload = sourceFrame.payload ?? sourceFrame.Payload ?? sourceFrame.data ?? sourceFrame.Data ?? sourceFrame.raw ?? meta.payload;
    const clusterId = this._numberFromAny(sourceFrame.clusterId ?? sourceFrame.cluster ?? meta.clusterId);
    const commandId = this._numberFromAny(sourceFrame.commandId ?? sourceFrame.CommandID ?? sourceFrame.cmd ?? sourceFrame.command ?? meta.commandId);
    const endpoint = this._numberFromAny(sourceFrame.endpoint ?? sourceFrame.endpointId ?? meta.endpoint ?? meta.endpointId);
    const datapoints = this._extractDatapoints(sourceFrame, payload);
    const rawBuffer = Buffer.isBuffer(payload) ? payload : Buffer.isBuffer(sourceFrame.raw) ? sourceFrame.raw : null;

    return {
      timestamp,
      direction,
      source: meta.source || sourceFrame.source || 'zigbee_frame',
      endpoint: endpoint || undefined,
      clusterId: clusterId || undefined,
      commandId: commandId || undefined,
      sequence: sourceFrame.seqNum ?? sourceFrame.sequence ?? sourceFrame.transactionSequenceNumber ?? meta.sequence,
      rawLength: rawBuffer ? rawBuffer.length : sourceFrame.rawLength ?? undefined,
      rawPrefix: rawBuffer ? rawBuffer.toString('hex', 0, Math.min(rawBuffer.length, 12)) : sourceFrame.rawPrefix ?? undefined,
      datapoints
    };
  }

  _extractDatapoints(frame, payload) {
    const found = [];
    const pushDP = candidate => {
      if (!candidate) {return;}
      const dpId = Number(candidate.dpId ?? candidate.dp ?? candidate.id);
      if (!Number.isInteger(dpId) || dpId <= 0 || dpId > 255) {return;}
      const value = candidate.value ?? candidate.dpValue ?? candidate.data ?? candidate.rawValue;
      found.push({
        dpId,
        value,
        dpType: candidate.dpType ?? candidate.datatype ?? candidate.dataType ?? candidate.type ?? 'unknown'
      });
    };

    if (Array.isArray(frame.datapoints)) {frame.datapoints.forEach(pushDP);}
    if (Array.isArray(frame.dpValues)) {frame.dpValues.forEach(pushDP);}
    if (Array.isArray(frame.dps)) {frame.dps.forEach(pushDP);}
    if (frame.dpId !== undefined || frame.dp !== undefined) {pushDP(frame);}
    if (payload && typeof payload === 'object' && !Buffer.isBuffer(payload)) {
      if (Array.isArray(payload.datapoints)) {payload.datapoints.forEach(pushDP);}
      if (Array.isArray(payload.dpValues)) {payload.dpValues.forEach(pushDP);}
      if (Array.isArray(payload.dps)) {payload.dps.forEach(pushDP);}
      if (payload.dpId !== undefined || payload.dp !== undefined) {pushDP(payload);}
    }

    if (Buffer.isBuffer(payload)) {
      for (const offset of [0, 1, 2, 3, 4, 5, 6]) {
        const parsed = this._parseTuyaTLV(payload, offset);
        if (parsed.length) {
          parsed.forEach(pushDP);
          break;
        }
      }
    }

    const deduped = new Map();
    for (const dp of found) {
      const key = `${dp.dpId}:${dp.dpType}:${stableStringify(dp.value)}`;
      deduped.set(key, dp);
    }
    return [...deduped.values()].slice(0, 16);
  }

  _parseTuyaTLV(buffer, startOffset) {
    const datapoints = [];
    let offset = startOffset;
    while (offset + 4 <= buffer.length) {
      const dpId = buffer.readUInt8(offset);
      const dpType = buffer.readUInt8(offset + 1);
      const len = buffer.readUInt16BE(offset + 2);
      if (dpId === 0 || dpId > 255 || dpType > 5 || len <= 0 || len > 64 || offset + 4 + len > buffer.length) {
        return datapoints;
      }

      const data = buffer.slice(offset + 4, offset + 4 + len);
      datapoints.push({ dpId, dpType, value: this._decodeTuyaValue(dpType, data) });
      offset += 4 + len;
    }
    return datapoints;
  }

  _decodeTuyaValue(dpType, data) {
    if (!Buffer.isBuffer(data)) {return data;}
    if (dpType === 1) {return data[0] === 1;}
    if (dpType === 2 || dpType === 4) {
      if (data.length === 1) {return data.readUInt8(0);}
      if (data.length === 2) {return data.readUInt16BE(0);}
      if (data.length >= 4) {return data.readInt32BE(0);}
    }
    if (dpType === 3) {return data.toString('utf8');}
    if (dpType === 5 && data.length === 1) {return data.readUInt8(0);}
    return { kind: 'buffer', length: data.length, hexPrefix: data.toString('hex', 0, Math.min(data.length, 8)) };
  }

  _numberFromAny(value) {
    if (value === undefined || value === null) {return null;}
    if (typeof value === 'number' && Number.isFinite(value)) {return value;}
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^0x/i.test(trimmed)) {return parseInt(trimmed, 16);}
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
  }

  getDynamicDPMap(minConfidence = 60) {
    const dpMap = {};
    for (const [dpId, info] of this.discoveredDPs) {
      if (info.confidence >= minConfidence && info.inferredCapability) {
        dpMap[dpId] = {
          cap: info.inferredCapability,
          capability: info.inferredCapability,
          type: info.inferredType,
          divisor: info.divisor || 1,
          estimated: Boolean(info.estimated),
          button: info.button || undefined,
          pressMap: info.pressMap || undefined,
          confidence: info.confidence,
          autoDiscovered: true
        };
      }
    }
    return dpMap;
  }

  applyDiscoveredValue(dpId, rawValue) {
    const info = this.discoveredDPs.get(Number(dpId));
    if (!info || !info.inferredCapability || info.confidence < 60) {return null;}

    let value = rawValue;
    let estimated = Boolean(info.estimated);
    let pressType;
    let count = 1;

    switch (info.inferredType) {
    case 'presence_bool':
      value = rawValue === 1 || rawValue === true;
      break;
    case 'presence_enum':
      value = rawValue === 1 || rawValue === 2 || rawValue === true;
      break;
    case 'contact_bool':
    case 'onoff_bool':
      value = rawValue === 1 || rawValue === true;
      break;
    case 'button_event':
      pressType = this._pressTypeForValue(rawValue, info.pressMap);
      count = pressType === 'multi' ? Math.max(3, Number(rawValue) || 3) : pressType === 'double' ? 2 : 1;
      value = true;
      break;
    case 'battery_percent':
      value = clamp(Math.round(Number(rawValue)), 0, 100);
      break;
    case 'battery_half_percent':
      value = clamp(Math.round(Number(rawValue) / (info.divisor || 2)), 0, 100);
      break;
    case 'battery_voltage_estimated':
      value = this._estimateBatteryFromVoltage(Number(rawValue));
      estimated = true;
      break;
    case 'distance':
    case 'temperature':
    case 'humidity':
    case 'power':
    case 'voltage':
    case 'current':
    case 'energy':
      value = round(Number(rawValue) / (info.divisor || 1), info.inferredType === 'energy' ? 3 : 2);
      break;
    case 'lux_direct':
      value = clamp(Math.round(Number(rawValue)), 0, 200000);
      break;
    }

    if (typeof value === 'number' && (!Number.isFinite(value) || Number.isNaN(value))) {return null;}

    return {
      capability: info.inferredCapability,
      value,
      type: info.inferredType,
      confidence: info.confidence,
      estimated,
      button: info.button || undefined,
      pressType,
      count
    };
  }

  _pressTypeForValue(rawValue, pressMap) {
    const value = typeof rawValue === 'string' ? rawValue.toLowerCase() : Number(rawValue);
    if (pressMap && pressMap[value] !== undefined) {return pressMap[value];}
    if (value === 0 || value === 'single' || value === 'press' || value === 'click') {return 'single';}
    if (value === 1 || value === 'double') {return 'double';}
    if (value === 2 || value === 'hold' || value === 'long') {return 'long';}
    if (value === 3 || value === 'release') {return 'release';}
    return 'multi';
  }

  _estimateBatteryFromVoltage(rawVoltage) {
    if (!Number.isFinite(rawVoltage)) {return null;}
    let volts = rawVoltage;
    if (volts > 1000) {volts /= 1000;}
    else if (volts > 10) {volts /= 10;}

    const percent = ((volts - 2.2) / (3.2 - 2.2)) * 100;
    return clamp(Math.round(percent), 1, 100);
  }

  _updateProfileRecommendation() {
    const caps = new Set();
    const types = new Set();
    const reasons = [];
    let buttonCount = 0;

    for (const info of this.discoveredDPs.values()) {
      if (info.confidence < 55) {continue;}
      if (info.inferredCapability) {caps.add(info.inferredCapability);}
      if (info.inferredType) {types.add(info.inferredType);}
      if (info.inferredType === 'button_event') {buttonCount = Math.max(buttonCount, info.button || 1);}
    }

    for (const cap of this._getDeviceCapabilities()) {
      caps.add(cap);
      const match = /^button\.(\d+)$/.exec(cap);
      if (match) {buttonCount = Math.max(buttonCount, Number(match[1]));}
    }

    const hasZcl = type => this.zclObservations.has(type);
    const has = cap => caps.has(cap);
    let profileId = 'generic_tuya';
    let confidence = 45;

    if (buttonCount > 0 || types.has('button_event')) {
      const bounded = clamp(buttonCount || 1, 1, 6);
      profileId = `button_wireless_${bounded}`;
      confidence = 68 + Math.min(18, buttonCount * 4);
      reasons.push(`button_count:${bounded}`);
      if (has('measure_battery') || types.has('battery_percent') || types.has('battery_voltage_estimated')) {
        confidence += 6;
        reasons.push('battery_supported');
      }
    } else if ((has('alarm_motion') || has('alarm_presence')) && (has('measure_luminance') || has('measure_distance') || has('target_distance') || hasZcl('illuminance'))) {
      profileId = 'presence_sensor_radar';
      confidence = 82;
      reasons.push('presence_plus_lux_or_distance');
    } else if ((has('alarm_motion') || has('alarm_presence')) && (has('measure_temperature') || has('measure_humidity'))) {
      profileId = 'sensor_climate_presence';
      confidence = 76;
      reasons.push('presence_plus_climate');
    } else if (has('measure_temperature') && has('measure_humidity')) {
      profileId = 'climate_sensor';
      confidence = 72;
      reasons.push('temperature_humidity');
    } else if (has('alarm_contact')) {
      profileId = 'contact_sensor';
      confidence = 70;
      reasons.push('contact_alarm');
    } else if (has('onoff') && (has('measure_power') || has('meter_power'))) {
      profileId = 'power_plug';
      confidence = 74;
      reasons.push('switch_with_energy');
    } else if (has('onoff')) {
      profileId = 'switch';
      confidence = 66;
      reasons.push('onoff_control');
    }

    const recommendation = {
      profileId,
      label: PROFILE_LABELS[profileId] || PROFILE_LABELS.generic_tuya,
      confidence: clamp(confidence, 0, 99),
      reasons,
      observedCapabilities: [...caps].sort(),
      observedTypes: [...types].sort(),
      startedAt: new Date(this.learningStartTime).toISOString(),
      lastUpdated: new Date().toISOString(),
      learningWindowMs: this.learningDurationMs,
      elapsedMs: Date.now() - this.learningStartTime,
      action: 'recommendation_only'
    };

    this.profileRecommendation = recommendation;
    this._maybeApplyProfileLabel(recommendation);
    return recommendation;
  }

  _maybeApplyProfileLabel(recommendation) {
    if (!recommendation || recommendation.confidence < 92) {return;}
    if (process.env.TUYA_AUTO_RENAME_PROFILE === 'false') {return;}
    if (this._getStoreValue('dp_auto_profile_name_applied')) {return;}
    if (typeof this.device?.getName !== 'function' || typeof this.device?.setName !== 'function') {return;}

    const currentName = this.device.getName();
    if (!this._looksGenericDeviceName(currentName)) {return;}

    const nextName = recommendation.label;
    if (!nextName || currentName === nextName) {return;}

    Promise.resolve(this.device.setName(nextName))
      .then(() => this.device.setStoreValue?.('dp_auto_profile_name_applied', {
        from: currentName,
        to: nextName,
        profileId: recommendation.profileId,
        confidence: recommendation.confidence,
        at: Date.now()
      }).catch(() => {}))
      .catch(err => this.device?.log?.(`[DP-AUTO] Profile display rename skipped: ${err.message}`));
  }

  _looksGenericDeviceName(name) {
    if (!name || typeof name !== 'string') {return true;}
    const modelId = this._getModelId();
    const normalized = name.trim().toLowerCase();
    if (modelId && normalized === modelId.toLowerCase()) {return true;}
    return /^(tuya|zigbee|universal|generic|unknown|ts0|device|fallback)/i.test(normalized) ||
      /universal|generic|unknown|fallback|ts0601|ts004/i.test(normalized);
  }

  getProfileRecommendation() {
    return this.profileRecommendation || this._updateProfileRecommendation();
  }

  getLearningReport() {
    const now = Date.now();
    const dpSummary = {};
    for (const [dpId, info] of this.discoveredDPs) {
      const stats = this._buildStats(info);
      dpSummary[dpId] = {
        type: info.inferredType || 'unknown',
        capability: info.inferredCapability || null,
        confidence: info.confidence,
        sampleCount: info.samples.length,
        duplicates: info.duplicateCount,
        firstSeen: new Date(info.firstSeen).toISOString(),
        lastUpdate: new Date(info.lastUpdate).toISOString(),
        min: stats.min,
        max: stats.max,
        avg: stats.avg === null ? null : round(stats.avg, 3),
        uniqueCount: stats.uniqueCount,
        directions: info.directions,
        sources: info.sources,
        divisor: info.divisor || 1,
        estimated: Boolean(info.estimated),
        evidence: info.evidence,
        contradictions: info.contradictions
      };
    }

    const zcl = {};
    for (const [key, value] of this.zclObservations) {
      const numeric = value.samples.map(sample => sample.numeric).filter(isFiniteNumber);
      zcl[key] = {
        count: value.count,
        firstSeen: new Date(value.firstSeen).toISOString(),
        lastSeen: new Date(value.lastSeen).toISOString(),
        min: numeric.length ? Math.min(...numeric) : null,
        max: numeric.length ? Math.max(...numeric) : null,
        avg: numeric.length ? round(average(numeric), 3) : null
      };
    }

    return {
      startedAt: new Date(this.learningStartTime).toISOString(),
      elapsedMs: now - this.learningStartTime,
      remainingMs: Math.max(0, this.learningDurationMs - (now - this.learningStartTime)),
      learningWindowMs: this.learningDurationMs,
      learningPhase: now - this.learningStartTime < this.learningDurationMs,
      dpCount: this.discoveredDPs.size,
      frameCount: this.frameLog.length,
      dynamicDPMap: this.getDynamicDPMap(),
      profileRecommendation: this.getProfileRecommendation(),
      dps: dpSummary,
      zcl,
      frames: this._frameSummary()
    };
  }

  _frameSummary() {
    const summary = {
      rx: 0,
      tx: 0,
      clusters: {},
      commands: {},
      recent: this.frameLog.slice(-12)
    };

    for (const frame of this.frameLog) {
      summary[frame.direction] = (summary[frame.direction] || 0) + 1;
      if (frame.clusterId !== undefined) {
        const key = `0x${Number(frame.clusterId).toString(16)}`;
        summary.clusters[key] = (summary.clusters[key] || 0) + 1;
      }
      if (frame.commandId !== undefined) {
        const key = `0x${Number(frame.commandId).toString(16)}`;
        summary.commands[key] = (summary.commands[key] || 0) + 1;
      }
    }
    return summary;
  }

  _storeLearningReportThrottled(force) {
    const now = Date.now();
    if (!force && now - this._lastStoreAt < STORE_THROTTLE_MS) {return;}
    this._lastStoreAt = now;

    const report = this.getLearningReport();
    this.device?.setStoreValue?.('dp_auto_discovery_report', report).catch(() => {});
    this.device?.setStoreValue?.('dp_auto_discovery_map', report.dynamicDPMap).catch(() => {});
    this.device?.setStoreValue?.('dp_auto_profile_recommendation', report.profileRecommendation).catch(() => {});
  }

  async storeLearningReport() {
    this._storeLearningReportThrottled(true);
    return this.getLearningReport();
  }

  _updateLearningPhase(now = Date.now()) {
    this.learningPhase = now - this.learningStartTime < this.learningDurationMs;
  }

  _getDeviceCapabilities() {
    try {
      if (typeof this.device?.getCapabilities === 'function') {return this.device.getCapabilities() || [];}
    } catch (err) {
      // ignore SDK edge cases
    }
    return [];
  }

  _hasCapability(capability) {
    try {
      return typeof this.device?.hasCapability === 'function' && this.device.hasCapability(capability);
    } catch (err) {
      return false;
    }
  }

  _hasAnyCapability(pattern) {
    return this._getDeviceCapabilities().some(capability => pattern.test(capability));
  }

  _getSetting(key) {
    try {
      return this.device?.getSetting?.(key);
    } catch (err) {
      return null;
    }
  }

  _getStoreValue(key) {
    try {
      return this.device?.getStoreValue?.(key);
    } catch (err) {
      return null;
    }
  }

  _getModelId() {
    try {
      return this.device?.getData?.()?.modelId ||
        this.device?.node?.modelId ||
        this.device?.getSetting?.('zb_model_id') ||
        '';
    } catch (err) {
      return '';
    }
  }
}

module.exports = IntelligentDPAutoDiscovery;
