'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { ensureManufacturerSettings } = require('../../lib/helpers/ManufacturerNameHelper');
const ManufacturerVariationManager = require('../../lib/ManufacturerVariationManager');
const TuyaCommandSender = require('../../lib/tuya/TuyaCommandSender');
const { parseTuyaFrame } = require('../../lib/tuya/UniversalTuyaParser');
const { BoundCluster } = require('zigbee-clusters');

class WaterValveGardenDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.log('[VALVE-GARDEN] Initializing...');

    // 1. Ensure manufacturer and model settings are populated
    await ensureManufacturerSettings(this).catch(() => {});

    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const data = this.getData() || {};
    
    const manufacturerName = settings.zb_manufacturer_name || 
                             store.manufacturerName || 
                             data.manufacturerName || 
                             'unknown';
    const productId = settings.zb_model_id || 
                      store.modelId || 
                      data.productId || 
                      'unknown';
    const driverType = 'water_valve_garden';

    this.log(`[VALVE-GARDEN] Model: ${productId} | Manufacturer: ${manufacturerName}`);

    // 2. Resolve dynamic configuration
    const config = ManufacturerVariationManager.getManufacturerConfig(
      manufacturerName,
      productId,
      driverType
    );

    // Apply configuration to device instance
    ManufacturerVariationManager.applyManufacturerConfig(this, config);

    // Check if pure Tuya DP
    if (this._isPureTuyaDP) {
      this.log('[VALVE-GARDEN] Tuya DP protocol detected');
      await this._initTuyaDP(zclNode);
    } else {
      this.log('[VALVE-GARDEN] Standard ZCL protocol detected');
      await this._initStandardZCL(zclNode);
    }

    this.log('[VALVE-GARDEN] Initialization complete');
  }

  /**
   * Initialize Tuya DP-based water valve
   */
  async _initTuyaDP(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.error('[VALVE-GARDEN] No endpoint 1 for Tuya DP');
      return;
    }

    // Try to find the Tuya EF00 cluster on any endpoint
    let tuyaCluster = null;
    const possibleNames = ['tuya', 'tuyaSpecific', 'manuSpecificTuya', 61184, 0xEF00];
    for (const name of possibleNames) {
      if (endpoint.clusters[name]) {
        tuyaCluster = endpoint.clusters[name];
        this.log(`[VALVE-GARDEN] Found Tuya cluster: ${name}`);
        break;
      }
    }

    if (!tuyaCluster) {
      this.log('[VALVE-GARDEN] No Tuya cluster found, forcing binding fallback');
    }

    // Define BoundCluster class for P1 fallback
    const device = this;
    class TuyaValveBoundCluster extends BoundCluster {
      response(payload) {
        device.log('[VALVE-GARDEN-BOUND] 📥 response');
        device._processTuyaPayload(payload);
      }
      reporting(payload) {
        device.log('[VALVE-GARDEN-BOUND] 📥 reporting');
        device._processTuyaPayload(payload);
      }
      dataReport(payload) {
        device.log('[VALVE-GARDEN-BOUND] 📥 dataReport');
        device._processTuyaPayload(payload);
      }
    }

    // P1: Bind BoundCluster
    for (const name of possibleNames) {
      try {
        endpoint.bind(name, new TuyaValveBoundCluster());
        this.log(`[VALVE-GARDEN-P1] BoundCluster bound: ${name}`);
        break;
      } catch (e) { /* ignore and try next */ }
    }

    // P2: Cluster event listeners
    if (tuyaCluster && typeof tuyaCluster.on === 'function') {
      const events = ['response', 'reporting', 'dataReport', 'dp'];
      for (const eventName of events) {
        tuyaCluster.on(eventName, (data, ...args) => {
          this.log(`[VALVE-GARDEN-P2] 📥 ${eventName} event`);
          if (eventName === 'dp' && args.length >= 1) {
            this._handleDP(data, args[0]);
          } else {
            this._processTuyaPayload(data);
          }
        });
      }
    }

    // P3: Raw frame listener
    if (typeof endpoint.on === 'function') {
      endpoint.on('frame', (frame) => {
        if (frame.cluster === 0xEF00 || frame.cluster === 61184) {
          this.log('[VALVE-GARDEN-P3] 📥 Raw frame received');
          if (frame.data && frame.data.length > 2) {
            this._parseTuyaRawFrame(frame.data);
          }
        }
      });
    }

    // Register capability listener
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[VALVE-GARDEN] Set valve (Tuya DP): ${value}`);
      
      // Determine Tuya cluster to send command to
      const targetCluster = tuyaCluster || endpoint.clusters?.[0xEF00] || endpoint.clusters?.[61184];
      if (!targetCluster) {
        throw new Error('No Tuya cluster found to send OnOff command');
      }

      // Send DP1: Boolean On/Off
      const dpId = 1;
      const dataType = 0x01; // Boolean
      const success = await TuyaCommandSender.setDP(targetCluster, this, dpId, dataType, value);
      if (!success) {
        throw new Error('Failed to send Tuya DP On/Off command');
      }
    });

    // Restore last known battery value if available
    const storedBattery = this.getStoreValue('last_battery_percentage');
    if (storedBattery !== null && storedBattery !== undefined) {
      this.log(`[VALVE-GARDEN] Restoring battery: ${storedBattery}%`);
      await this.setCapabilityValue('measure_battery', storedBattery).catch(() => {});
    }
  }

  _processTuyaPayload(data) {
    if (!data) return;
    if (data.dpValues && Buffer.isBuffer(data.dpValues)) {
      this._parseTuyaRawFrame(Buffer.concat([Buffer.alloc(2), data.dpValues]));
    } else if (data.dp !== undefined) {
      this._handleDP(data.dp, data.value || data.data);
    }
  }

  _parseTuyaRawFrame(buffer) {
    try {
      const results = parseTuyaFrame(buffer, this.log.bind(this));
      for (const { dpId, value } of results) {
        this._handleDP(dpId, value);
      }
    } catch (e) {
      this.log('[VALVE-GARDEN-RAW] Parse error:', e.message);
    }
  }

  _handleDP(dpId, rawValue) {
    const config = this._manufacturerConfig;
    const mapping = config?.dpMappings?.[dpId];
    if (!mapping) {
      this.log(`[VALVE-GARDEN] ⚠️ Unhandled DP${dpId} = ${JSON.stringify(rawValue)}`);
      return;
    }

    let value = typeof rawValue === 'number' ? rawValue :
      Buffer.isBuffer(rawValue) ? rawValue.readIntBE(0, rawValue.length) : rawValue;

    if (mapping.divisor) value = value / mapping.divisor;
    if (mapping.transform) value = mapping.transform(value);

    this.log(`[VALVE-GARDEN] DP${dpId} → ${mapping.capability || mapping.internal || 'unknown'} = ${value}`);

    if (mapping.capability) {
      this.setCapabilityValue(mapping.capability, value).catch(e => this.error(e));
      
      // If it's battery, also save to store and emit event
      if (mapping.capability === 'measure_battery') {
        this.setStoreValue('last_battery_percentage', value).catch(() => {});
      }
    } else if (mapping.internal === 'countdown') {
      this.log(`[VALVE-GARDEN] ⏱️ Irrigation countdown active: ${value} seconds`);
      this.emit('irrigation_countdown', value);
    } else if (mapping.internal === 'work_state') {
      this.log(`[VALVE-GARDEN] ⚙️ Valve work state: ${value}`);
      this.emit('valve_work_state', value);
    }
  }

  /**
   * Initialize standard ZCL-based water valve
   */
  async _initStandardZCL(zclNode) {
    // --- Attribute Reporting Configuration ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    const ep = zclNode?.endpoints?.[1];
    const onOff = ep?.clusters?.onOff;
    if (onOff) {
      onOff.on('attr.onOff', (v) => {
        this.log('[VALVE-GARDEN] onOff report: ' + v);
        this.setCapabilityValue('onoff', !!v).catch(this.error);
      });
    }

    this.registerCapabilityListener('onoff', async (value) => {
      this.log('[VALVE-GARDEN] Set valve: ' + value);
      if (onOff) { await (value ? onOff.setOn() : onOff.setOff()); }
    });

    const pwrCfg = ep?.clusters?.powerConfiguration;
    if (pwrCfg) {
      pwrCfg.on('attr.batteryPercentageRemaining', (v) => {
        const pct = Math.min(100, Math.round(v / 2));
        this.log('[VALVE-GARDEN] battery: ' + pct + '%');
        this.setCapabilityValue('measure_battery', pct).catch(this.error);
      });
    }
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WaterValveGardenDevice;
