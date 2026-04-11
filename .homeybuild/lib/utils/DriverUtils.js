'use strict';

/**
 * DRIVER UTILITIES
 * Reusable functions based on discovered patterns and best practices
 */

const fs = require('fs');
const path = require('path');

class DriverUtils {
    
  // ============================================================
  // DISCOVERY 1: UNBRAND PATTERNS
  // ============================================================
    
  /**
     * Remove brand terminology from text
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     */
  static unbrandText(text) {
    if (!text || typeof text !== 'string') return text;
        
    const brandTerms = [
      /\s*\(Hybrid\)/gi,
      /\s*Hybrid\s*/gi,
      /\s*\(MOES\)/gi,
      /\s*MOES\s*/gi,
      /\s*\(Nedis\)/gi,
      /\s*Nedis\s*/gi,
      /\s*\(Ewelink\)/gi,
      /\s*Ewelink\s*/gi,
      /\s*\(Immax\)/gi,
      /\s*\(Lidl\)/gi,
      /\s*\(Bseed\)/gi,
      /\s*\(Tuya\)/gi
    ];
        
    let cleaned = text;
    brandTerms.forEach(term => {
      cleaned = cleaned.replace(term, '');
    });
        
    // Clean up spacing
    return cleaned.replace(/\s+/g, ' ').trim();
  }
    
  /**
     * Check if driver name follows unbranded conventions
     * @param {string} driverName - Driver folder name
     * @returns {boolean} True if unbranded
     */
  static isUnbranded(driverName) {
    const brandedPatterns = [
      /hybrid/i,
      /moes/i,
      /nedis/i,
      /ewelink/i,
      /immax/i,
      /lidl/i,
      /bseed/i
    ];
        
    return !brandedPatterns.some(pattern => pattern.test(driverName));
  }
    
  // ============================================================
  // DISCOVERY 2: TRANSLATION CLEANING
  // ============================================================
    
  /**
     * Clean translation labels (remove technical parentheses)
     * @param {string} label - Label to clean
     * @returns {string} Cleaned label
     */
  static cleanLabel(label) {
    if (!label || typeof label !== 'string') return label;
        
    let cleaned = label;
        
    // Keep descriptive parentheses
    const keepPatterns = [
      /\(More responsive\)/i,
      /\(Longer battery\)/i,
      /\(Plus réactif\)/i,
      /\(Batterie plus longue\)/i,
      /\(économie/i
    ];
        
    const shouldKeep = keepPatterns.some(pattern => pattern.test(cleaned));
        
    if (!shouldKeep) {
      // Remove technical parentheses
      cleaned = cleaned.replace(/\s*\([0-9.]+V[^\)]*\)/g, '');
      cleaned = cleaned.replace(/\s*\(%\)/g, '');
      cleaned = cleaned.replace(/\s*\(hours?\)/gi, '');
      cleaned = cleaned.replace(/\s*\(heures?\)/gi, '');
      cleaned = cleaned.replace(/\s*\(minutes?\)/gi, '');
      cleaned = cleaned.replace(/\s*\(seconds?\)/gi, '');
      cleaned = cleaned.replace(/\s*\(ms\)/gi, '');
    }
        
    return cleaned.replace(/\s+/g, ' ').trim();
  }
    
  /**
     * Clean battery type label
     * @param {string} label - Battery type label
     * @returns {string} Cleaned label
     */
  static cleanBatteryLabel(label) {
    if (!label || typeof label !== 'string') return label;
        
    // "CR2032 (3V Button Cell)" → "CR2032"
    return label.replace(/\s*\([0-9.]+V[^\)]*\)/g, '').trim();
  }
    
  // ============================================================
  // DISCOVERY 3: JSON VALIDATION
  // ============================================================
    
  /**
     * Fix JSON quotes (single → double)
     * @param {string} content - JSON content
     * @returns {string} Fixed content
     */
  static fixJsonQuotes(content) {
    if (!content || typeof content !== 'string') return content;
        
    // Fix single quotes in manufacturer IDs
    return content.replace(/'(_TZ[^']+)'/g, '"$1"');
  }
    
  /**
     * Validate and parse JSON safely
     * @param {string} content - JSON content
     * @returns {Object|null} Parsed object or null if invalid
     */
  static safeJsonParse(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }
    
  /**
     * Validate JSON file
     * @param {string} filePath - Path to JSON file
     * @returns {boolean} True if valid
     */
  static isValidJson(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      JSON.parse(content);
      return true;
    } catch (error) {
      return false;
    }
  }
    
  // ============================================================
  // DISCOVERY 4: CAPABILITY HARMONIZATION
  // ============================================================
    
  /**
     * Fix capability name (onoff.buttonX → onoff.gangX)
     * @param {string} capability - Capability name
     * @returns {string} Fixed capability name
     */
  static harmonizeCapability(capability) {
    if (!capability || typeof capability !== 'string') return capability;
        
    // Fix button → gang
    if (capability.startsWith('onoff.button')) {
      return capability.replace('onoff.button', 'onoff.gang');
    }
        
    return capability;
  }
    
  /**
     * Get gang count from capabilities array
     * @param {Array} capabilities - Capabilities array
     * @returns {number} Number of gangs
     */
  static getGangCount(capabilities) {
    if (!Array.isArray(capabilities)) return 1;
        
    const gangCaps = capabilities.filter(cap => 
      typeof cap === 'string' && cap.startsWith('onoff.gang')
    );
        
    return gangCaps.length + 1; // +1 for main onoff
  }
    
  /**
     * Validate multi-gang capabilities
     * @param {Array} capabilities - Capabilities array
     * @returns {Object} Validation result
     */
  static validateMultiGang(capabilities) {
    if (!Array.isArray(capabilities)) {
      return { valid: false, error: 'Capabilities not array' };
    }
        
    const hasMainOnoff = capabilities.includes('onoff');
    const gangCaps = capabilities.filter(cap => 
      typeof cap === 'string' && cap.startsWith('onoff.gang')
    );
        
    // Check for button capabilities (should be gang)
    const hasButtonCaps = capabilities.some(cap =>
      typeof cap === 'string' && cap.startsWith('onoff.button')
    );
        
    if (hasButtonCaps) {
      return { 
        valid: false, 
        error: 'Use onoff.gangX not onoff.buttonX',
        fix: 'Replace onoff.button with onoff.gang'
      };
    }
        
    if (gangCaps.length > 0 && !hasMainOnoff) {
      return {
        valid: false,
        error: 'Multi-gang requires main onoff capability'
      };
    }
        
    return { valid: true, gangCount: gangCaps.length + 1 };
  }
    
  // ============================================================
  // DISCOVERY 5: NAMING CONVENTIONS
  // ============================================================
    
  /**
     * Parse driver name into components
     * @param {string} driverName - Driver folder name
     * @returns {Object} Parsed components
     */
  static parseDriverName(driverName) {
    const parts = driverName.split('_');
        
    return {
      category: parts[0],        // switch, plug, sensor, etc.
      type: parts[1],            // wall, touch, wireless, etc.
      gang: this.extractGangCount(driverName),
      variant: parts[parts.length - 1] // advanced, basic, alt, etc.
    };
  }
    
  /**
     * Extract gang count from driver name
     * @param {string} driverName - Driver folder name
     * @returns {number|null} Gang count or null
     */
  static extractGangCount(driverName) {
    const match = driverName.match(/(\d+)gang/);
    return match ? parseInt(match[1]) : null;
  }
    
  /**
     * Validate driver naming convention
     * @param {string} driverName - Driver folder name
     * @returns {Object} Validation result
     */
  static validateDriverName(driverName) {
    const rules = {
      noSpaces: !driverName.includes(' '),
      lowercase: driverName === driverName.toLowerCase(),
      underscores: driverName.includes('_'),
      noHybrid: !driverName.includes('hybrid'),
      noBrands: !/(moes|nedis|ewelink|immax|lidl|bseed)/i.test(driverName)
    };
        
    const valid = Object.values(rules).every(r => r);
    const violations = Object.keys(rules).filter(k => !rules[k]);
        
    return {
      valid,
      violations,
      rules
    };
  }
    
  // ============================================================
  // DISCOVERY 6: PATH MANAGEMENT
  // ============================================================
    
  /**
     * Update paths after driver rename
     * @param {string} oldName - Old driver name
     * @param {string} newName - New driver name
     * @param {string} content - File content
     * @returns {string} Updated content
     */
  static updatePaths(oldName, newName, content) {
    if (!content || typeof content !== 'string') return content;
        
    let updated = content;
        
    // Update all path patterns
    const patterns = [
      { from: new RegExp(`/drivers/${oldName}/`, 'g'), to: `/drivers/${newName}/` },
      { from: new RegExp(`drivers/${oldName}/`, 'g'), to: `drivers/${newName}/` },
      { from: new RegExp(`"${oldName}"`, 'g'), to: `"${newName}"` },
      { from: new RegExp(`driver_id=${oldName}`, 'g'), to: `driver_id=${newName}` }
    ];
        
    patterns.forEach(({ from, to }) => {
      updated = updated.replace(from, to);
    });
        
    return updated;
  }
    
  // ============================================================
  // DISCOVERY 7: ARCHITECTURE VALIDATION
  // ============================================================
    
  /**
     * Validate driver directory structure
     * @param {string} driverPath - Path to driver directory
     * @returns {Object} Validation result
     */
  static validateDriverStructure(driverPath) {
    const required = {
      'driver.compose.json': fs.existsSync(path.join(driverPath, 'driver.compose.json')),
      'device.js': fs.existsSync(path.join(driverPath, 'device.js')),
      'assets/images': fs.existsSync(path.join(driverPath, 'assets', 'images'))
    };
        
    const optional = {
      'driver.js': fs.existsSync(path.join(driverPath, 'driver.js')),
      'pair': fs.existsSync(path.join(driverPath, 'pair')),
      'driver.flow.compose.json': fs.existsSync(path.join(driverPath, 'driver.flow.compose.json'))
    };
        
    const missingRequired = Object.keys(required).filter(k => !required[k]);
    const valid = missingRequired.length === 0;
        
    return {
      valid,
      required,
      optional,
      missingRequired
    };
  }
    
  /**
     * Get driver compose JSON
     * @param {string} driverPath - Path to driver directory
     * @returns {Object|null} Parsed JSON or null
     */
  static getDriverCompose(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return null;
        
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }
    
  /**
     * Save driver compose JSON
     * @param {string} driverPath - Path to driver directory
     * @param {Object} data - Data to save
     * @returns {boolean} Success
     */
  static saveDriverCompose(driverPath, data) {
    const composePath = path.join(driverPath, 'driver.compose.json');
        
    try {
      fs.writeFileSync(composePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      return false;
    }
  }
    
  // ============================================================
  // DISCOVERY 8: MANUFACTURER IDS
  // ============================================================
    
  /**
     * Validate manufacturer ID format
     * @param {string} id - Manufacturer ID
     * @returns {boolean} True if valid
     */
  static isValidManufacturerId(id) {
    if (!id || typeof id !== 'string') return false;
        
    // Valid patterns: _TZ3000_xxx, _TZE200_xxx, etc.
    return /^_TZ[A-Z0-9]{4}_[a-z0-9]{8}$/.test(id);
  }
    
  /**
     * Extract unique manufacturer IDs
     * @param {Array} ids - Array of IDs
     * @returns {Array} Unique IDs
     */
  static uniqueManufacturerIds(ids) {
    if (!Array.isArray(ids)) return [];
    return [...new Set(ids.filter(id => this.isValidManufacturerId(id)))];
  }
    
  // ============================================================
  // DISCOVERY 9: FLOW CARDS
  // ============================================================
    
  /**
     * Generate flow card ID
     * @param {string} driverName - Driver name
     * @param {string} capability - Capability name
     * @param {string} action - Action (turned_on, turned_off, etc.)
     * @returns {string} Flow card ID
     */
  static generateFlowCardId(driverName, capability, action) {
    return `${driverName}_${capability}_${action}`;
  }
    
  /**
     * Parse flow card ID
     * @param {string} flowCardId - Flow card ID
     * @returns {Object} Parsed components
     */
  static parseFlowCardId(flowCardId) {
    const parts = flowCardId.split('_');
        
    return {
      driverName: parts.slice(0, -2).join('_'),
      capability: parts[parts.length - 2],
      action: parts[parts.length - 1]
    };
  }
    
  // ============================================================
  // UTILITIES
  // ============================================================
    
  /**
     * Clean cache directories
     * @param {string} appPath - Path to app root
     * @returns {Array} Cleaned directories
     */
  static cleanCache(appPath) {
    const cacheDirs = [
      '.homeycompose',
      '.homeybuild',
      path.join('assets', 'drivers.json')
    ];
        
    const cleaned = [];
        
    cacheDirs.forEach(dir => {
      const fullPath = path.join(appPath, dir);
      if (fs.existsSync(fullPath)) {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
          cleaned.push(dir);
        } catch (error) {
          // Ignore errors
        }
      }
    });
        
    return cleaned;
  }
    
  /**
     * Backup file
     * @param {string} filePath - File to backup
     * @returns {string|null} Backup path or null
     */
  static backupFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
        
    const timestamp = Date.now();
    const backupPath = `${filePath}.backup.${timestamp}`;
        
    try {
      fs.copyFileSync(filePath, backupPath);
      return backupPath;
    } catch (error) {
      return null;
    }
  }
}

module.exports = DriverUtils;
