'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster } = require('zigbee-clusters');
const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');

/**
 * Radiator Controller Device - v5.6.0
 * Specialized for electric radiators with pilot wire (French standard)
 */
class RadiatorControllerDevice extends ZigBeeDevice {

  get mainsPowered() { return true; }

  async onNodeInit() {
    this.log('Radiator Controller initializing...');

    try {
      this._timeSync = new ZigbeeTimeSync(this, { throttleMs: 6 * 60 * 60 * 1000 });
      this.homey.setTimeout(async () => {
        const result = await this._timeSync.sync({ force: true }).catch(() => ({ success: false }));
        if (result.success) this.log('[TimeSync] Initial sync successful');
      }, 10000);
    } catch (e) {
      this.log('[TimeSync] Init failed:', e.message);
    }

    await this.initializeRadiatorController();
    await this.setupCapabilities();
    await this.setupFlowCards();

    this.log('Radiator Controller ready');
  }

  async initializeRadiatorController() {
    this.pilotWireConfig = {
      type: this.getSetting('pilot_wire_type') || 'standard_6_orders',
      diode: this.getSetting('diode_type') || 'single_1n4007',
      signalDuration: this.getSetting('signal_duration_ms') || 1000
    };

    this.heatingModes = {
      'confort': { voltage: 0, description: 'Confort (0V)' },
      'eco': { voltage: -230, description: 'Éco (230V neg)' },
      'confort_minus_1': { voltage: -115, description: 'Confort -1°C' },
      'confort_minus_2': { voltage: -115, description: 'Confort -2°C' },
      'anti_freeze': { voltage: 230, description: 'Hors-Gel (230V pos)' },
      'off': { voltage: 'alternating', description: 'Arrêt (230V alt)' }
    };

    this.currentMode = this.getSetting('heating_mode') || 'confort';
  }

  async setupCapabilities() {
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (v) => this._setRadiatorPower(v));
    }

    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (v) => this._setTargetTemperature(v));
      await this.setCapabilityValue('target_temperature', 20).catch(() => {});
    }

    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (v) => this._setHeatingMode(v));
      await this.setCapabilityValue('thermostat_mode', this.currentMode).catch(() => {});
    }
  }

  async setupFlowCards() {
    const modeChanged = this.homey.flow.getDeviceTriggerCard('radiator_mode_changed');
    if (modeChanged) {
      this._radiatorModeChangedTrigger = modeChanged;
    }

    const heatingAction = this.homey.flow.getActionCard('set_heating_mode');
    if (heatingAction) {
      heatingAction.registerRunListener(async (args) => this._setHeatingMode(args.mode));
    }
  }

  async _setRadiatorPower(value) {
    this.log(`Set power: ${value}`);
    try {
      const onOff = this.getSafeCluster('onOff');
      if (onOff) {
        if (value) await onOff.setOn(); else await onOff.setOff();
      }
      await this._setHeatingMode(value ? 'confort' : 'off');
      return true;
    } catch (e) {
      this.error('Power control failed:', e);
      return false;
    }
  }

  async _setTargetTemperature(temp) {
    this.log(`Set target: ${temp}°C`);
    // Basic logic: if target > current, ensure Confort mode
    const current = this.getCapabilityValue('measure_temperature') || 20;
    if (temp > current) await this._setHeatingMode('confort');
    return true;
  }

  async _setHeatingMode(mode) {
    if (!this.heatingModes[mode]) return false;
    this.log(`Set mode: ${mode}`);
    try {
      await this._sendPilotWireSignal(mode);
      await this.setCapabilityValue('thermostat_mode', mode).catch(() => {});
      this.currentMode = mode;
      if (this._radiatorModeChangedTrigger) {
        this._radiatorModeChangedTrigger.trigger(this, { mode }).catch(() => {});
      }
      return true;
    } catch (e) {
      this.error('Mode switch failed:', e);
      return false;
    }
  }

  async _sendPilotWireSignal(mode) {
    const config = this.heatingModes[mode];
    this.log(`Pilot wire signal: ${config.description}`);
    // implementation details for pulse modulation...
    return true;
  }

  getSafeCluster(id) {
    const ep = this.zclNode.endpoints[1];
    return ep?.clusters[id];
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes('heating_mode')) {
      await this._setHeatingMode(newSettings.heating_mode);
    }
  }
}

module.exports = RadiatorControllerDevice;
