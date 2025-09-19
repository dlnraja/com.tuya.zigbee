#!/usr/bin/env node
/**
 * HOMEY GUIDELINES COMPLIANCE FIXER
 * Addresses all Homey rejection points systematically
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 HOMEY GUIDELINES COMPLIANCE FIXER');
console.log('=====================================');

// Fix app name compliance (max 4 words, no protocol names)
function fixAppName() {
    console.log('📝 Fixing app name compliance...');
    
    const composeFile = '.homeycompose/app.json';
    if (!fs.existsSync(composeFile)) {
        console.error('❌ .homeycompose/app.json not found');
        return;
    }
    
    const data = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    
    // Compliant name: "Tuya Universal" (2 words, no protocol)
    data.name.en = "Tuya Universal";
    
    // User-friendly description (what it does, not how)
    data.description.en = "Connect generic and unbranded Tuya devices to your smart home. Community-maintained app with active updates for devices without dedicated support.";
    
    // Ensure proper version increment
    data.version = "1.0.32";
    
    fs.writeFileSync(composeFile, JSON.stringify(data, null, 2));
    console.log('✅ App name fixed: "Tuya Universal"');
    console.log('✅ Description made user-friendly');
    console.log('✅ Version set to 1.0.32');
}

// Create proper README (not markdown heavy)
function createReadme() {
    console.log('📄 Creating guidelines-compliant README...');
    
    const readme = `
Tuya Universal connects generic and unbranded Tuya devices to your Homey smart home system.

This community-maintained app provides active support for Tuya devices that don't have dedicated apps, ensuring your smart home works with white-label and no-name Zigbee devices.

Features:
- Support for 500+ generic Tuya devices
- Regular updates with new device compatibility
- Local Zigbee communication (no cloud required)
- Professional driver categorization
- Multi-language support

Perfect for users with generic smart switches, sensors, lights, and other Tuya-based devices from various manufacturers.
`;
    
    fs.writeFileSync('README.txt', readme.trim());
    console.log('✅ README.txt created (guidelines compliant)');
}

// Clean project structure
function cleanProjectStructure() {
    console.log('🧹 Cleaning project structure...');
    
    // Remove .homeycompose before each operation (as requested)
    if (fs.existsSync('.homeybuild')) {
        fs.rmSync('.homeybuild', { recursive: true, force: true });
        console.log('✅ .homeybuild cleaned');
    }
}

// Main execution
function main() {
    try {
        cleanProjectStructure();
        fixAppName();
        createReadme();
        
        console.log('\n🎉 GUIDELINES COMPLIANCE COMPLETED');
        console.log('Next: Run driver reorganization and unbranding');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
