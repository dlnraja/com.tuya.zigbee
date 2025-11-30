#!/usr/bin/env node

/**
 * TitleSanitizer - Smart Name Cleanup for Devices
 * 
 * PROBLÈME (Diagnostic 5bbbabc5):
 * "il y a encore écrit hybride dans le titre de certains drivers après 
 * associations et il y a des parenthèses ce qui n'est pas sanitanisé"
 * 
 * SOLUTION:
 * Nettoyer automatiquement les noms après hardware detection
 * Retirer "(Hybrid)", "[Battery]", parenthèses inutiles, etc.
 */

'use strict';

class TitleSanitizer {
    
  /**
     * Sanitize device name - Remove unwanted patterns
     * @param {string} name - Original device name
     * @returns {string} - Cleaned device name
     */
  static sanitize(name) {
    if (!name || typeof name !== 'string') {
      return name;
    }
        
    let sanitized = name;
        
    // Remove "(Hybrid)" pattern
    sanitized = sanitized.replace(/\s*\(Hybrid\)\s*/gi, '');
    sanitized = sanitized.replace(/\s*Hybrid\s*/gi, '');
        
    // Remove "[Battery]", "[AC]", "[DC]" patterns
    sanitized = sanitized.replace(/\s*\[Battery\]\s*/gi, '');
    sanitized = sanitized.replace(/\s*\[AC\]\s*/gi, '');
    sanitized = sanitized.replace(/\s*\[DC\]\s*/gi, '');
    sanitized = sanitized.replace(/\s*\[AC\/DC\]\s*/gi, '');
        
    // Remove other common patterns
    sanitized = sanitized.replace(/\s*\(AC\/DC\)\s*/gi, '');
    sanitized = sanitized.replace(/\s*\(Battery\)\s*/gi, '');
    sanitized = sanitized.replace(/\s*\(AC\)\s*/gi, '');
    sanitized = sanitized.replace(/\s*\(DC\)\s*/gi, '');
        
    // Remove power source mentions
    sanitized = sanitized.replace(/\s*-\s*Battery\s*$/gi, '');
    sanitized = sanitized.replace(/\s*-\s*AC\s*$/gi, '');
    sanitized = sanitized.replace(/\s*-\s*DC\s*$/gi, '');
        
    // Remove empty parentheses
    sanitized = sanitized.replace(/\s*\(\s*\)\s*/g, '');
    sanitized = sanitized.replace(/\s*\[\s*\]\s*/g, '');
        
    // Remove double spaces
    sanitized = sanitized.replace(/\s{2,}/g, ' ');
        
    // Trim
    sanitized = sanitized.trim();
        
    return sanitized;
  }
    
  /**
     * Generate clean default name based on driver
     * @param {string} driverId - Driver ID
     * @param {object} node - Zigbee node
     * @returns {string} - Clean device name
     */
  static generateDefaultName(driverId, node = null) {
    // Map driver IDs to clean names
    const nameMap = {
      // Motion sensors
      'motion_sensor_pir': 'Motion Sensor',
      'motion_sensor_radar': 'Radar Sensor',
      'presence_sensor_radar': 'Presence Sensor',
            
      // Contact sensors
      'contact_sensor': 'Contact Sensor',
      'door_sensor': 'Door Sensor',
      'window_sensor': 'Window Sensor',
            
      // Climate
      'temp_sensor': 'Temperature Sensor',
      'humidity_sensor': 'Humidity Sensor',
      'temp_humidity_sensor': 'Climate Sensor',
            
      // Buttons
      'button_wireless_1': 'Wireless Button',
      'button_wireless_2': '2-Button Remote',
      'button_wireless_3': '3-Button Remote',
      'button_wireless_4': '4-Button Remote',
      'button_wireless_6': '6-Button Remote',
      'button_wireless_8': '8-Button Remote',
      'sos_button': 'SOS Button',
            
      // Wall switches
      'wall_touch_1gang': '1-Gang Switch',
      'wall_touch_2gang': '2-Gang Switch',
      'wall_touch_3gang': '3-Gang Switch',
      'wall_touch_4gang': '4-Gang Switch',
      'wall_touch_5gang': '5-Gang Switch',
      'wall_touch_6gang': '6-Gang Switch',
            
      // Plugs
      'smart_plug': 'Smart Plug',
      'smart_plug_energy': 'Smart Plug',
      'usb_outlet_1gang': 'USB Outlet',
      'usb_outlet_advanced': 'USB Outlet',
            
      // Safety
      'smoke_detector': 'Smoke Detector',
      'water_leak_detector': 'Water Leak Sensor',
      'gas_detector': 'Gas Detector',
      'co_detector': 'CO Detector',
            
      // Lighting
      'bulb_rgb': 'RGB Bulb',
      'bulb_white': 'White Bulb',
      'led_strip': 'LED Strip',
      'ceiling_light': 'Ceiling Light',
            
      // Curtains
      'curtain_motor': 'Curtain Motor',
      'blind_motor': 'Blind Motor',
      'roller_shutter': 'Roller Shutter'
    };
        
    // Get clean name from map
    let cleanName = nameMap[driverId];
        
    if (!cleanName) {
      // Generate from driver ID if not in map
      cleanName = driverId
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
            
      // Remove common suffixes
      cleanName = cleanName.replace(/\s+(Ac|Dc|Battery|Hybrid)$/gi, '');
    }
        
    return this.sanitize(cleanName);
  }
    
  /**
     * Auto-sanitize device name after pairing
     * @param {Device} device - Homey device instance
     */
  static async autoSanitizeDeviceName(device) {
    try {
      const currentName = await device.getName();
      const sanitized = this.sanitize(currentName);
            
      if (currentName !== sanitized) {
        await device.setName(sanitized);
        device.log(`[SANITIZE] Name cleaned: "${currentName}" → "${sanitized}"`);
        return true;
      }
            
      return false;
    } catch (err) {
      device.error('[SANITIZE] Error sanitizing name:', err);
      return false;
    }
  }
    
  /**
     * Validate if name needs sanitization
     * @param {string} name - Device name
     * @returns {boolean} - True if needs cleaning
     */
  static needsSanitization(name) {
    if (!name || typeof name !== 'string') {
      return false;
    }
        
    const patterns = [
      /\(Hybrid\)/i,
      /\[Battery\]/i,
      /\[AC\]/i,
      /\[DC\]/i,
      /\(AC\/DC\)/i,
      /\s{2,}/,
      /\(\s*\)/,
      /\[\s*\]/
    ];
        
    return patterns.some(pattern => pattern.test(name));
  }
}

module.exports = TitleSanitizer;
