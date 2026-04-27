'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const { ZigBeeDevice } = require('homey-zigbeedriver');
const CapabilityManagerMixin = require('../../lib/mixins/CapabilityManagerMixin');
const ManufacturerNameHelper = require('../../lib/helpers/ManufacturerNameHelper');

let ZigbeeProtocolPatchManager;
try { ZigbeeProtocolPatchManager = require('../../lib/zigbee/ZigbeeProtocolPatchManager'); }
catch (e) { ZigbeeProtocolPatchManager = null; }

/**
 * GENERIC DIY / UNIVERSAL ZCL DEVICE - v7.4.5
 * Superior architecturally-hardened engine for DIY and Unmapped devices.
 * Supports: ESP32, PTVO, Sonoff, Legrand, Bosch, Schneider, Niko.
 */

const CLUSTER_MAP = {
  0x0006: { cap: 'onoff', attr: 'onOff', multi: true, type: 'switch' },
  0x0008: { cap: 'dim', attr: 'currentLevel', div: 254, type: 'dimmer' },
  0x0402: { cap: 'measure_temperature', attr: 'measuredValue', div: 100, type: 'sensor' },
  0x0405: { cap: 'measure_humidity', attr: 'measuredValue', div: 100, type: 'sensor' },
  0x0400: { cap: 'measure_luminance', attr: 'measuredValue', type: 'sensor' },
  0x0406: { cap: 'alarm_motion', attr: 'occupancy', type: 'motion' },
  0x0001: { cap: 'measure_battery', attr: 'batteryPercentageRemaining', div: 2, type: 'battery' },
  0x0500: { cap: 'alarm_contact', attr: 'zoneStatus', type: 'contact' },
  0x0403: { cap: 'measure_pressure', attr: 'measuredValue', div: 10, type: 'sensor' },
  0x000C: { cap: 'measure_generic', attr: 'presentValue', type: 'analog' },
  0x0201: { cap: 'target_temperature', attr: 'occupiedHeatingSetpoint', div: 100, type: 'thermostat' },
  0x0702: { cap: 'meter_power', attr: 'currentSummationDelivered', type: 'metering' },
  0x0B04: { cap: 'measure_power', attr: 'activePower', div: 10, type: 'electrical' }
};

const BUTTON_PRESS = { SINGLE: 1, DOUBLE: 2, LONG: 3 };

class GenericDIYDevice extends ZigBeeDevice {

  constructor(...args) {
    super(...args);
    // Apply CapabilityManagerMixin for safe setters and bizarre value blocking
    Object.assign(this, CapabilityManagerMixin);
    this._capUpdateTracker = {};
  }

  get mainsPowered() {
    // If router, it's mains powered. Also check model/mfr fallbacks.
    if (this.zclNode?.role === 'router' || this.zclNode?.role === 'coordinator') return true;
    const model = ManufacturerNameHelper.getModelId(this);
    return model && model.includes('ROUTER');
  }

  async onNodeInit({ zclNode }) {
    this.log('[DIY] ');
    this.log('[DIY] UNIVERSAL GENERIC ENGINE v7.4.5' );
    this.log(`[DIY] Identity: ${this.getName()}`);
    this.log('[DIY] ');

    this.zclNode = zclNode;
    this._caps = [];
    this._lastValues = {};

    // v7.4.5: Ensure metadata is clean and settings are cached
    await ManufacturerNameHelper.ensureManufacturerSettings(this);

    // v5.7.3: Apply ecosystem-specific bug patches
    if (ZigbeeProtocolPatchManager) {
      try {
        this._patchMgr = new ZigbeeProtocolPatchManager(this);
        await this._patchMgr.applyPatches();
      } catch (e) { this.log('[DIY] Patch error:', e.message); }
    }

    // Dynamic Cluster Scanning
    for (const [epId, ep] of Object.entries(zclNode.endpoints || {})) {
      if (epId === '242') continue; // Skip Green Power
      for (const cId of Object.keys(ep.clusters || {})) {
        const clusterId = parseInt(cId);
        const map = CLUSTER_MAP[clusterId];
        if (map) await this._addCap(parseInt(epId), clusterId, map, ep.clusters[cId]);
      }
    }

    // Setup listeners for all discovered capabilities
    for (const c of this._caps) {
      await this._setupListener(c);
    }

    // Setup button detection (Scenes/Multistate)
    await this._setupButtonDetection(zclNode);

    // Register flow card actions (Fixing broken syntax from legacy version)
    this._registerFlowActions();

    this.log(`[DIY]  Discovery complete: ${this._caps.length} capabilities found`);
  }

  // 
  // FLOW CARD TRIGGERS
  // 

  _triggerFlow(flowId, tokens = {}) {
    const card = this._getFlowCard(flowId);
    if (card) {
      card.trigger(this, tokens, {}).catch(e => this.error(`[DIY] Flow ${flowId}: ${e.message}`));
      this.log(`[DIY]  Flow: ${flowId}`, tokens);
    }
  }

  /**
   * Hook for CapabilityManagerMixin to trigger driver-specific flows
   */
  async _triggerCustomFlowsIfNeeded(capability, value, previousValue) {
    if (capability === 'measure_temperature') this._triggerFlow('generic_diy_temperature_changed', { temperature: value });
    if (capability === 'measure_humidity') this._triggerFlow('generic_diy_humidity_changed', { humidity: value });
    if (capability === 'alarm_motion') this._triggerFlow(value ? 'generic_diy_motion_detected' : 'generic_diy_motion_cleared');
    if (capability === 'alarm_contact') this._triggerFlow(value ? 'generic_diy_contact_opened' : 'generic_diy_contact_closed');
    if (capability === 'measure_luminance') this._triggerFlow('generic_diy_illuminance_changed', { lux: value });
    if (capability === 'measure_battery') {
        if (value < 20 && (!this._lastValues.batteryLowTriggered || value < this._lastValues.batteryLowTriggered - 5)) {
            this._triggerFlow('generic_diy_battery_low', { battery: value });
            this._lastValues.batteryLowTriggered = value;
        }
    }
    if (capability === 'measure_pressure') this._triggerFlow('generic_diy_pressure_changed', { pressure: value });
  }

  _triggerGangFlows(capability, value) {
    if (capability.startsWith('onoff')) {
        const parts = capability.split('.');
        const endpoint = parts.length > 1 ? parseInt(parts[1] ) : 1;
        this._triggerFlow(value ? 'generic_diy_switch_turned_on' : 'generic_diy_switch_turned_off', { endpoint });
    }
  }

  _triggerButton(button, pressType) {
    const flowId = pressType === BUTTON_PRESS.DOUBLE ? 'generic_diy_button_double_pressed' : pressType === BUTTON_PRESS.LONG ? 'generic_diy_button_long_pressed' : 'generic_diy_button_pressed';
    this._triggerFlow(flowId, { button });
  }

  _triggerAnalog(endpoint, value) {
    this._triggerFlow('generic_diy_analog_changed', { endpoint, value });
  }

  // 
  // FLOW CARD ACTIONS
  // 

  _registerFlowActions() {
    // Identify
    this._getFlowCard('generic_diy_identify')?.registerRunListener(async () => {
      const ep = this.zclNode?.endpoints?.[1];
      if (ep?.clusters?.identify) {
        await ep.clusters.identify.identify({ identifyTime: 5 });
      }
      return true;
    });

    // Turn ON endpoint
    this._getFlowCard('generic_diy_turn_on_endpoint')?.registerRunListener(async ({ endpoint } ) => {
      const ep = this.zclNode?.endpoints?.[endpoint];
      if (ep?.clusters?.onOff) await ep.clusters.onOff.setOn();
      return true;
    });

    // Turn OFF endpoint
    this._getFlowCard('generic_diy_turn_off_endpoint')?.registerRunListener(async ({ endpoint } ) => {
      const ep = this.zclNode?.endpoints?.[endpoint];
      if (ep?.clusters?.onOff) await ep.clusters.onOff.setOff();
      return true;
    });

    // Set Dim Level
    this._getFlowCard('generic_diy_set_dim')?.registerRunListener(async ({ level } ) => {
      const ep = this.zclNode?.endpoints?.[1];
      if (ep?.clusters?.levelControl) {
        await ep.clusters.levelControl.moveToLevel({ level: safeMultiply(Math.round(level, 254)), transitionTime: 0 });
      }
      return true;
    });
  }

  // 
  // BUTTON DETECTION
  // 

  async _setupButtonDetection(zclNode) {
    for (const [epId, ep] of Object.entries(zclNode.endpoints || {})) {
      if (ep.clusters?.scenes) {
        ep.clusters.scenes.on('command', (cmd) => {
          this.log(`[DIY] Button scene command EP${epId}:`, cmd);
          this._triggerButton(parseInt(epId), BUTTON_PRESS.SINGLE);
      });
      }
      if (ep.clusters?.multiStateInput || ep.clusters?.genMultistateInput) {
        const cluster = ep.clusters.multiStateInput || ep.clusters.genMultistateInput;
        cluster.on('attr.presentValue', (v) => {
          this.log(`[DIY] Button multistate EP${epId}:`, v);
          const pressType = v === 2 ? BUTTON_PRESS.DOUBLE : v === 3 ? BUTTON_PRESS.LONG : BUTTON_PRESS.SINGLE;
          this._triggerButton(parseInt(epId), pressType);
      });
      }
      if (ep.clusters?.onOff) {
        ep.clusters.onOff.on('commandOn', () => this._triggerButton(parseInt(epId), BUTTON_PRESS.SINGLE));
        ep.clusters.onOff.on('commandOff', () => this._triggerButton(parseInt(epId), BUTTON_PRESS.SINGLE));
        ep.clusters.onOff.on('commandToggle', () => this._triggerButton(parseInt(epId), BUTTON_PRESS.SINGLE));
      }
    }
  }

  async _addCap(epId, clusterId, map, cluster) {
    const capName = (map.multi && epId > 1) ? `${map.cap}.${epId}` : map.cap;
    if (this.hasCapability(capName)) return;

    try {
      // Use _safeSetCapability with noDynamicAddition: false to ensure capability is added
      await this._safeSetCapability(capName, null, { noDynamicAddition: false });
      this._caps.push({ epId, clusterId, cap: capName, map, cluster });
      this.log(`[DIY] Discovered: ${capName} (0x${clusterId.toString(16)})`);
    } catch (e) {
      this.error(`[DIY] Discovery failed for ${capName}: ${e.message}`);
    }
  }

  async _setupListener({ epId, clusterId, cap, map, cluster }) {
    try {
      // OnOff cluster
      if (clusterId === 0x0006) {
        this.registerCapabilityListener(cap, async (v) => {
          v ? await cluster.setOn() : await cluster.setOff();
        });
        cluster.on('attr.onOff', (v) => this._safeSetCapability(cap, v).catch(() => { }));
      }
      // Level cluster
      else if (clusterId === 0x0008) {
        this.registerCapabilityListener(cap, async (v) => {
          await cluster.moveToLevel({ level: safeMultiply(Math.round(v, 254)), transitionTime: 0 });
        });
        cluster.on('attr.currentLevel', (v) => this._safeSetCapability(cap, v / 254).catch(() => { }));
      }
      // Temperature
      else if (clusterId === 0x0402) {
        cluster.on(`attr.${map.attr}`, (v) => this._safeSetCapability(cap, v / 100).catch(() => { }));
      }
      // Humidity
      else if (clusterId === 0x0405) {
        cluster.on(`attr.${map.attr}`, (v) => this._safeSetCapability(cap, v / 100).catch(() => { }));
      }
      // Illuminance
      else if (clusterId === 0x0400) {
        cluster.on(`attr.${map.attr}`, (v) => this._safeSetCapability(cap, v).catch(() => { }));
      }
      // Motion
      else if (clusterId === 0x0406) {
        cluster.on(`attr.${map.attr}`, (v) => this._safeSetCapability(cap, v > 0).catch(() => { }));
      }
      // Battery
      else if (clusterId === 0x0001) {
        cluster.on(`attr.${map.attr}`, (v) => this._safeSetCapability(cap, v / 2).catch(() => { }));
      }
      // Contact
      else if (clusterId === 0x0500) {
        cluster.on(`attr.${map.attr}`, (v) => this._safeSetCapability(cap, (v & 1) > 0).catch(() => { }));
      }
      // Pressure
      else if (clusterId === 0x0403) {
        cluster.on(`attr.${map.attr}`, (v) => this._safeSetCapability(cap, v / 10).catch(() => { }));
      }
      // Analog
      else if (clusterId === 0x000C) {
        cluster.on(`attr.${map.attr}`, (v) => {
          this._safeSetCapability(cap, v).catch(() => {});
          this._triggerAnalog(epId, v);
        });
      }
      // Thermostat
      else if (clusterId === 0x0201) {
        this.registerCapabilityListener(cap, async (v) => {
          await cluster.write({ occupiedHeatingSetpoint: Math.round(v * 100) });
        });
        cluster.on('attr.occupiedHeatingSetpoint', (v) => this._safeSetCapability(cap, v / 100).catch(() => { }));
        cluster.on('attr.localTemperature', (v) => {
          if (v !== -32768) this._safeSetCapability('measure_temperature', v / 100).catch(() => {});
        });
      }
      // Other measurement clusters
      else if (map.attr) {
        cluster.on(`attr.${map.attr}`, (v) => {
          const val = map.div ? safeDivide(v, map.div) : v;
          this._safeSetCapability(cap, val).catch(() => {});
        });
      }
    } catch (e) {
      this.error(`[DIY] Listener setup failed: ${e.message}`);
    }
  }

  async checkCondition(conditionId, args = {}) {
    switch (conditionId) {
    case 'generic_diy_is_on':
      return this.getCapabilityValue('onoff') === true;
    case 'generic_diy_motion_active':
      return this.getCapabilityValue('alarm_motion') === true;
    case 'generic_diy_contact_open':
      return this.getCapabilityValue('alarm_contact') === true;
    case 'generic_diy_temperature_above':
      return (this.getCapabilityValue('measure_temperature') || 0) > args.temperature;
    case 'generic_diy_humidity_above':
      return (this.getCapabilityValue('measure_humidity') || 0) > args.humidity;
    case 'generic_diy_battery_below':
      return (this.getCapabilityValue('measure_battery') || 100) < args.battery;
    default:
      return false;
    }
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = GenericDIYDevice;
