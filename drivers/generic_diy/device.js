'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * GENERIC DIY ZIGBEE DEVICE - v5.7.2
 * Universal driver for ESP32-C6/H2, PTVO, CC253x, custom ZCL
 * With comprehensive flow card support
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
  0x000C: { cap: 'measure_generic', attr: 'presentValue', type: 'analog' }
};

// Button press types
const BUTTON_PRESS = { SINGLE: 1, DOUBLE: 2, LONG: 3 };

class GenericDIYDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[DIY] ═══════════════════════════════════════');
    this.log('[DIY] GENERIC DIY ZIGBEE v5.7.2');
    this.log('[DIY] ESP32 / PTVO / CC253x / Custom ZCL');
    this.log('[DIY] With comprehensive flow cards');
    this.log('[DIY] ═══════════════════════════════════════');

    this.zclNode = zclNode;
    this._caps = [];
    this._lastValues = {};

    // Scan endpoints
    for (const [epId, ep] of Object.entries(zclNode.endpoints || {})) {
      if (epId === '242') continue;
      for (const cId of Object.keys(ep.clusters || {})) {
        const clusterId = parseInt(cId);
        const map = CLUSTER_MAP[clusterId];
        if (map) await this._addCap(parseInt(epId), clusterId, map, ep.clusters[cId]);
      }
    }

    // Setup listeners
    for (const c of this._caps) {
      await this._setupListener(c);
    }

    // Setup button detection for scenes/multistate clusters
    await this._setupButtonDetection(zclNode);

    // Register flow card actions
    this._registerFlowActions();

    this.log(`[DIY] ✅ Done: ${this._caps.length} capabilities`);
  }

  // ═══════════════════════════════════════════════════════════
  // FLOW CARD TRIGGERS
  // ═══════════════════════════════════════════════════════════

  _triggerFlow(flowId, tokens = {}) {
    const card = this.homey.flow.getDeviceTriggerCard(flowId);
    if (card) {
      card.trigger(this, tokens, {}).catch(e => this.error(`[DIY] Flow ${flowId}: ${e.message}`));
      this.log(`[DIY] 🔔 Flow: ${flowId}`, tokens);
    }
  }

  _triggerTemperatureChanged(value) {
    this._triggerFlow('generic_diy_temperature_changed', { temperature: value });
  }

  _triggerHumidityChanged(value) {
    this._triggerFlow('generic_diy_humidity_changed', { humidity: value });
  }

  _triggerMotion(detected) {
    this._triggerFlow(detected ? 'generic_diy_motion_detected' : 'generic_diy_motion_cleared');
  }

  _triggerContact(open) {
    this._triggerFlow(open ? 'generic_diy_contact_opened' : 'generic_diy_contact_closed');
  }

  _triggerSwitch(endpoint, on) {
    this._triggerFlow(on ? 'generic_diy_switch_turned_on' : 'generic_diy_switch_turned_off', { endpoint });
  }

  _triggerButton(button, pressType) {
    const flowId = pressType === BUTTON_PRESS.DOUBLE ? 'generic_diy_button_double_pressed' :
                   pressType === BUTTON_PRESS.LONG ? 'generic_diy_button_long_pressed' :
                   'generic_diy_button_pressed';
    this._triggerFlow(flowId, { button });
  }

  _triggerIlluminance(lux) {
    this._triggerFlow('generic_diy_illuminance_changed', { lux });
  }

  _triggerBatteryLow(battery) {
    if (battery < 20 && (!this._lastValues.batteryLowTriggered || battery < this._lastValues.batteryLowTriggered - 5)) {
      this._triggerFlow('generic_diy_battery_low', { battery });
      this._lastValues.batteryLowTriggered = battery;
    }
  }

  _triggerPressure(pressure) {
    this._triggerFlow('generic_diy_pressure_changed', { pressure });
  }

  _triggerAnalog(endpoint, value) {
    this._triggerFlow('generic_diy_analog_changed', { endpoint, value });
  }

  // ═══════════════════════════════════════════════════════════
  // FLOW CARD ACTIONS
  // ═══════════════════════════════════════════════════════════

  _registerFlowActions() {
    // Identify action
    this.homey.flow.getActionCard('generic_diy_identify')?.registerRunListener(async () => {
      const ep = this.zclNode?.endpoints?.[1];
      if (ep?.clusters?.identify) {
        await ep.clusters.identify.identify({ identifyTime: 5 });
      }
      return true;
    });

    // Turn on/off endpoint actions
    this.homey.flow.getActionCard('generic_diy_turn_on_endpoint')?.registerRunListener(async ({ endpoint }) => {
      const ep = this.zclNode?.endpoints?.[endpoint];
      if (ep?.clusters?.onOff) await ep.clusters.onOff.setOn();
      return true;
    });

    this.homey.flow.getActionCard('generic_diy_turn_off_endpoint')?.registerRunListener(async ({ endpoint }) => {
      const ep = this.zclNode?.endpoints?.[endpoint];
      if (ep?.clusters?.onOff) await ep.clusters.onOff.setOff();
      return true;
    });

    // Set dim level
    this.homey.flow.getActionCard('generic_diy_set_dim')?.registerRunListener(async ({ level }) => {
      const ep = this.zclNode?.endpoints?.[1];
      if (ep?.clusters?.levelControl) {
        await ep.clusters.levelControl.moveToLevel({ level: Math.round(level * 254), transitionTime: 0 });
      }
      return true;
    });
  }

  // ═══════════════════════════════════════════════════════════
  // BUTTON DETECTION (Scenes / Multistate)
  // ═══════════════════════════════════════════════════════════

  async _setupButtonDetection(zclNode) {
    for (const [epId, ep] of Object.entries(zclNode.endpoints || {})) {
      // Scenes cluster for button commands
      if (ep.clusters?.scenes) {
        ep.clusters.scenes.on('command', (cmd) => {
          this.log(`[DIY] Button scene command EP${epId}:`, cmd);
          this._triggerButton(parseInt(epId), BUTTON_PRESS.SINGLE);
        });
      }

      // MultistateInput for PTVO buttons
      if (ep.clusters?.multiStateInput || ep.clusters?.genMultistateInput) {
        const cluster = ep.clusters.multiStateInput || ep.clusters.genMultistateInput;
        cluster.on('attr.presentValue', (v) => {
          this.log(`[DIY] Button multistate EP${epId}:`, v);
          const pressType = v === 2 ? BUTTON_PRESS.DOUBLE : v === 3 ? BUTTON_PRESS.LONG : BUTTON_PRESS.SINGLE;
          this._triggerButton(parseInt(epId), pressType);
        });
      }

      // OnOff commands (for scene switches)
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
      await this.addCapability(capName);
      this._caps.push({ epId, clusterId, cap: capName, map, cluster });
      this.log(`[DIY] ✅ ${capName} (cluster 0x${clusterId.toString(16)})`);
    } catch (e) {
      this.error(`[DIY] ❌ ${capName}: ${e.message}`);
    }
  }

  async _setupListener({ epId, clusterId, cap, map, cluster }) {
    try {
      // OnOff cluster
      if (clusterId === 0x0006) {
        this.registerCapabilityListener(cap, async (v) => {
          v ? await cluster.setOn() : await cluster.setOff();
        });
        cluster.on('attr.onOff', (v) => {
          this.setCapabilityValue(cap, v).catch(() => {});
          this._triggerSwitch(epId, v);
        });
      }
      // Level cluster
      else if (clusterId === 0x0008) {
        this.registerCapabilityListener(cap, async (v) => {
          await cluster.moveToLevel({ level: Math.round(v * 254), transitionTime: 0 });
        });
        cluster.on('attr.currentLevel', (v) => this.setCapabilityValue(cap, v / 254).catch(() => {}));
      }
      // Temperature
      else if (clusterId === 0x0402) {
        cluster.on(`attr.${map.attr}`, (v) => {
          const val = v / 100;
          this.setCapabilityValue(cap, val).catch(() => {});
          this._triggerTemperatureChanged(val);
        });
      }
      // Humidity
      else if (clusterId === 0x0405) {
        cluster.on(`attr.${map.attr}`, (v) => {
          const val = v / 100;
          this.setCapabilityValue(cap, val).catch(() => {});
          this._triggerHumidityChanged(val);
        });
      }
      // Illuminance
      else if (clusterId === 0x0400) {
        cluster.on(`attr.${map.attr}`, (v) => {
          this.setCapabilityValue(cap, v).catch(() => {});
          this._triggerIlluminance(v);
        });
      }
      // Motion/Occupancy
      else if (clusterId === 0x0406) {
        cluster.on(`attr.${map.attr}`, (v) => {
          const detected = v > 0;
          this.setCapabilityValue(cap, detected).catch(() => {});
          this._triggerMotion(detected);
        });
      }
      // Battery
      else if (clusterId === 0x0001) {
        cluster.on(`attr.${map.attr}`, (v) => {
          const val = v / 2;
          this.setCapabilityValue(cap, val).catch(() => {});
          this._triggerBatteryLow(val);
        });
      }
      // Contact/IAS Zone
      else if (clusterId === 0x0500) {
        cluster.on(`attr.${map.attr}`, (v) => {
          const open = (v & 1) > 0;
          this.setCapabilityValue(cap, open).catch(() => {});
          this._triggerContact(open);
        });
      }
      // Pressure
      else if (clusterId === 0x0403) {
        cluster.on(`attr.${map.attr}`, (v) => {
          const val = v / 10;
          this.setCapabilityValue(cap, val).catch(() => {});
          this._triggerPressure(val);
        });
      }
      // Analog input
      else if (clusterId === 0x000C) {
        cluster.on(`attr.${map.attr}`, (v) => {
          this.setCapabilityValue(cap, v).catch(() => {});
          this._triggerAnalog(epId, v);
        });
      }
      // Other measurement clusters
      else if (map.attr) {
        cluster.on(`attr.${map.attr}`, (v) => {
          const val = map.div ? v / map.div : v;
          this.setCapabilityValue(cap, val).catch(() => {});
        });
      }
    } catch (e) {
      this.error(`[DIY] Listener error: ${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CONDITION CHECKS
  // ═══════════════════════════════════════════════════════════

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
}

module.exports = GenericDIYDevice;
