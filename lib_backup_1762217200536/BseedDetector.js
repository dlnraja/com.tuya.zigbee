'use strict';

/**
 * BseedDetector - Detect BSEED devices that need Tuya DP protocol
 * 
 * BSEED devices often have firmware that requires Tuya DataPoint protocol
 * instead of standard Zigbee On/Off commands for multi-gang switches.
 * 
 * Based on user report from Loïc Salmona (loic.salmona@gmail.com)
 * Issue: Both gangs activate when triggering one gang via standard Zigbee
 * Solution: Use Tuya DP protocol (DP1=gang1, DP2=gang2, DP3=gang3, etc.)
 */

class BseedDetector {
  
  // Known BSEED manufacturer identifiers
  static BSEED_MANUFACTURERS = [
    'BSEED',
    '_TZ3000_KJ0NWDZ6', // BSEED 2-gang
    '_TZ3000_1OBWWNMQ', // BSEED 3-gang
    '_TZ3000_18EJXRZK', // BSEED 4-gang
    '_TZ3000_VTSCRPMX', // BSEED variants
    '_TZ3000_h1ipgkwn', // Network device
    '_TZ3000_l9brjwau'  // Loïc's device
  ];
  
  /**
   * Check if device is BSEED and needs Tuya DP protocol
   * @param {string} manufacturerName - Device manufacturer name
   * @param {string} productId - Device product ID
   * @returns {boolean} True if BSEED device
   */
  static isBseedDevice(manufacturerName, productId) {
    if (!manufacturerName) return false;
    
    const manuf = manufacturerName.toUpperCase();
    
    return this.BSEED_MANUFACTURERS.some(pattern => 
      manuf.includes(pattern.toUpperCase())
    );
  }
  
  /**
   * Detect if device needs Tuya DP routing for multi-gang
   * @param {ZCLNode} zclNode - Zigbee node
   * @param {string} manufacturerName - Manufacturer name
   * @returns {boolean} True if should use Tuya DP
   */
  static needsTuyaDP(zclNode, manufacturerName) {
    // Check if BSEED
    if (!this.isBseedDevice(manufacturerName)) {
      return false;
    }
    
    // Check if has Tuya cluster
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) return false;
    
    const hasTuyaCluster = endpoint.clusters?.tuyaManufacturer ||
                          endpoint.clusters?.tuyaSpecific ||
                          endpoint.clusters?.manuSpecificTuya ||
                          endpoint.clusters?.[0xEF00] ||
                          endpoint.clusters?.[61184];
    
    return !!hasTuyaCluster;
  }
  
  /**
   * Get recommended protocol for device
   * @param {ZCLNode} zclNode - Zigbee node
   * @param {string} manufacturerName - Manufacturer name
   * @returns {string} 'TUYA_DP' or 'ZIGBEE_NATIVE'
   */
  static getRecommendedProtocol(zclNode, manufacturerName) {
    if (this.needsTuyaDP(zclNode, manufacturerName)) {
      return 'TUYA_DP';
    }
    return 'ZIGBEE_NATIVE';
  }
  
  /**
   * Get gang count from driver ID
   * @param {string} driverId - Driver ID
   * @returns {number} Number of gangs (1-8)
   */
  static getGangCount(driverId) {
    const match = driverId.match(/(\d)gang/);
    return match ? parseInt(match[1]) : 1;
  }
  
  /**
   * Get DP mapping for BSEED multi-gang switch
   * @param {number} gangCount - Number of gangs
   * @returns {object} DP mapping
   */
  static getBseedDPMapping(gangCount) {
    const mapping = {};
    
    for (let gang = 1; gang <= gangCount; gang++) {
      mapping[`gang${gang}`] = {
        onoff: gang,           // DP1=gang1, DP2=gang2, etc.
        countdown: gang + 6,   // DP7=gang1 timer, DP8=gang2 timer, etc.
        powerOnBehavior: gang + 28  // DP29-32
      };
    }
    
    // Global settings
    mapping.global = {
      mainPowerOnBehavior: 14,  // DP14
      ledBehavior: 15,          // DP15
      backlight: 16,            // DP16
      inchingMode: 19           // DP19
    };
    
    return mapping;
  }
}

module.exports = BseedDetector;
