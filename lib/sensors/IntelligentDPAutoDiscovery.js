'use strict';

/**
 * IntelligentDPAutoDiscovery - v8.0.0
 * Automatically detects and learns DP mappings for unknown devices
 */
class IntelligentDPAutoDiscovery {
  constructor(device) {
    this.device = device;
    this.discoveredDPs = new Map();  // dpId -> { type, samples, confidence, capability }
    this.learningPhase = true;
    this.learningStartTime = Date.now();
    this.learningDurationMs = 60000;  // 60 seconds learning phase
    this.minSamplesForConfidence = 3;
  }

  /**
   * Analyze incoming DP and infer its type based on value patterns
   */
  analyzeDP(dpId, value) {
    const now = Date.now();

    // Get or create DP entry
    if (!this.discoveredDPs.has(dpId)) {
      this.discoveredDPs.set(dpId, {
        samples: [],
        inferredType: null,
        inferredCapability: null,
        confidence: 0,
        lastValue: null,
        lastUpdate: now
      });
    }

    const dpInfo = this.discoveredDPs.get(dpId);
    dpInfo.samples.push({ value, time: now });
    dpInfo.lastValue = value;
    dpInfo.lastUpdate = now;

    // Keep only last 20 samples
    if (dpInfo.samples.length > 20) {
      dpInfo.samples.shift();
    }

    // Infer type from value patterns
    this._inferDPType(dpId, dpInfo);

    return dpInfo;
  }

  /**
   * Infer DP type based on value patterns
   */
  _inferDPType(dpId, dpInfo) {
    const samples = dpInfo.samples.map(s => s.value);
    if (samples.length < 2) return;

    const numericSamples = samples.filter(v => typeof v === 'number');

    // PATTERN 1: PRESENCE/MOTION
    const uniqueValues = [...new Set(numericSamples)];
    const isPresencePattern =
      uniqueValues.length <= 3 &&
      uniqueValues.every(v => v >= 0 && v <= 3) &&
      (dpId === 1 || dpId === 105 || dpId === 112 || dpId === 104 || dpId === 101);

    if (isPresencePattern) {
      dpInfo.inferredType = uniqueValues.length === 2 ? 'presence_bool' : 'presence_enum';
      dpInfo.inferredCapability = 'alarm_motion';
      dpInfo.confidence = 90;
      return;
    }

    // PATTERN 2: DISTANCE
    const avgValue = numericSamples.reduce((a, b) => a + b, 0) / numericSamples.length;
    const maxValue = Math.max(...numericSamples);
    const minValue = Math.min(...numericSamples);
    const range = maxValue - minValue;

    const isDistancePattern =
      (dpId === 9 || dpId === 109 || dpId === 119 || dpId === 19) &&
      avgValue >= 0 && avgValue <= 1000 &&
      range < 500;

    if (isDistancePattern) {
      dpInfo.inferredType = 'distance';
      dpInfo.inferredCapability = 'measure_luminance.distance';
      dpInfo.divisor = 100;
      dpInfo.confidence = 85;
      return;
    }

    // PATTERN 3: ILLUMINANCE/LUX
    const isLuxPattern =
      (dpId === 12 || dpId === 102 || dpId === 103 || dpId === 106 || dpId === 9) &&
      avgValue >= 0 && avgValue <= 10000;

    if (isLuxPattern && dpInfo.inferredCapability !== 'alarm_motion') {
      dpInfo.inferredType = 'lux_direct';
      dpInfo.inferredCapability = 'measure_luminance';
      dpInfo.confidence = 80;
      return;
    }

    // PATTERN 4: BATTERY
    const isBatteryPattern =
      (dpId === 4 || dpId === 15 || dpId === 121 || dpId === 10) &&
      avgValue >= 0 && avgValue <= 100 &&
      range < 20;

    if (isBatteryPattern) {
      dpInfo.inferredType = 'battery';
      dpInfo.inferredCapability = 'measure_battery';
      dpInfo.confidence = 85;
      return;
    }

    // PATTERN 5: TEMPERATURE
    const isTempPattern =
      (dpId === 3 || dpId === 111 || dpId === 18) &&
      avgValue >= 100 && avgValue <= 500 &&
      range < 50;

    if (isTempPattern && !dpInfo.inferredCapability) {
      dpInfo.inferredType = 'temperature';
      dpInfo.inferredCapability = 'measure_temperature';
      dpInfo.divisor = 10;
      dpInfo.confidence = 75;
      return;
    }

    // Unknown pattern
    if (!dpInfo.inferredType) {
      dpInfo.inferredType = 'unknown';
      dpInfo.confidence = 0;
    }
  }

  /**
   * Get dynamic DP mapping based on discovered patterns
   */
  getDynamicDPMap() {
    const dpMap = {};
    for (const [dpId, info] of this.discoveredDPs) {
      if (info.confidence >= 60 && info.inferredCapability) {
        dpMap[dpId] = {
          cap: info.inferredCapability,
          type: info.inferredType,
          divisor: info.divisor || 1,
          autoDiscovered: true
        };
      }
    }
    return dpMap;
  }

  /**
   * Apply discovered value to capability
   */
  applyDiscoveredValue(dpId, rawValue) {
    const info = this.discoveredDPs.get(dpId);
    if (!info || !info.inferredCapability || info.confidence < 60) return null;

    let value = rawValue;
    switch (info.inferredType) {
    case 'presence_bool': value = rawValue === 1 || rawValue === true; break;
    case 'presence_enum': value = rawValue === 1 || rawValue === 2; break;
    case 'distance': value = Math.round((rawValue / (info.divisor || 100)) * 100) / 100; break;
    case 'lux_direct': value = Math.max(0, Math.min(10000, rawValue)); break;
    case 'battery': value = Math.max(0, Math.min(100, rawValue)); break;
    case 'temperature': value = Math.round((rawValue / (info.divisor || 10)) * 10) / 10; break;
    }

    return {
      capability: info.inferredCapability,
      value: value,
      type: info.inferredType,
      confidence: info.confidence
    };
  }
}

module.exports = IntelligentDPAutoDiscovery;
