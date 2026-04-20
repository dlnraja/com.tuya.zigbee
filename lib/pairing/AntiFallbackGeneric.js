'use strict';

/**
 * AntiFallbackGeneric - Prevents zigbee generic fallback
 * @version 5.5.670
 */

class AntiFallbackGeneric {
  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;
  }

  isGenericFallback() {
    const id = this.device.driver?.id || '';
    return id.includes('generic') || id.includes('fallback');
  }

  suggestDriver(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    if (!ep) return null;
    const c = ep.clusters || {};
    
    if (c[61184]) return 'generic_tuya';
    if (c.iasZone || c[1280]) return 'motion_sensor';
    if (c.onOff || c[6]) return 'switch_1gang';
    return null;
  }
}

module.exports = AntiFallbackGeneric;
