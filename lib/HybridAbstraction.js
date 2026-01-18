'use strict';

/**
 * HybridAbstraction v5.5.664 - ZCL + Tuya DP unified layer
 */

class CapabilitiesResolver {
  constructor(device) { this.device = device; }

  resolve(clusters, dpMappings) {
    const caps = new Set();
    // ZCL clusters -> capabilities
    if (clusters.onOff) caps.add('onoff');
    if (clusters.levelControl) caps.add('dim');
    if (clusters.colorControl) caps.add('light_hue');
    if (clusters.temperatureMeasurement) caps.add('measure_temperature');
    if (clusters.relativeHumidity) caps.add('measure_humidity');
    if (clusters.iasZone) caps.add('alarm_contact');
    if (clusters.powerConfiguration) caps.add('measure_battery');
    // Tuya DP -> capabilities
    for (const [dp, map] of Object.entries(dpMappings || {})) {
      if (map.capability) caps.add(map.capability);
    }
    return [...caps];
  }
}

class ClusterMapper {
  constructor(device) { this.device = device; }

  mapToCapability(cluster, attr, value) {
    const map = {
      'onOff.onOff': { cap: 'onoff', transform: v => !!v },
      'levelControl.currentLevel': { cap: 'dim', transform: v => v / 254 },
      'temperatureMeasurement.measuredValue': { cap: 'measure_temperature', transform: v => v / 100 },
      'relativeHumidity.measuredValue': { cap: 'measure_humidity', transform: v => v / 100 },
      'powerConfiguration.batteryPercentageRemaining': { cap: 'measure_battery', transform: v => v / 2 }
    };
    const key = `${cluster}.${attr}`;
    const m = map[key];
    return m ? { capability: m.cap, value: m.transform(value) } : null;
  }
}

class DpInterpreter {
  constructor(device, dpMappings) {
    this.device = device;
    this.dpMappings = dpMappings || {};
  }

  interpret(dpId, value) {
    const map = this.dpMappings[dpId];
    if (!map || !map.capability) return null;
    let v = value;
    if (map.transform) v = map.transform(value);
    else if (map.divisor) v = value / map.divisor;
    return { capability: map.capability, value: v };
  }
}

module.exports = { CapabilitiesResolver, ClusterMapper, DpInterpreter };
