'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SWITCH USB DONGLE - v8.1.0 (ZCL-Only 1-Port USB Relay/Repeater)        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Supports _TZ3000_h1ipgkwn / TS0001 USB 1-Port Relay & Zigbee Repeater      ║
 * ║  - 1 x USB On/Off (endpoint 1=l1)                                           ║
 * ║  - Power-on behavior (moesStartUpOnOff via cluster 0xE001)                   ║
 * ║  - Mains-powered (USB bus) - NO battery                                     ║
 * ║  - ZCL-only (clusters: OnOff, manuSpecificTuya3, manuSpecificTuya4)          ║
 * ║  - Physical button detection via PhysicalButtonMixin                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SwitchUsbDongleDevice extends PhysicalButtonMixin(ZigBeeDevice) {

  get mainsPowered() { return true; }

  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      // v8.1.0: ZCL-only initialization for USB 1-port relay
      await super.onNodeInit({ zclNode });

      // Remove battery capabilities (USB bus powered)
      if (this.hasCapability('measure_battery')) {
        await this.removeCapability('measure_battery').catch(() => {});
      }
      if (this.hasCapability('alarm_battery')) {
        await this.removeCapability('alarm_battery').catch(() => {});
      }

      // Remove L2 capability if it accidentally remains from migration
      if (this.hasCapability('onoff.l2')) {
        await this.removeCapability('onoff.l2').catch(() => {});
      }

      // Setup end-to-end capability listeners for the USB port
      this._registerOnOffListeners();

      // Setup power-on behavior if moesStartUpOnOff is available
      await this._setupPowerOnBehavior(zclNode);

      // Setup power measurement (optional, not all USB dongles have metering)
      await this._setupPowerMeasurement(zclNode);

      this.log('[USB-DONGLE] ✅ 1-port USB relay initialized');
    }, 'onNodeInit');
  }

  /**
   * Register OnOff listener for the USB endpoint
   * Endpoint 1 → onoff
   */
  _registerOnOffListeners() {
    this.registerCapabilityListener('onoff', async (value) => {
      await this._sendZCLCommand(1, value);
    });

    this.log('[USB-DONGLE] ✅ ZCL OnOff listener registered');
  }

  /**
   * Send ZCL OnOff command to specific endpoint
   */
  async _sendZCLCommand(endpoint, value) {
    const zclNode = this.zclNode;
    if (!zclNode?.endpoints?.[endpoint]) {
      this.error(`[USB-DONGLE] Endpoint ${endpoint} not found`);
      return;
    }

    const cluster = zclNode.endpoints[endpoint].clusters.onOff ||
                    zclNode.endpoints[endpoint].clusters.genOnOff ||
                    zclNode.endpoints[endpoint].clusters[6];
    if (!cluster) {
      this.error(`[USB-DONGLE] OnOff cluster not found on endpoint ${endpoint}`);
      return;
    }

    try {
      if (typeof this.markAppCommand === 'function') {
        this.markAppCommand(endpoint, value);
      }
      if (value) {
        await cluster.setOn();
      } else {
        await cluster.setOff();
      }
      this.log(`[USB-DONGLE] 📡 ZCL endpoint ${endpoint}: ${value ? 'ON' : 'OFF'}`);
    } catch (err) {
      this.error(`[USB-DONGLE] ZCL command failed endpoint ${endpoint}: ${err.message}`);
    }
  }

  /**
   * Setup power-on behavior via moesStartUpOnOff (cluster 0xE001 attribute)
   */
  async _setupPowerOnBehavior(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    const cluster = ep?.clusters?.manuSpecificTuya3 || ep?.clusters?.[0xE001];
    if (!cluster?.moesStartUpOnOff && !cluster?.readAttributes) {return;}

    try {
      const attrs = await cluster.readAttributes(['moesStartUpOnOff']).catch(() => ({}));
      if (attrs.moesStartUpOnOff !== undefined) {
        const mode = attrs.moesStartUpOnOff === 0 ? 'off' :
                     attrs.moesStartUpOnOff === 1 ? 'on' : 'previous';
        this.log(`[USB-DONGLE] Power-on behavior: ${mode} (${attrs.moesStartUpOnOff})`);
      }
    } catch (err) {
      this.log('[USB-DONGLE] Power-on behavior read skipped:', err.message);
    }
  }

  /**
   * Setup power measurement (if available)
   */
  async _setupPowerMeasurement(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) {return;}

    const hasMetering = !!(endpoint.clusters.seMetering || endpoint.clusters.metering || endpoint.clusters[0x0702]);
    const hasElectrical = !!(endpoint.clusters.haElectricalMeasurement || endpoint.clusters.electricalMeasurement || endpoint.clusters[0x0B04]);

    if (!hasMetering && !hasElectrical) {return;}

    try {
      const configs = [];
      if (hasMetering) {
        configs.push({
          cluster: 'seMetering',
          attributeName: 'currentSummationDelivered',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 1
        });
      }
      if (hasElectrical) {
        configs.push({
          cluster: 'haElectricalMeasurement',
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 5
        });
      }
      if (configs.length > 0) {
        await this.configureAttributeReporting(configs).catch(() => {});
      }
    } catch (e) { /* power measurement setup optional */ }
  }
}

module.exports = SwitchUsbDongleDevice;
