'use strict';
const { safeParse } = require('../utils/tuyaUtils.js');


/**
 * MultiEndpointManager - Gestion devices multi-endpoint
 * RÃ©sout: Bseed 2 gang  Endpoint 2 pas configurÃ©
 * Configure reporting pour TOUS les endpoints
 */
class MultiEndpointManager {
  
  constructor(device) {
    this.device = device;
    this.endpoints = [];
  }

  /**
   * Configure ALL endpoints (not just endpoint 1!)
   * CRITICAL pour multi-gang switches
   */
  async configureAllEndpoints() {
    const device = this.device;
    
    try {
      // Skip for button devices (they handle onOff via command listeners)
      const deviceClass = device.getClass?.() || device.driver?.manifest?.class;
      if (deviceClass === 'button') {
        device.log('[MULTI-EP]  Button device - onOff handled via command listeners, skipping capability config');
        return true; // Not an error, just different handling
      }
      
      device.log('[MULTI-EP]  Configuring all endpoints...');
      
      if (!device.zclNode?.endpoints) {
        device.log('[MULTI-EP]  No endpoints available');
        return false;
      }

      const endpoints = device.zclNode.endpoints;
      const endpointIds = Object.keys(endpoints).map(Number);
      device.log(`[MULTI-EP] Found ${endpointIds.length} endpoint(s)`);

      let configured = 0;

      for (const epId of endpointIds) {
        const endpoint = endpoints[epId];
        
        // Skip OTA endpoint (242)
        if (epId === 242) {
          device.log(`[MULTI-EP] Skip endpoint ${epId} (OTA)`);
          continue;
        }

        device.log(`[MULTI-EP] Configuring endpoint ${epId}...`);

        // Configure onOff for switches
        if (await this._configureOnOffEndpoint(endpoint, epId)) {
          configured++;
        }

        // Configure measurements if available
        if (await this._configureMeasurementsEndpoint(endpoint, epId)) {
          configured++;
        }

        this.endpoints.push(epId);
      }

      device.log(`[MULTI-EP]  Configured ${configured} endpoint feature(s)`);
      return configured > 0;

    } catch (err) {
      device.error('[MULTI-EP]  Configuration failed:', err);
      return false;
    }
  }

  /**
   * Configure onOff cluster for endpoint
   */
  async _configureOnOffEndpoint(endpoint, epId) {
    const device = this.device;
    
    try {
      const onOff = endpoint.clusters?.onOff;if (!onOff) return false;

      device.log(`[MULTI-EP] Endpoint ${epId} has onOff cluster`);

      // Register capability if needed
      const capabilityId = epId === 1 ? 'onoff' : `onoff.${epId}`;
      
      if (!device.hasCapability(capabilityId)) {
        device.log(`[MULTI-EP]  Capability ${capabilityId} not found (add to driver.compose.json!)`);
        return false;
      }

      // Setup listener
      onOff.on('attr.onOff', async (value) => {
        device.log(`[MULTI-EP] Endpoint ${epId} onOff changed: ${value}`);
        try {
          await device._safeSetCapability(capabilityId, !!value);
        } catch (err) {
          device.log(`[MULTI-EP]  Failed to set ${capabilityId}:`, err.message);
        }
      });

      // Configure reporting (CRITICAL!)
      try {
        await onOff.configureReporting({
          onOff: {
            minInterval: 0, // IMMEDIATE
            maxInterval: 300,
            minChange: 1
          }
        });
        device.log(`[MULTI-EP]  Endpoint ${epId} onOff reporting configured`);
      } catch (err) {
        device.log(`[MULTI-EP]  Endpoint ${epId} reporting config failed:`, err.message);
      }

      // Read initial state
      try {
        const state = await onOff.readAttributes(['onOff']);
        if (state?.onOff !== undefined) {
          await device._safeSetCapability(capabilityId, !!state.onOff);
          device.log(`[MULTI-EP] Endpoint ${epId} initial state: ${state.onOff}`);
        }
      } catch (err) {
        device.log(`[MULTI-EP]  Endpoint ${epId} read failed:`, err.message);
      }

      // Register capability listener
      device.registerCapabilityListener(capabilityId, async (value) => {
        device.log(`[MULTI-EP] Endpoint ${epId} command: ${value}`);
        try {
          if (value) {
            await onOff.on();
          } else {
            await onOff.off();
          }
        } catch (err) {
          device.error(`[MULTI-EP] Endpoint ${epId} command failed:`, err);
          throw err;
        }
      });

      return true;

    } catch (err) {
      device.error(`[MULTI-EP] Endpoint ${epId} onOff setup failed:`, err);
      return false;
    }
  }

  /**
   * Configure measurements for endpoint (power, etc.)
   */
  async _configureMeasurementsEndpoint(endpoint, epId) {
    const device = this.device;
    
    try {
      const hasMeasurement = endpoint.clusters?.haElectricalMeasurement || 
                             endpoint.clusters?.metering;
      
      if (!hasMeasurement) return false;

      device.log(`[MULTI-EP] Endpoint ${epId} has measurement cluster`);

      const sfx = epId > 1 ? `.${epId}` : '';
      const em = endpoint.clusters.haElectricalMeasurement;
      if (em) {
        const cap = `measure_power${sfx}`;
        if (!device.hasCapability(cap)) await device.addCapability(cap).catch(() => {});
        if (device.hasCapability(cap)) {
          em.on('attr.activePower', (v) => {
            device.setCapabilityValue(cap, safeParse(v, 10)).catch(() => {});
          });
          device.log(`[MULTI-EP] EP${epId}: ${cap} registered`);
        }
      }
      return !!em;

    } catch (err) {
      device.error(`[MULTI-EP] Endpoint ${epId} measurement setup failed:`, err);
      return false;
    }
  }

  /**
   * Get all configured endpoint IDs
   */
  getEndpoints() {
    return this.endpoints;
  }

  /**
   * Check if multi-endpoint device
   */
  isMultiEndpoint() {
    return this.endpoints.length > 1;
  }
}

module.exports = MultiEndpointManager;


