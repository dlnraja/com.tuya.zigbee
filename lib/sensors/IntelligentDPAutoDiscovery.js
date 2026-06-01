'use strict';

/**
 * IntelligentDPAutoDiscovery - v9.0.0
 * Automatically detects and learns DP mappings, ranges, and inversions for unknown devices
 * with advanced heuristic logic.
 */
class IntelligentDPAutoDiscovery {
  constructor(device) {
    this.device = device;
    this.discoveredDPs = new Map();  // dpId -> { type, samples, confidence, capability }
    this.learningPhase = true;
    this.learningStartTime = Date.now();
    this.learningDurationMs = 120000;  // 120 seconds learning phase
    this.minSamplesForConfidence = 3;
  }

  /**
   * Analyze incoming DP and infer its type, ranges, and inversions based on value patterns
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
        lastUpdate: now,
        baseline: null, // to detect inversions
        inversionDetected: false
      });
    }

    const dpInfo = this.discoveredDPs.get(dpId);
    dpInfo.samples.push({ value, time: now });
    dpInfo.lastValue = value;
    dpInfo.lastUpdate = now;

    // Keep only last 50 samples to build a better statistical baseline
    if (dpInfo.samples.length > 50) {
      dpInfo.samples.shift();
    }

    // Infer type from value patterns
    this._inferDPType(dpId, dpInfo);

    return dpInfo;
  }

  /**
   * Infer DP type based on value patterns, ranges, and heuristics
   */
  _inferDPType(dpId, dpInfo) {
    const samples = dpInfo.samples.map(s => s.value);
    if (samples.length < 2) return;

    const numericSamples = samples.filter(v => typeof v === 'number');

    // ─── BOOLEAN/PRESENCE/CONTACT (Detect Inversions) ──────────────────────────────────
    const uniqueValues = [...new Set(numericSamples)];
    const isBooleanPattern = uniqueValues.length <= 3 && uniqueValues.every(v => v >= 0 && v <= 3);

    if (isBooleanPattern) {
      dpInfo.inferredType = 'boolean_heuristic';
      
      // Determine baseline (most frequent state, assuming resting state is longer)
      const freq = {};
      numericSamples.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
      let maxFreq = 0;
      let baseline = numericSamples[0];
      for (const [v, f] of Object.entries(freq)) {
        if (f > maxFreq) { maxFreq = f; baseline = Number(v); }
      }
      
      dpInfo.baseline = baseline;
      // If baseline is 1, it means 1=Vacant/Closed, so we must invert logic where 0=Occupied
      dpInfo.inversionDetected = (baseline === 1 || baseline === 2);
      
      // Assign capabilities heuristically based on device class or DP ID
      if (this.device.getClass() === 'sensor' && (dpId === 1 || dpId === 101)) {
         dpInfo.inferredCapability = 'alarm_contact'; // Can be bed sensor or door
      } else {
         dpInfo.inferredCapability = 'alarm_motion';
      }
      dpInfo.confidence = 90;
      return;
    }

    // ─── CONTINUOUS VALUES (Pressure, Temp, Lux, Battery, etc) ─────────────────────────
    if (numericSamples.length < 2) return;
    
    const avgValue = numericSamples.reduce((a, b) => a + b, 0) / numericSamples.length;
    const maxValue = Math.max(...numericSamples);
    const minValue = Math.min(...numericSamples);
    const range = maxValue - minValue;

    // PATTERN: ATMOSPHERIC PRESSURE (usually ~900-1100 hPa/mbar)
    const isPressurePattern = (avgValue >= 800 && avgValue <= 1200 && range < 100);
    if (isPressurePattern) {
      dpInfo.inferredType = 'pressure';
      dpInfo.inferredCapability = 'measure_pressure';
      dpInfo.divisor = 1;
      dpInfo.confidence = 95;
      return;
    }

    // PATTERN: ILLUMINANCE/LUX
    const isLuxPattern = (dpId === 12 || dpId === 102 || dpId === 103 || dpId === 106 || dpId === 9) && avgValue >= 0 && avgValue <= 100000;
    if (isLuxPattern && dpInfo.inferredCapability !== 'alarm_motion' && avgValue > 100) {
      dpInfo.inferredType = 'lux_direct';
      dpInfo.inferredCapability = 'measure_luminance';
      dpInfo.confidence = 80;
      return;
    }

    // PATTERN: BATTERY
    const isBatteryPattern = (dpId === 4 || dpId === 15 || dpId === 121 || dpId === 10) && avgValue >= 0 && avgValue <= 100 && range <= 20;
    if (isBatteryPattern) {
      dpInfo.inferredType = 'battery';
      dpInfo.inferredCapability = 'measure_battery';
      dpInfo.confidence = 85;
      return;
    }

    // PATTERN: TEMPERATURE
    const isTempPattern = avgValue >= 100 && avgValue <= 800 && range < 100;
    if (isTempPattern && !dpInfo.inferredCapability && dpId !== 4) {
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
          autoDiscovered: true,
          inversionDetected: info.inversionDetected
        };
      }
    }
    return dpMap;
  }

  /**
   * Apply discovered value to capability, executing intelligent inversions and scalings
   */
  applyDiscoveredValue(dpId, rawValue) {
    const info = this.discoveredDPs.get(dpId);
    if (!info || !info.inferredCapability || info.confidence < 60) return null;

    let value = rawValue;
    switch (info.inferredType) {
      case 'boolean_heuristic': 
        // Intelligent inversion: if baseline is 1, then 0 is active state
        if (info.inversionDetected) {
           value = (rawValue === 0 || rawValue === false);
        } else {
           value = (rawValue === 1 || rawValue === true);
        }
        break;
      case 'pressure': value = Math.round(rawValue); break;
      case 'lux_direct': value = Math.max(0, Math.min(100000, rawValue)); break;
      case 'battery': value = Math.max(0, Math.min(100, rawValue)); break;
      case 'temperature': value = Math.round((rawValue / (info.divisor || 10)) * 10) / 10; break;
    }

    return {
      capability: info.inferredCapability,
      value: value,
      type: info.inferredType,
      confidence: info.confidence,
      inversion: info.inversionDetected
    };
  }
}

module.exports = IntelligentDPAutoDiscovery;
