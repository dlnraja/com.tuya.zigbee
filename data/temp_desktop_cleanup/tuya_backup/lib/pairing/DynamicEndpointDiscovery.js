'use strict';

/**
 * DynamicEndpointDiscovery - Find functional endpoint dynamically
 * Problem: Many Tuya devices don't use endpoint 1
 * @version 5.5.670
 */

class DynamicEndpointDiscovery {
  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;
  }

  async discover(zclNode) {
    const endpoints = zclNode?.endpoints || {};
    const discovered = [];
    
    for (const [epId, ep] of Object.entries(endpoints)) {
      if (epId === '242') continue; // Skip Green Power
      
      const clusters = Object.keys(ep.clusters || {});
      discovered.push({
        id: parseInt(epId),
        clusters,
        hasTuya: clusters.includes('61184') || clusters.includes('tuya'),
        hasOnOff: clusters.includes('onOff') || clusters.includes('6'),
        hasIAS: clusters.includes('iasZone') || clusters.includes('1280')
      });
    }
    
    this.log(`[EP-DISCOVER] Found ${discovered.length} endpoints`);
    return discovered;
  }

  findFunctional(zclNode, preferTuya = true) {
    const eps = zclNode?.endpoints || {};
    
    // Priority 1: Endpoint with Tuya cluster
    if (preferTuya) {
      for (const [id, ep] of Object.entries(eps)) {
        if (ep.clusters?.[61184] || ep.clusters?.tuya) return parseInt(id);
      }
    }
    
    // Priority 2: Endpoint with OnOff
    for (const [id, ep] of Object.entries(eps)) {
      if (ep.clusters?.onOff || ep.clusters?.[6]) return parseInt(id);
    }
    
    // Priority 3: Endpoint 1
    if (eps[1]) return 1;
    
    // Priority 4: First non-242 endpoint
    for (const id of Object.keys(eps)) {
      if (id !== '242') return parseInt(id);
    }
    
    return 1;
  }
}

module.exports = DynamicEndpointDiscovery;
