'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const greenPower = require('../../lib/green_power');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            USB HUB DUAL - v5.5.57 DEDICATED DRIVER                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Device: _TZ3000_h1ipgkwn / TS0002                                           ║
 * ║  Type: Dual USB Switch & Zigbee Router (Repeater)                            ║
 * ║                                                                              ║
 * ║  Features:                                                                   ║
 * ║  - 2 USB ports controllable individually (endpoints 1 & 2)                   ║
 * ║  - Power monitoring (seMetering + haElectricalMeasurement)                   ║
 * ║  - Power-on behavior configurable                                            ║
 * ║  - Zigbee router function (mesh repeater)                                    ║
 * ║                                                                              ║
 * ║  Endpoints:                                                                  ║
 * ║  - EP1: USB Port 1 + Power metering (onOff, seMetering, haElectrical)        ║
 * ║  - EP2: USB Port 2 (onOff only)                                              ║
 * ║  - EP242: Green Power (not used)                                             ║
 * ║                                                                              ║
 * ║  Source: https://github.com/Koenkk/zigbee2mqtt/issues/23625                  ║
 * ║          https://slsys.io/ru/action/supported_devices?device=369             ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class USBHubDualDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║          USB HUB DUAL v5.5.57 - DEDICATED DRIVER             ║');
    this.log('║   _TZ3000_h1ipgkwn / TS0002 - Dual USB + Router              ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    this.zclNode = zclNode;

    // v5.5.57: Log Green Power endpoint analysis
    greenPower.logEndpointAnalysis(zclNode, this.log.bind(this));

    // Setup USB Port 1 (Endpoint 1)
    await this._setupUSBPort1(zclNode);

    // Setup USB Port 2 (Endpoint 2)
    await this._setupUSBPort2(zclNode);

    // Setup Power Monitoring (Endpoint 1)
    await this._setupPowerMonitoring(zclNode);

    // Register capability listeners
    await this._registerCapabilityListeners(zclNode);

    // Register flow cards
    await this._registerFlowCards();

    // Read initial states
    await this._readInitialStates(zclNode);

    this.log('[USB-HUB] ✅ Dual USB Switch & Router ready');
  }

  /**
   * Register flow cards for triggers, conditions, and actions
   */
  async _registerFlowCards() {
    // ═══════════════════════════════════════════════════════════════════
    // TRIGGER CARDS
    // ═══════════════════════════════════════════════════════════════════
    this._triggerUSB1On = this.homey.flow.getDeviceTriggerCard('usb_hub_dual_usb1_turned_on');
    this._triggerUSB1Off = this.homey.flow.getDeviceTriggerCard('usb_hub_dual_usb1_turned_off');
    this._triggerUSB2On = this.homey.flow.getDeviceTriggerCard('usb_hub_dual_usb2_turned_on');
    this._triggerUSB2Off = this.homey.flow.getDeviceTriggerCard('usb_hub_dual_usb2_turned_off');
    this._triggerPowerChanged = this.homey.flow.getDeviceTriggerCard('usb_hub_dual_power_changed');

    // ═══════════════════════════════════════════════════════════════════
    // CONDITION CARDS
    // ═══════════════════════════════════════════════════════════════════
    const conditionUSB1On = this.homey.flow.getConditionCard('usb_hub_dual_usb1_is_on');
    conditionUSB1On.registerRunListener(async () => {
      return this.getCapabilityValue('onoff') === true;
    });

    const conditionUSB2On = this.homey.flow.getConditionCard('usb_hub_dual_usb2_is_on');
    conditionUSB2On.registerRunListener(async () => {
      return this.getCapabilityValue('onoff.usb2') === true;
    });

    const conditionPowerAbove = this.homey.flow.getConditionCard('usb_hub_dual_power_above');
    conditionPowerAbove.registerRunListener(async (args) => {
      const power = this.getCapabilityValue('measure_power') || 0;
      return power > args.watts;
    });

    // ═══════════════════════════════════════════════════════════════════
    // ACTION CARDS
    // ═══════════════════════════════════════════════════════════════════
    const actionUSB1On = this.homey.flow.getActionCard('usb_hub_dual_turn_on_usb1');
    actionUSB1On.registerRunListener(async () => {
      await this.triggerCapabilityListener('onoff', true);
    });

    const actionUSB1Off = this.homey.flow.getActionCard('usb_hub_dual_turn_off_usb1');
    actionUSB1Off.registerRunListener(async () => {
      await this.triggerCapabilityListener('onoff', false);
    });

    const actionUSB1Toggle = this.homey.flow.getActionCard('usb_hub_dual_toggle_usb1');
    actionUSB1Toggle.registerRunListener(async () => {
      const current = this.getCapabilityValue('onoff');
      await this.triggerCapabilityListener('onoff', !current);
    });

    const actionUSB2On = this.homey.flow.getActionCard('usb_hub_dual_turn_on_usb2');
    actionUSB2On.registerRunListener(async () => {
      await this.triggerCapabilityListener('onoff.usb2', true);
    });

    const actionUSB2Off = this.homey.flow.getActionCard('usb_hub_dual_turn_off_usb2');
    actionUSB2Off.registerRunListener(async () => {
      await this.triggerCapabilityListener('onoff.usb2', false);
    });

    const actionUSB2Toggle = this.homey.flow.getActionCard('usb_hub_dual_toggle_usb2');
    actionUSB2Toggle.registerRunListener(async () => {
      const current = this.getCapabilityValue('onoff.usb2');
      await this.triggerCapabilityListener('onoff.usb2', !current);
    });

    const actionAllOn = this.homey.flow.getActionCard('usb_hub_dual_turn_on_all');
    actionAllOn.registerRunListener(async () => {
      await this.triggerCapabilityListener('onoff', true);
      await this.triggerCapabilityListener('onoff.usb2', true);
    });

    const actionAllOff = this.homey.flow.getActionCard('usb_hub_dual_turn_off_all');
    actionAllOff.registerRunListener(async () => {
      await this.triggerCapabilityListener('onoff', false);
      await this.triggerCapabilityListener('onoff.usb2', false);
    });

    this.log('[USB-HUB] Flow cards registered');
  }

  /**
   * Setup USB Port 1 (Endpoint 1) - includes power monitoring
   */
  async _setupUSBPort1(zclNode) {
    try {
      const ep1 = zclNode.endpoints?.[1];
      const onOffCluster = ep1?.clusters?.onOff;

      if (onOffCluster) {
        this.log('[USB-HUB] EP1 onOff cluster found');

        // Listen for state changes
        onOffCluster.on('attr.onOff', (value) => {
          this.log(`[USB-HUB] USB1 state: ${value}`);
          this.setCapabilityValue('onoff', value).catch(this.error);
          // Trigger flow cards
          if (value && this._triggerUSB1On) {
            this._triggerUSB1On.trigger(this).catch(() => { });
          } else if (!value && this._triggerUSB1Off) {
            this._triggerUSB1Off.trigger(this).catch(() => { });
          }
        });
      }
    } catch (err) {
      this.error('[USB-HUB] EP1 setup failed:', err.message);
    }
  }

  /**
   * Setup USB Port 2 (Endpoint 2)
   */
  async _setupUSBPort2(zclNode) {
    try {
      const ep2 = zclNode.endpoints?.[2];
      const onOffCluster = ep2?.clusters?.onOff;

      if (onOffCluster) {
        this.log('[USB-HUB] EP2 onOff cluster found');

        // Listen for state changes
        onOffCluster.on('attr.onOff', (value) => {
          this.log(`[USB-HUB] USB2 state: ${value}`);
          if (this.hasCapability('onoff.usb2')) {
            this.setCapabilityValue('onoff.usb2', value).catch(this.error);
            // Trigger flow cards
            if (value && this._triggerUSB2On) {
              this._triggerUSB2On.trigger(this).catch(() => { });
            } else if (!value && this._triggerUSB2Off) {
              this._triggerUSB2Off.trigger(this).catch(() => { });
            }
          }
        });
      }
    } catch (err) {
      this.error('[USB-HUB] EP2 setup failed:', err.message);
    }
  }

  /**
   * Setup Power Monitoring (seMetering + haElectricalMeasurement on EP1)
   */
  async _setupPowerMonitoring(zclNode) {
    try {
      const ep1 = zclNode.endpoints?.[1];

      // seMetering cluster (1794) - Energy measurement
      const meteringCluster = ep1?.clusters?.seMetering;
      if (meteringCluster) {
        this.log('[USB-HUB] seMetering cluster found');

        // Current summation (energy in kWh)
        meteringCluster.on('attr.currentSummationDelivered', (value) => {
          // Value is in Wh, convert to kWh
          const kWh = value / 1000;
          this.log(`[USB-HUB] Energy: ${kWh} kWh`);
          if (this.hasCapability('meter_power')) {
            this.setCapabilityValue('meter_power', kWh).catch(this.error);
          }
        });

        // Instantaneous demand (power in W)
        meteringCluster.on('attr.instantaneousDemand', (value) => {
          this.log(`[USB-HUB] Power (metering): ${value} W`);
          if (this.hasCapability('measure_power')) {
            this.setCapabilityValue('measure_power', value).catch(this.error);
          }
        });
      }

      // haElectricalMeasurement cluster (2820) - Voltage/Current/Power
      const electricalCluster = ep1?.clusters?.haElectricalMeasurement;
      if (electricalCluster) {
        this.log('[USB-HUB] haElectricalMeasurement cluster found');

        // Active power (W)
        electricalCluster.on('attr.activePower', (value) => {
          // Value is in 0.1W, convert to W
          const power = value / 10;
          this.log(`[USB-HUB] Power: ${power} W`);
          if (this.hasCapability('measure_power')) {
            this.setCapabilityValue('measure_power', power).catch(this.error);
            // Trigger power changed flow
            if (this._triggerPowerChanged) {
              this._triggerPowerChanged.trigger(this, { power }).catch(() => { });
            }
          }
        });

        // RMS Voltage (V)
        electricalCluster.on('attr.rmsVoltage', (value) => {
          // Value is in 0.1V, convert to V
          const voltage = value / 10;
          this.log(`[USB-HUB] Voltage: ${voltage} V`);
          if (this.hasCapability('measure_voltage')) {
            this.setCapabilityValue('measure_voltage', voltage).catch(this.error);
          }
        });

        // RMS Current (A)
        electricalCluster.on('attr.rmsCurrent', (value) => {
          // Value is in mA, convert to A
          const current = value / 1000;
          this.log(`[USB-HUB] Current: ${current} A`);
          if (this.hasCapability('measure_current')) {
            this.setCapabilityValue('measure_current', current).catch(this.error);
          }
        });
      }
    } catch (err) {
      this.error('[USB-HUB] Power monitoring setup failed:', err.message);
    }
  }

  /**
   * Register capability listeners for control
   */
  async _registerCapabilityListeners(zclNode) {
    // USB Port 1 control
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        this.log(`[USB-HUB] Setting USB1 to ${value}`);
        const ep1 = zclNode.endpoints?.[1];
        const onOffCluster = ep1?.clusters?.onOff;
        if (onOffCluster) {
          await onOffCluster[value ? 'setOn' : 'setOff']();
        }
      });
    }

    // USB Port 2 control
    if (this.hasCapability('onoff.usb2')) {
      this.registerCapabilityListener('onoff.usb2', async (value) => {
        this.log(`[USB-HUB] Setting USB2 to ${value}`);
        const ep2 = zclNode.endpoints?.[2];
        const onOffCluster = ep2?.clusters?.onOff;
        if (onOffCluster) {
          await onOffCluster[value ? 'setOn' : 'setOff']();
        }
      });
    }
  }

  /**
   * Read initial states from device
   */
  async _readInitialStates(zclNode) {
    // Delay to let device stabilize
    this.homey.setTimeout(async () => {
      try {
        // Read USB Port 1 state
        const ep1 = zclNode.endpoints?.[1];
        if (ep1?.clusters?.onOff) {
          const state1 = await ep1.clusters.onOff.readAttributes(['onOff']).catch(() => ({}));
          if (state1?.onOff !== undefined) {
            this.log(`[USB-HUB] Initial USB1: ${state1.onOff}`);
            await this.setCapabilityValue('onoff', state1.onOff).catch(() => { });
          }
        }

        // Read USB Port 2 state
        const ep2 = zclNode.endpoints?.[2];
        if (ep2?.clusters?.onOff) {
          const state2 = await ep2.clusters.onOff.readAttributes(['onOff']).catch(() => ({}));
          if (state2?.onOff !== undefined && this.hasCapability('onoff.usb2')) {
            this.log(`[USB-HUB] Initial USB2: ${state2.onOff}`);
            await this.setCapabilityValue('onoff.usb2', state2.onOff).catch(() => { });
          }
        }

        // Read power values
        const meteringCluster = ep1?.clusters?.seMetering;
        if (meteringCluster) {
          const meteringData = await meteringCluster.readAttributes([
            'currentSummationDelivered',
            'instantaneousDemand'
          ]).catch(() => ({}));

          if (meteringData?.currentSummationDelivered !== undefined) {
            const kWh = meteringData.currentSummationDelivered / 1000;
            this.log(`[USB-HUB] Initial Energy: ${kWh} kWh`);
            await this.setCapabilityValue('meter_power', kWh).catch(() => { });
          }
        }

        const electricalCluster = ep1?.clusters?.haElectricalMeasurement;
        if (electricalCluster) {
          const elecData = await electricalCluster.readAttributes([
            'activePower', 'rmsVoltage', 'rmsCurrent'
          ]).catch(() => ({}));

          if (elecData?.activePower !== undefined) {
            const power = elecData.activePower / 10;
            this.log(`[USB-HUB] Initial Power: ${power} W`);
            await this.setCapabilityValue('measure_power', power).catch(() => { });
          }
          if (elecData?.rmsVoltage !== undefined) {
            const voltage = elecData.rmsVoltage / 10;
            this.log(`[USB-HUB] Initial Voltage: ${voltage} V`);
            await this.setCapabilityValue('measure_voltage', voltage).catch(() => { });
          }
          if (elecData?.rmsCurrent !== undefined) {
            const current = elecData.rmsCurrent / 1000;
            this.log(`[USB-HUB] Initial Current: ${current} A`);
            await this.setCapabilityValue('measure_current', current).catch(() => { });
          }
        }

        this.log('[USB-HUB] ✅ Initial states read');
      } catch (err) {
        this.error('[USB-HUB] Failed to read initial states:', err.message);
      }
    }, 2000);
  }

  /**
   * Handle settings changes (power-on behavior)
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('power_on_behavior')) {
      const behavior = newSettings.power_on_behavior;
      const behaviorMap = { 'off': 0, 'on': 1, 'previous': 2 };
      const value = behaviorMap[behavior] ?? 2;

      this.log(`[USB-HUB] Setting power-on behavior to ${behavior} (${value})`);

      try {
        const ep1 = this.zclNode?.endpoints?.[1];
        const onOffCluster = ep1?.clusters?.onOff;
        if (onOffCluster) {
          // moesStartUpOnOff attribute (Tuya specific)
          await onOffCluster.writeAttributes({ moesStartUpOnOff: value }).catch(() => { });
        }
      } catch (err) {
        this.error('[USB-HUB] Failed to set power-on behavior:', err.message);
      }
    }
  }

  async onDeleted() {
    this.log('[USB-HUB] Device deleted');
  }
}

module.exports = USBHubDualDevice;
