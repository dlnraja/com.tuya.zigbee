'use strict';

class DeviceProfileRegistry {
  constructor() {
    this._exact = {};
    this._mfr = {};
    this._pid = {};
    this._defaults = {};
  }

  register(p) {
    if (!p || !p.id) return;
    
    const mfrs = [].concat(p.manufacturerName || []);
    const pids = [].concat(p.productId || []);
    
    for (const m of mfrs) {
      for (const pid of pids) {
        this._exact[`${m}|${pid}`] = p;
      }
      if (!this._mfr[m]) this._mfr[m] = p;
    }
    
    for (const pid of pids) {
      if (!this._pid[pid]) this._pid[pid] = p;
    }
    
    if (p.isDefault && p.deviceType) {
      this._defaults[p.deviceType] = p;
    }
  }

  registerAll(arr) {
    if (Array.isArray(arr)) {
      arr.forEach(p => this.register(p));
    }
  }

  getProfile(mfr, pid, deviceType) {
    const m = (mfr || '').trim();
    const p = (pid || '').trim();
    return this._exact[`${m}|${p}`]
      || this._mfr[m]
      || this._pid[p]
      || this._defaults[deviceType]
      || null;
  }

  hasProfile(mfr, pid) {
    const m = (mfr || '').trim();
    const p = (pid || '').trim();
    return !!(this._exact[`${m}|${p}`] || this._mfr[m] || this._pid[p]);
  }

  buildDynamicProfile(device, zclNode) {
    if (!zclNode || !zclNode.endpoints) return null;
    const eps = Object.keys(zclNode.endpoints).map(Number).sort((a, b) => a - b);
    const profile = {
      id: 'dynamic_introspected',
      protocol: 'unknown',
      endpoints: eps,
      clusterMap: {},
      capabilities: []
    };

    let hasTuyaDP = false;
    let hasOnOff = false;
    let hasWindowCovering = false;
    let hasColorControl = false;
    let hasLevelControl = false;
    let hasIasZone = false;
    let hasThermostat = false;
    let hasElectricalMeasurement = false;

    for (const epNum of eps) {
      const ep = zclNode.endpoints[epNum];
      if (!ep || !ep.clusters) continue;
      const clusterNames = Object.keys(ep.clusters);
      profile.clusterMap[epNum] = clusterNames;

      for (const cn of clusterNames) {
        const cl = cn.toLowerCase();
        if (cl === 'tuya' || cl === '61184' || cn === 'manuSpecificTuya') hasTuyaDP = true;
        if (cl === 'onoff' || cl === 'genonoff' || cn === '6') hasOnOff = true;
        if (cl === 'windowcovering' || cl === 'closureswindowcovering' || cn === '258') hasWindowCovering = true;
        if (cl === 'colorcontrol' || cl === 'lightingcolorctrl' || cn === '768') hasColorControl = true;
        if (cl === 'levelcontrol' || cl === 'genlevelctrl' || cn === '8') hasLevelControl = true;
        if (cl === 'iaszone' || cl === 'ssiaczone' || cn === '1280') hasIasZone = true;
        if (cl === 'thermostat' || cl === 'hvacthermostat' || cn === '513') hasThermostat = true;
        if (cl === 'electricalmeasurement' || cl === 'haelectricalmeasurement' || cn === '2820') hasElectricalMeasurement = true;
      }
    }

    // Determine protocol
    if (hasTuyaDP) profile.protocol = 'tuya_dp';
    else profile.protocol = 'zcl';

    // Determine device type
    if (hasWindowCovering) profile.deviceType = 'cover';
    else if (hasThermostat) profile.deviceType = 'thermostat';
    else if (hasColorControl) profile.deviceType = 'light';
    else if (hasLevelControl && !hasOnOff) profile.deviceType = 'dimmer';
    else if (hasIasZone) profile.deviceType = 'sensor';
    else if (hasElectricalMeasurement && hasOnOff) profile.deviceType = 'plug';
    else if (hasOnOff) {
      profile.deviceType = eps.length > 1 ? 'switch_multi' : 'switch';
    }
    else profile.deviceType = 'unknown';

    // Build capabilities from detected clusters
    if (hasOnOff) {
      if (eps.length > 1) {
        for (let i = 0; i < eps.length; i++) {
          const epClusters = profile.clusterMap[eps[i]] || [];
          const hasOnOffOnEp = epClusters.some(c => {
            const cl = c.toLowerCase();
            return cl === 'onoff' || cl === 'genonoff' || c === '6';
          });
          if (hasOnOffOnEp) {
            profile.capabilities.push(i === 0 ? 'onoff' : `onoff.${eps[i]}`);
          }
        }
      } else {
        profile.capabilities.push('onoff');
      }
    }
    if (hasWindowCovering) profile.capabilities.push('windowcoverings_set');
    if (hasLevelControl) profile.capabilities.push('dim');
    if (hasColorControl) profile.capabilities.push('light_hue', 'light_saturation');
    if (hasIasZone) profile.capabilities.push('alarm_generic');
    if (hasThermostat) profile.capabilities.push('target_temperature', 'measure_temperature');
    if (hasElectricalMeasurement) profile.capabilities.push('measure_power', 'meter_power');

    return profile;
  }

  getStats() {
    return {
      exact: Object.keys(this._exact).length,
      mfr: Object.keys(this._mfr).length,
      pid: Object.keys(this._pid).length,
      defaults: Object.keys(this._defaults).length
    };
  }
}

// Singleton instance
const registry = new DeviceProfileRegistry();

module.exports = { DeviceProfileRegistry, registry };
