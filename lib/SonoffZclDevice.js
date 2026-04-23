'use strict';
const { safeDivide, safeParse } = require('./utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * SONOFF ZCL DEVICE BASE CLASS
 * Supported clusters: 0x0001, 0x0006, 0x0400, 0x0402, 0x0405, 0x0500, 0x0702, 0x0B04
 */
class SonoffZclDevice extends ZigBeeDevice {

  _getFlowCard(id, type = 'trigger') {
    try {
      if (!id || !this.homey || !this.homey.flow) return null;

      const typeMap = { 'trigger': 'getTriggerCard', 'condition': 'getConditionCard', 'action': 'getActionCard' };
      const method = typeMap[type];
      if (!method) return null;

      const driverId = this.driver?.id || this.manifest?.id;
      const idVariants = [id];
      if (driverId) {
        idVariants.push(`${driverId}_${id}`);
        idVariants.push(`${driverId}:${id}`);
      }
      if (!id.startsWith('tuya_')) idVariants.push(`tuya_${id}`);

      const flowMethod = this.homey.flow[method];
      if (typeof flowMethod === 'function') {
        for (const variantId of idVariants) {
          try {
            const card = flowMethod.call(this.homey.flow, variantId);
            if (card) return card;
          } catch (e) {}
        }
      }
    } catch (err) {}
    return null;
  }

  async onSonoffInit() {
    this.log('[SONOFF] Initializing SONOFF ZCL device...');
    this._sonoffManufacturer = this.getSetting('zb_manufacturer_name') || 'Unknown';
    this._sonoffModel = this.getSetting('zb_product_id') || 'Unknown';

    await this._initBatteryCapability();
    await this._initOnOffCapability();
    await this._initTemperatureCapability();
    await this._initHumidityCapability();
    await this._initIlluminanceCapability();
    await this._initIasZoneCapability();
    await this._initEnergyCapabilities();
    await this.registerStandardReportListeners();

    this.log('[SONOFF] Initialization complete');
  }

  async _initBatteryCapability() {
    if (!this.hasCapability('measure_battery')) return;
    try {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        getOpts: { getOnStart: true, pollInterval: 3600000 },
        report: 'batteryPercentageRemaining',
        reportParser: value => {
          const percentage = Math.round(safeParse(value) / 2);
          return Math.min(100, Math.max(0, percentage));
        }
      });
    } catch (err) {}
  }

  async _initOnOffCapability() {
    if (!this.hasCapability('onoff')) return;
    try {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        get: 'onOff',
        getOpts: { getOnStart: true, pollInterval: 60000 },
        set: value => (value ? 'setOn' : 'setOff'),
        setParser: () => ({}),
        report: 'onOff',
        reportParser: value => value === 1 || value === true
      });
    } catch (err) {}
  }

  async _initTemperatureCapability() {
    if (!this.hasCapability('measure_temperature')) return;
    try {
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
        get: 'measuredValue',
        getOpts: { getOnStart: true, pollInterval: 300000 },
        report: 'measuredValue',
        reportParser: value => Math.round(safeDivide(value, 100) * 10) / 10
      });
    } catch (err) {}
  }

  async _initHumidityCapability() {
    if (!this.hasCapability('measure_humidity')) return;
    try {
      this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT || 1029, {
        get: 'measuredValue',
        getOpts: { getOnStart: true, pollInterval: 300000 },
        report: 'measuredValue',
        reportParser: value => Math.round(safeDivide(value, 100))
      });
    } catch (err) {}
  }

  async _initIlluminanceCapability() {
    if (!this.hasCapability('measure_luminance')) return;
    try {
      this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT, {
        get: 'measuredValue',
        getOpts: { getOnStart: true, pollInterval: 300000 },
        report: 'measuredValue',
        reportParser: value => (value === 0 || value === 0xFFFF) ? 0 : Math.round(Math.pow(10, safeDivide(value - 1, 10000)))
      });
    } catch (err) {}
  }

  async _initIasZoneCapability() {
    const caps = ['alarm_motion', 'alarm_contact', 'alarm_water', 'alarm_smoke', 'alarm_tamper'];
    if (!caps.some(c => this.hasCapability(c))) return;
    try {
      const iasZoneCluster = this.zclNode.endpoints[1]?.clusters?.iasZone;
      if (iasZoneCluster) {
        iasZoneCluster.on('attr.zoneStatus', status => this.onIasZoneReport(status));
        iasZoneCluster.on('zoneStatusChangeNotification', payload => this.onIasZoneReport(payload.zoneStatus));
      }
    } catch (err) {}
  }

  onIasZoneReport(status) {
    const alarm1 = (status & 1) > 0;
    const tamper = (status & 4) > 0;
    const batteryLow = (status & 8) > 0;
    
    if (this.hasCapability('alarm_motion')) this.setCapabilityValue('alarm_motion', alarm1).catch(() => {});
    if (this.hasCapability('alarm_contact')) this.setCapabilityValue('alarm_contact', alarm1).catch(() => {});
    if (this.hasCapability('alarm_water')) this.setCapabilityValue('alarm_water', alarm1).catch(() => {});
    if (this.hasCapability('alarm_tamper')) this.setCapabilityValue('alarm_tamper', tamper).catch(() => {});
    if (this.hasCapability('alarm_battery')) this.setCapabilityValue('alarm_battery', batteryLow).catch(() => {});
  }

  async _initEnergyCapabilities() {
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
        get: 'activePower',
        getOpts: { getOnStart: true, pollInterval: 60000 },
        report: 'activePower',
        reportParser: value => Math.round(safeDivide(value, 10) * 10) / 10
      });
    }
    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', CLUSTER.METERING, {
        get: 'currentSummationDelivered',
        getOpts: { getOnStart: true, pollInterval: 300000 },
        report: 'currentSummationDelivered',
        reportParser: value => Math.round(safeDivide(value, 1000) * 100) / 100
      });
    }
  }

  async registerStandardReportListeners() {
    const ep = this.zclNode.endpoints[1];
    if (!ep) return;
    if (ep.clusters?.powerConfiguration) ep.clusters.powerConfiguration.on('attr.batteryPercentageRemaining', v => this.onBatteryReport(v));
    if (ep.clusters?.onOff) ep.clusters.onOff.on('attr.onOff', v => this.onOnOffReport(v));
  }

  onBatteryReport(value) {
    const percentage = Math.round(safeParse(value) / 2);
    this.setCapabilityValue('measure_battery', Math.min(100, Math.max(0, percentage))).catch(() => {});
  }

  onOnOffReport(value) {
    this.setCapabilityValue('onoff', value === 1 || value === true).catch(() => {});
  }

  onButtonPress(action) {
    let pressType = 'single';
    if (action === 2 || action === 'double') pressType = 'double';
    else if (action === 3 || action === 'hold' || action === 'long') pressType = 'long';
    this.emit('sonoff_button_pressed', pressType);
    const triggerCard = this._getFlowCard('sonoff_button_pressed', 'trigger');
    if (triggerCard) triggerCard.trigger(this, { press_type: pressType }, {}).catch(() => {});
  }
}

module.exports = SonoffZclDevice;
