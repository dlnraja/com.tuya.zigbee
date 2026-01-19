'use strict';
const { SWITCH_DPS, LIGHT_DPS, COVER_DPS, CLIMATE_DPS, FAN_DPS, SENSOR_DPS } = require('./LocalTuyaInspired');

class LocalTuyaEntityHandler {
  constructor(device) { this.device = device; this.entityType = null; }

  detectType(dps) {
    const ids = Object.keys(dps).map(Number);
    if (ids.includes(20) && ids.includes(21)) return 'light';
    if (ids.includes(7) && (ids.includes(1) || ids.includes(2))) return 'cover';
    if (ids.includes(2) && ids.includes(3) && ids.includes(4)) return 'climate';
    if (ids.includes(8) || ids.includes(9)) return 'fan';
    if (ids.includes(17) || ids.includes(18)) return 'switch_energy';
    if (ids.some(i => [101, 102, 103, 104].includes(i))) return 'sensor';
    return 'switch';
  }

  getMapping(type) {
    const maps = {
      switch: SWITCH_DPS, switch_energy: SWITCH_DPS,
      light: LIGHT_DPS, cover: COVER_DPS,
      climate: CLIMATE_DPS, fan: FAN_DPS, sensor: SENSOR_DPS
    };
    return maps[type] || SWITCH_DPS;
  }

  convertDP(dpId, value, type) {
    const mapping = this.getMapping(type);
    const dpConfig = mapping[dpId];
    if (!dpConfig) return null;
    if (dpConfig.div) return value / dpConfig.div;
    if (dpConfig.range) {
      const [min, max] = dpConfig.range;
      return (value - min) / (max - min);
    }
    return value;
  }
}

module.exports = LocalTuyaEntityHandler;
