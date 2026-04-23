'use strict';

/**
 * DRIVER UTILITIES
 * Reusable functions based on discovered patterns and best practices
 */

const fs = require('fs');
const path = require('path');

class DriverUtils {
    
  /**
     * Remove brand terminology from text
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     */
  static unbrandText(text) {
    if (!text || typeof text !== 'string') return text;
        
    const brandTerms = [
      /\s*Hybrid\s*/gi, /\s*MOES\s*/gi, /\s*Nedis\s*/gi,
      /\s*Ewelink\s*/gi, /\s*Immax\s*/gi, /\s*Lidl\s*/gi,
      /\s*Bseed\s*/gi, /\s*Tuya\s*/gi
    ];
        
    let cleaned = text;
    brandTerms.forEach(term => {
      cleaned = cleaned.replace(term, '');
    });
        
    return cleaned.replace(/\s+/g, ' ').trim();
  }
    
  static isUnbranded(driverName) {
    const brandedPatterns = [/hybrid/i, /moes/i, /nedis/i, /ewelink/i, /immax/i, /lidl/i, /bseed/i];
    return !brandedPatterns.some(pattern => pattern.test(driverName));
  }
    
  static cleanLabel(label) {
    if (!label || typeof label !== 'string') return label;
    let cleaned = label;
    const keepPatterns = [/\(More responsive\)/i, /\(Longer battery\)/i];
    const shouldKeep = keepPatterns.some(pattern => pattern.test(cleaned));
        
    if (!shouldKeep) {
      cleaned = cleaned.replace(/\s*\([0-9.]+V[^\)]*\)/g, '');
      cleaned = cleaned.replace(/\s*\(%\)/g, '');
    }
    return cleaned.replace(/\s+/g, ' ').trim();
  }
    
  static safeJsonParse(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }
    
  static extractGangCount(driverName) {
    if (!driverName) return null;
    const match = driverName.match(/(\d+)gang/);
    return match ? (parseInt(match[1], 10) || null) : null;
  }
    
  static validateDriverName(driverName) {
    const rules = {
      noSpaces: !driverName.includes(' '),
      lowercase: driverName === driverName.toLowerCase(),
      noBrands: !/(moes|nedis|ewelink|immax|lidl|bseed)/i.test(driverName)
    };
    return { valid: Object.values(rules).every(r => r), rules };
  }

  static cleanCache(appPath) {
    const cacheDirs = ['.homeycompose', '.homeybuild'];
    const cleaned = [];
    cacheDirs.forEach(dir => {
      const fullPath = path.join(appPath, dir);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        cleaned.push(dir);
      }
    });
    return cleaned;
  }
}

module.exports = DriverUtils;
