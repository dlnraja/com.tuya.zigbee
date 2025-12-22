'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');
const { CLUSTER } = require('zigbee-clusters');

/**
 * 2-Gang Smart Switch - v5.5.26 ENHANCED
 *
 * Sources: Z2M dual USB switch / TS0002
 * https://github.com/Koenkk/zigbee2mqtt/issues/...
 *
 * Features:
 * - 2 endpoints On/Off (EP1, EP2)
 * - Power measurement via electricalMeasurement (0x0B04)
 * - Energy metering via metering (0x0702)
 * - Settings: switchType, powerOnBehavior, backlight
 *
 * Models: _TZ3000_h1ipgkwn, _TZ3000_jl7w3l3q, etc.
 */
class Switch2GangDevice extends HybridSwitchBase {
  get gangCount() { return 2; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // v5.5.43: Cleanup orphan capabilities (like "Active" button that does nothing)
    await this._cleanupOrphanCapabilities();

    // v5.5.26: Setup power measurement for ZCL devices (router/mains)
    await this._setupPowerMeasurement(zclNode);

    this.log('[SWITCH-2G] ✅ Ready with power measurement');
    this.log('[SWITCH-2G] ⚠️  Note: USB ports are typically hardwired (not controllable via gang switches)');
  }

  /**
   * v5.5.43: Remove orphan capabilities that don't belong to this driver
   * Common issue: "Active" button added by old versions that does nothing
   */
  async _cleanupOrphanCapabilities() {
    // List of valid capabilities for 2-gang switch
    const validCaps = [
      'onoff', 'onoff.gang2',
      'measure_power', 'measure_voltage', 'measure_current', 'meter_power'
    ];

    // Get all current capabilities
    const currentCaps = this.getCapabilities();

    for (const cap of currentCaps) {
      if (!validCaps.includes(cap)) {
        this.log(`[SWITCH-2G] ⚠️ Removing orphan capability: ${cap}`);
        await this.removeCapability(cap).catch(e => {
          this.log(`[SWITCH-2G] Failed to remove ${cap}: ${e.message}`);
        });
      }
    }
  }

  /**
   * v5.5.26: Setup power measurement via electricalMeasurement + metering clusters
   * Sources: Z2M TS0002 profile
   */
  async _setupPowerMeasurement(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) {
      this.log('[SWITCH-2G] No clusters on EP1');
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // electricalMeasurement cluster (0x0B04) - Power, Voltage, Current
    // ═══════════════════════════════════════════════════════════════════
    const elecCluster = endpoint.clusters.electricalMeasurement
      || endpoint.clusters.haElectricalMeasurement
      || endpoint.clusters[0x0B04]
      || endpoint.clusters['2820'];

    if (elecCluster) {
      this.log('[SWITCH-2G] ✅ electricalMeasurement cluster found');

      // Setup attribute reporting listeners
      if (typeof elecCluster.on === 'function') {
        // Active Power (W)
        elecCluster.on('attr.activePower', (value) => {
          const watts = value / 10; // Typically in 0.1W units
          this.log(`[ZCL-DATA] switch.power raw=${value} → ${watts}W`);
          if (this.hasCapability('measure_power')) {
            this.setCapabilityValue('measure_power', watts).catch(() => { });
          }
        });

        // RMS Voltage (V)
        elecCluster.on('attr.rmsVoltage', (value) => {
          const volts = value / 10; // Typically in 0.1V units
          this.log(`[ZCL-DATA] switch.voltage raw=${value} → ${volts}V`);
          if (this.hasCapability('measure_voltage')) {
            this.setCapabilityValue('measure_voltage', volts).catch(() => { });
          }
        });

        // RMS Current (A)
        elecCluster.on('attr.rmsCurrent', (value) => {
          const amps = value / 1000; // Typically in mA
          this.log(`[ZCL-DATA] switch.current raw=${value} → ${amps}A`);
          if (this.hasCapability('measure_current')) {
            this.setCapabilityValue('measure_current', amps).catch(() => { });
          }
        });
      }

      // v5.5.62: Configure attribute reporting with retry on Zigbee startup
      this._configureElectricalReporting();

      // Initial read
      this._readElectricalAttributes(elecCluster);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Metering cluster (0x0702) - Energy (kWh)
    // ═══════════════════════════════════════════════════════════════════
    const meteringCluster = endpoint.clusters.metering
      || endpoint.clusters.seMetering
      || endpoint.clusters[0x0702]
      || endpoint.clusters['1794'];

    if (meteringCluster) {
      this.log('[SWITCH-2G] ✅ metering cluster found');

      if (typeof meteringCluster.on === 'function') {
        // Current summation delivered (kWh)
        meteringCluster.on('attr.currentSummationDelivered', (value) => {
          const kwh = value / 1000; // Typically in Wh
          this.log(`[ZCL-DATA] switch.energy raw=${value} → ${kwh}kWh`);
          if (this.hasCapability('meter_power')) {
            this.setCapabilityValue('meter_power', kwh).catch(() => { });
          }
        });
      }

      // v5.5.62: Configure reporting for energy with retry on Zigbee startup
      this._configureMeteringReporting();

      // Initial read
      this._readMeteringAttributes(meteringCluster);
    }
  }

  /**
   * v5.5.62: Configure electrical reporting with retry on Zigbee startup
   */
  async _configureElectricalReporting(retryCount = 0) {
    try {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.ELECTRICAL_MEASUREMENT,
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 1
        },
        {
          endpointId: 1,
          cluster: CLUSTER.ELECTRICAL_MEASUREMENT,
          attributeName: 'rmsVoltage',
          minInterval: 60,
          maxInterval: 600,
          minChange: 10
        },
        {
          endpointId: 1,
          cluster: CLUSTER.ELECTRICAL_MEASUREMENT,
          attributeName: 'rmsCurrent',
          minInterval: 10,
          maxInterval: 300,
          minChange: 10
        }
      ]);
      this.log('[SWITCH-2G] ✅ electricalMeasurement reporting configured');
    } catch (e) {
      const msg = e?.message || String(e);
      // Retry if Zigbee is starting up (max 3 retries)
      if ((msg.includes('Zigbee') || msg.includes('démarrage') || msg.includes('starting')) && retryCount < 3) {
        this.log(`[SWITCH-2G] ⏰ Zigbee starting, will retry electrical reporting in 60s (attempt ${retryCount + 1}/3)`);
        this.homey.setTimeout(() => this._configureElectricalReporting(retryCount + 1), 60000);
      } else {
        this.log('[SWITCH-2G] electricalMeasurement reporting failed:', msg);
      }
    }
  }

  /**
   * v5.5.62: Configure metering reporting with retry on Zigbee startup
   */
  async _configureMeteringReporting(retryCount = 0) {
    try {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.METERING,
          attributeName: 'currentSummationDelivered',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 1
        }
      ]);
      this.log('[SWITCH-2G] ✅ metering reporting configured');
    } catch (e) {
      const msg = e?.message || String(e);
      // Retry if Zigbee is starting up (max 3 retries)
      if ((msg.includes('Zigbee') || msg.includes('démarrage') || msg.includes('starting')) && retryCount < 3) {
        this.log(`[SWITCH-2G] ⏰ Zigbee starting, will retry metering reporting in 60s (attempt ${retryCount + 1}/3)`);
        this.homey.setTimeout(() => this._configureMeteringReporting(retryCount + 1), 60000);
      } else {
        this.log('[SWITCH-2G] metering reporting failed:', msg);
      }
    }
  }

  /**
   * v5.5.26: Read initial electrical measurement values
   */
  async _readElectricalAttributes(cluster) {
    try {
      const attrs = await cluster.readAttributes([
        'activePower', 'rmsVoltage', 'rmsCurrent'
      ]).catch(() => ({}));

      if (attrs.activePower != null && this.hasCapability('measure_power')) {
        this.setCapabilityValue('measure_power', attrs.activePower / 10).catch(() => { });
      }
      if (attrs.rmsVoltage != null && this.hasCapability('measure_voltage')) {
        this.setCapabilityValue('measure_voltage', attrs.rmsVoltage / 10).catch(() => { });
      }
      if (attrs.rmsCurrent != null && this.hasCapability('measure_current')) {
        this.setCapabilityValue('measure_current', attrs.rmsCurrent / 1000).catch(() => { });
      }
      this.log('[SWITCH-2G] Initial electrical values read');
    } catch (e) {
      this.log('[SWITCH-2G] Initial electrical read failed:', e.message);
    }
  }

  /**
   * v5.5.26: Read initial metering values
   */
  async _readMeteringAttributes(cluster) {
    try {
      const attrs = await cluster.readAttributes([
        'currentSummationDelivered'
      ]).catch(() => ({}));

      if (attrs.currentSummationDelivered != null && this.hasCapability('meter_power')) {
        this.setCapabilityValue('meter_power', attrs.currentSummationDelivered / 1000).catch(() => { });
      }
      this.log('[SWITCH-2G] Initial metering values read');
    } catch (e) {
      this.log('[SWITCH-2G] Initial metering read failed:', e.message);
    }
  }
}

module.exports = Switch2GangDevice;
