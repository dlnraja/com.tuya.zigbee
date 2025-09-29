#!/usr/bin/env node

/**
 * OTA Validator - Validates firmware files before deployment
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class OTAValidator {
    async validateFirmwareFile(filePath, expectedChecksum) {
        // Validate file exists and size
        const stats = await fs.stat(filePath);
        if (stats.size > 50 * 1024 * 1024) {
            throw new Error('Firmware file too large (>50MB)');
        }
        
        // Validate checksum
        const content = await fs.readFile(filePath);
        const actualChecksum = crypto.createHash('sha256').update(content).digest('hex');
        
        if (expectedChecksum && actualChecksum !== expectedChecksum) {
            throw new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
        }
        
        return {
            valid: true,
            size: stats.size,
            checksum: actualChecksum
        };
    }
    
    async validateManufacturerCompatibility(firmwareFile, deviceManufacturer) {
        // Check if firmware is compatible with device manufacturer
        const filename = path.basename(firmwareFile).toLowerCase();
        const manufacturer = deviceManufacturer.toLowerCase();
        
        const compatibilityRules = {
            'tuya': ['tuya', 'ts0', 'tze', '_tz'],
            'moes': ['moes', 'zm-'],
            'onenuo': ['onenuo', 'smoke']
        };
        
        const rules = compatibilityRules[manufacturer] || [];
        const isCompatible = rules.some(rule => filename.includes(rule));
        
        if (!isCompatible) {
            throw new Error(`Firmware ${filename} not compatible with ${deviceManufacturer}`);
        }
        
        return true;
    }
}

module.exports = OTAValidator;