'use strict';
const { safeDivide, safeMultiply, safeParse } = require('./utils/MathUtils.js');
const { CLUSTERS } = require('./constants/ZigbeeConstants.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * HYBRID DRIVER SYSTEM - Revolutionary Auto-Adaptive Drivers
 * One driver adapts to ALL device variants using cluster detection and energy strategies.
 */

class HybridDriverSystem {

  static DEVICE_PATTERNS = {
    LIGHT: { clusters: [6, 8], optional: [0x0300], class: 'light', capabilities: ['onoff', 'dim'], energy: 'AC' },
    LIGHT_COLOR: { clusters: [6, 8, 0x0300], class: 'light', capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'], energy: 'AC' },
    SWITCH: { clusters: [6], noCluster: [8], class: 'socket', capabilities: ['onoff'], energy: 'AC', variants: { '1gang': { endpoints: 1 }, '2gang': { endpoints: 2 }, '3gang': { endpoints: 3 }, '4gang': { endpoints: 4 } } },
    PLUG: { clusters: [6, 0x0702, 0x0B04], class: 'socket', capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'], energy: 'AC' },
    BUTTON: { clusters: [6], isController: true, class: 'button', capabilities: ['measure_battery'], energy: 'BATTERY', flowOnly: true },
    MOTION: { clusters: [0x0406], class: 'sensor', capabilities: ['alarm_motion', 'measure_battery'], energy: 'BATTERY' },
    CONTACT: { clusters: [0x0500], class: 'sensor', capabilities: ['alarm_contact', 'measure_battery'], energy: 'BATTERY' },
    CLIMATE: { clusters: [0x0402, 0x0405], class: 'sensor', capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'], energy: 'BATTERY' },
    TUYA_DP: { clusters: [CLUSTERS.TUYA_EF00], class: 'sensor', capabilities: [], energy: 'MIXED', requiresDpMap: true },
    DIMMER: { clusters: [6, 8], noCluster: [0x0300], class: 'light', capabilities: ['onoff', 'dim'], energy: 'AC' },
    CURTAIN: { clusters: [0x0102], class: 'curtain', capabilities: ['windowcoverings_state', 'dim'], energy: 'MIXED' },
    THERMOSTAT: { clusters: [0x0201], class: 'thermostat', capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode'], energy: 'BATTERY' },
    LOCK: { clusters: [0x0101], class: 'lock', capabilities: ['locked', 'measure_battery'], energy: 'BATTERY' },
    SIREN: { clusters: [0x0502], class: 'other', capabilities: ['onoff', 'alarm_generic'], energy: 'MIXED' }
  };

  static ENERGY_STRATEGIES = {
    AC: { polling: { default: 30000, power: 5000, state: 10000 }, reporting: { min: 1, max: 300, change: 1 }, batteryMonitoring: false },
    BATTERY: { polling: { default: 3600000, motion: 14400000, contact: 14400000, climate: 7200000, button: 21600000 }, reporting: { min: 300, max: 3600, change: 5 }, batteryMonitoring: true, deepSleep: true },
    MIXED: { polling: { default: 60000 }, reporting: { min: 10, max: 600, change: 2 }, batteryMonitoring: true, adaptivePolling: true },
    HYBRID: { polling: { default: 120000 }, reporting: { min: 30, max: 900, change: 3 }, batteryMonitoring: true, solarMonitoring: true, adaptivePolling: true }
  };

  static detectDeviceType(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return null;
    const clusters = Object.keys(ep1.clusters || {}).map(c => typeof c === 'number' ? c : this.getClusterNumber(c));
    const epCount = Object.keys(zclNode.endpoints).length;

    for (const [type, pattern] of Object.entries(this.DEVICE_PATTERNS)) {
      if (this.matchesPattern(clusters, epCount, pattern)) return { type, pattern, epCount, clusters };
    }
    return null;
  }

  static matchesPattern(clusters, epCount, pattern) {
    if (pattern.clusters && !pattern.clusters.every(c => clusters.includes(c))) return false;
    if (pattern.noCluster && pattern.noCluster.some(c => clusters.includes(c))) return false;
    return true;
  }

  static getClusterNumber(name) {
    const map = { basic: 0, powerConfiguration: 1, identify: 3, groups: 4, scenes: 5, onOff: 6, levelControl: 8, doorLock: 0x0101, windowCovering: 0x0102, thermostat: 0x0201, colorControl: 0x0300, temperatureMeasurement: 0x0402, relativeHumidity: 0x0405, occupancySensing: 0x0406, iasZone: 0x0500, iasWd: 0x0502, metering: 0x0702, electricalMeasurement: 0x0B04, tuyaSpecific: CLUSTERS.TUYA_EF00 };
    return map[name] || name;
  }

  static detectEnergySource(zclNode, deviceType) {
    const ep1 = zclNode.endpoints[1];
    if (ep1?.clusters?.powerConfiguration) return 'BATTERY';
    if (ep1?.clusters?.metering || ep1?.clusters?.electricalMeasurement) return 'AC';
    return deviceType?.pattern?.energy || 'AC';
  }

  static buildCapabilities(deviceType, energySource, tuyaDpMap = null) {
    let capabilities = deviceType?.pattern?.capabilities ? [...deviceType.pattern.capabilities] : [];
    if ((energySource === 'BATTERY' || energySource === 'MIXED') && !capabilities.includes('measure_battery')) capabilities.push('measure_battery');
    if (deviceType?.pattern?.requiresDpMap && tuyaDpMap) {
      const dpCaps = Object.values(tuyaDpMap).map(m => m.capability);
      capabilities = [...new Set([...capabilities, ...dpCaps])];
    }
    return capabilities;
  }

  static getEnergyStrategy(energySource, deviceType) {
    const strategy = this.ENERGY_STRATEGIES[energySource] || this.ENERGY_STRATEGIES.AC;
    if (energySource === 'BATTERY' && deviceType) {
      const type = deviceType.type.toLowerCase();
      if (strategy.polling[type]) strategy.polling.default = strategy.polling[type];
    }
    return strategy;
  }

  static createHybridDevice(baseClass = ZigBeeDevice) {
    return class HybridDevice extends baseClass {
      async onNodeInit({ zclNode }) {
        if (this._hybridSystemInitialized) return;
        this._hybridSystemInitialized = true;
        
        if (this._skipHybridTypeDetection) {
          this.deviceType = this._forcedDeviceType ? { type: this._forcedDeviceType } : null;
        } else {
          this.deviceType = HybridDriverSystem.detectDeviceType(zclNode);
        }
        
        this.energySource = HybridDriverSystem.detectEnergySource(zclNode, this.deviceType);
        this.energyStrategy = HybridDriverSystem.getEnergyStrategy(this.energySource, this.deviceType);
        
        const tuyaDpMap = this.getTuyaDpMap?.() || null;
        const targetCaps = HybridDriverSystem.buildCapabilities(this.deviceType, this.energySource, tuyaDpMap);
        
        await this.syncCapabilities(targetCaps);
        await this.setupDeviceByType();
        await this.startEnergyAwareMonitoring();
      }

      async syncCapabilities(targetCaps) {
        const current = this.getCapabilities();
        const forbidden = this._forbiddenCapabilities || [];
        const filtered = targetCaps.filter(c => !forbidden.includes(c));

        for (const cap of filtered) {
          if (!current.includes(cap)) await this.addCapability(cap).catch(e => this.error(e));
        }
        for (const cap of current) {
          if (!filtered.includes(cap) || forbidden.includes(cap)) await this.removeCapability(cap).catch(e => this.error(e));
        }
      }

      async setupDeviceByType() {
        if (!this.deviceType) return;
        switch (this.deviceType.type) {
          case 'LIGHT': case 'LIGHT_COLOR': await this.setupLight(); break;
          case 'SWITCH': await this.setupSwitch(); break;
          case 'PLUG': await this.setupPlug(); break;
          case 'MOTION': await this.setupMotionSensor(); break;
          case 'CONTACT': await this.setupContactSensor(); break;
          case 'CLIMATE': await this.setupClimateSensor(); break;
          case 'TUYA_DP': await this.setupTuyaDp(); break;
          default: await this.setupBasic();
        }
      }

      async startEnergyAwareMonitoring() {
        const interval = this.energyStrategy.polling.default;
        this.monitoringInterval = this.homey.setInterval(async () => { await this.refreshDevice(); }, interval);
      }

      async refreshDevice() { /* Override */ }

      async setupLight() {
        this.registerCapabilityListener('onoff', async (v) => { await this.zclNode.endpoints[1].clusters.onOff[v ? 'setOn' : 'setOff'](); });
        if (this.hasCapability('dim')) {
          this.registerCapabilityListener('dim', async (v) => { await this.zclNode.endpoints[1].clusters.levelControl.moveToLevel({ level: Math.round(safeMultiply(v, 254)) }); });
        }
      }

      async setupSwitch() {
        for (const ep of Object.keys(this.zclNode.endpoints)) {
          const epNum = parseInt(ep);
          if (epNum > 0) {
            const cap = epNum === 1 ? 'onoff' : `onoff.${epNum}`;
            if (this.hasCapability(cap)) {
              this.registerCapabilityListener(cap, async (v) => { await this.zclNode.endpoints[epNum].clusters.onOff[v ? 'setOn' : 'setOff'](); });
            }
          }
        }
      }

      async setupPlug() { await this.setupSwitch(); }

      async setupMotionSensor() {
        const ep1 = this.zclNode?.endpoints?.[1];
        ep1?.clusters?.occupancySensing?.on('attr.occupancy', async (v) => { await this.setCapabilityValue('alarm_motion', !!v?.occupied).catch(() => {}); });
      }

      async setupContactSensor() {
        const ep1 = this.zclNode?.endpoints?.[1];
        ep1?.clusters?.iasZone?.on('attr.zoneStatus', async (v) => { await this.setCapabilityValue('alarm_contact', !!v?.alarm1).catch(() => {}); });
      }

      async setupClimateSensor() {
        const ep1 = this.zclNode?.endpoints?.[1];
        ep1?.clusters?.temperatureMeasurement?.on('attr.measuredValue', async (v) => { if (v != null) await this.setCapabilityValue('measure_temperature', safeDivide(v, 100)).catch(() => {}); });
        ep1?.clusters?.relativeHumidity?.on('attr.measuredValue', async (v) => { if (v != null) await this.setCapabilityValue('measure_humidity', safeDivide(v, 100)).catch(() => {}); });
      }

      async setupTuyaDp() {
        this.zclNode?.endpoints?.[1]?.clusters?.tuya?.on('datapoint', async (d) => { await this.onTuyaData(d); });
      }

      async setupBasic() { /* Basic setup */ }
      async onTuyaData(data) { /* Override */ }
      async onDeleted() { if (this.monitoringInterval) this.homey.clearInterval(this.monitoringInterval); }
    };
  }
}

module.exports = HybridDriverSystem;
