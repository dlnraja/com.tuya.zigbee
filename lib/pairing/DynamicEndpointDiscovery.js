'use strict';

/**
 * DynamicEndpointDiscovery - Find functional endpoint dynamically
 * Problem: Many Tuya devices don't use endpoint 1
 * @version 5.5.670 / P2410 advertising catalog
 */

class DynamicEndpointDiscovery {
  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;
  }

  /**
   * Catalog endpoints + clusters the node is advertising (interview / zclNode).
   * WHY: Pairing interview is the only safe Zigbee "advertisement" apps see.
   */
  async discover(zclNode) {
    const endpoints = zclNode?.endpoints || {};
    const discovered = [];

    for (const [epId, ep] of Object.entries(endpoints)) {
      if (epId === '242') { continue; } // Skip Green Power

      const clusterKeys = Object.keys(ep.clusters || {});
      const clusterIds = clusterKeys.map((k) => {
        const n = Number(k);
        return Number.isFinite(n) ? n : k;
      });
      const hasTuya = clusterKeys.includes('61184') || clusterKeys.includes('tuya')
        || clusterIds.includes(0xEF00) || clusterIds.includes(61184);
      const hasOnOff = clusterKeys.includes('onOff') || clusterKeys.includes('6') || clusterIds.includes(6);
      const hasIAS = clusterKeys.includes('iasZone') || clusterKeys.includes('1280') || clusterIds.includes(0x0500);
      const hasBasic = clusterKeys.includes('basic') || clusterKeys.includes('0') || clusterIds.includes(0);
      const hasMultistate = clusterKeys.some((k) => /multistate|0xFD|fd/i.test(String(k)))
        || clusterIds.includes(0x0012);

      discovered.push({
        id: parseInt(epId, 10),
        clusters: clusterKeys,
        clusterIds,
        hasTuya,
        hasOnOff,
        hasIAS,
        hasBasic,
        hasMultistate,
        advertising: clusterKeys.length > 0,
      });
    }

    this.log(`[EP-DISCOVER] Advertising ${discovered.length} endpoints (${discovered.filter((e) => e.advertising).length} with clusters)`);
    return discovered;
  }

  /** Flat summary for diagnostics / settings / pair interview. */
  summarizeAdvertising(zclNode) {
    const eps = zclNode?.endpoints || {};
    const mfr = zclNode?.manufacturerName || zclNode?.manufacturer || null;
    const model = zclNode?.modelId || zclNode?.modelID || null;
    const endpoints = [];
    for (const [epId, ep] of Object.entries(eps)) {
      if (epId === '242') continue;
      endpoints.push({
        id: Number(epId),
        clusters: Object.keys(ep.clusters || {}),
      });
    }
    return {
      manufacturerName: mfr,
      productId: model,
      endpointCount: endpoints.length,
      endpoints,
      advertising: endpoints.some((e) => (e.clusters || []).length > 0),
      suggestedEp: this.findFunctional(zclNode, true),
    };
  }

  /**
   * Pairing hint: ordered endpoints advertising useful clusters (Tuya → OnOff → IAS → rest).
   */
  listPairingCandidates(zclNode) {
    const discovered = [];
    const endpoints = zclNode?.endpoints || {};
    for (const [epId, ep] of Object.entries(endpoints)) {
      if (epId === '242') continue;
      const clusters = Object.keys(ep.clusters || {});
      if (!clusters.length) continue;
      let score = clusters.length;
      if (clusters.includes('61184') || clusters.includes('tuya')) score += 100;
      if (clusters.includes('onOff') || clusters.includes('6')) score += 40;
      if (clusters.includes('iasZone') || clusters.includes('1280')) score += 30;
      discovered.push({ id: parseInt(epId, 10), clusters, score, advertising: true });
    }
    return discovered.sort((a, b) => b.score - a.score);
  }

  findFunctional(zclNode, preferTuya = true) {
    const eps = zclNode?.endpoints || {};

    // Priority 1: Endpoint with Tuya cluster
    if (preferTuya) {
      for (const [id, ep] of Object.entries(eps)) {
        if (ep.clusters?.[61184] || ep.clusters?.tuya) { return parseInt(id, 10); }
      }
    }

    // Priority 2: Endpoint with OnOff
    for (const [id, ep] of Object.entries(eps)) {
      if (ep.clusters?.onOff || ep.clusters?.[6]) { return parseInt(id, 10); }
    }

    // Priority 3: Endpoint 1
    if (eps[1]) { return 1; }

    // Priority 4: First non-242 endpoint
    for (const id of Object.keys(eps)) {
      if (id !== '242') { return parseInt(id, 10); }
    }

    return 1;
  }
}

module.exports = DynamicEndpointDiscovery;
