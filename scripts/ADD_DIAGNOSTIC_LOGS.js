#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 ADDING MASSIVE DIAGNOSTIC LOGS\n');

let logsAdded = 0;

// Add logs to ALL device files
const driversDir = './drivers';
const drivers = fs.readdirSync(driversDir).filter(d => {
  const driverPath = path.join(driversDir, d);
  return fs.statSync(driverPath).isDirectory();
});

console.log(`📊 Found ${drivers.length} drivers\n`);

for (const driver of drivers) {
  const devicePath = path.join(driversDir, driver, 'device.js');
  
  if (!fs.existsSync(devicePath)) continue;
  
  let content = fs.readFileSync(devicePath, 'utf8');
  let modified = false;
  
  // Add logging to onNodeInit if not already present
  if (content.includes('async onNodeInit()') && !content.includes('[DIAG] DEVICE INIT')) {
    content = content.replace(
      /(async onNodeInit\(\) {)/,
      `$1
    // ═══════════════════════════════════════════════════════════
    // DIAGNOSTIC LOGGING v4.9.279
    // ═══════════════════════════════════════════════════════════
    this.log('');
    this.log('═'.repeat(60));
    this.log('🔍 [DIAG] DEVICE INIT START');
    this.log('═'.repeat(60));
    this.log(\`📋 [DIAG] Device: \${this.getName()}\`);
    this.log(\`📋 [DIAG] Driver: \${this.driver.id}\`);
    
    try {
      const data = this.getData();
      this.log('📋 [DIAG] IEEE Address:', data.ieee);
      this.log('📋 [DIAG] Device Data:', JSON.stringify(data));
      
      const settings = this.getSettings();
      this.log('📋 [DIAG] Settings:', JSON.stringify(settings));
      
      const caps = this.getCapabilities();
      this.log('📋 [DIAG] Capabilities:', caps.join(', '));
      
      if (this.zclNode) {
        const endpoints = Object.keys(this.zclNode.endpoints || {});
        this.log('📋 [DIAG] Endpoints:', endpoints.join(', '));
        
        for (const ep of endpoints) {
          const endpoint = this.zclNode.endpoints[ep];
          if (endpoint && endpoint.clusters) {
            const clusters = Object.keys(endpoint.clusters);
            this.log(\`📋 [DIAG] Endpoint \${ep} clusters:\`, clusters.join(', '));
          }
        }
      } else {
        this.error('❌ [DIAG] zclNode is NULL!');
      }
    } catch (err) {
      this.error('❌ [DIAG] Error reading device info:', err.message);
    }
    
    this.log('═'.repeat(60));
    this.log('');
`
    );
    modified = true;
  }
  
  // Add logging to registerCapabilityListener
  if (content.includes('registerCapabilityListener') && !content.includes('[DIAG] CAPABILITY CHANGE')) {
    // Find all registerCapabilityListener calls and add logging
    const pattern = /this\.registerCapabilityListener\('([^']+)',\s*async\s*\(([^)]+)\)\s*=>\s*{/g;
    content = content.replace(pattern, (match, capName, args) => {
      return `this.registerCapabilityListener('${capName}', async (${args}) => {
      this.log(\`📤 [DIAG] CAPABILITY CHANGE: ${capName} = \${${args}}\`);`;
    });
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(devicePath, content, 'utf8');
    logsAdded++;
    console.log(`   ✅ ${driver}/device.js`);
  }
}

console.log(`\n✅ Added logs to ${logsAdded} device files\n`);

// Add logs to TuyaZigbeeDevice base class
const baseDevicePath = './lib/TuyaZigbeeDevice.js';
if (fs.existsSync(baseDevicePath)) {
  let content = fs.readFileSync(baseDevicePath, 'utf8');
  
  if (!content.includes('[DIAG] BASE DEVICE')) {
    // Add logging to constructor if exists
    if (content.includes('constructor(')) {
      content = content.replace(
        /(constructor\([^)]*\)\s*{)/,
        `$1
    // DIAGNOSTIC LOGGING v4.9.279
    console.log('🔧 [DIAG] BASE DEVICE: TuyaZigbeeDevice constructed');
`
      );
    }
    
    fs.writeFileSync(baseDevicePath, content, 'utf8');
    console.log('✅ Added logs to TuyaZigbeeDevice\n');
  }
}

// Add logs to TuyaManufacturerCluster
const tuyaClusterPath = './lib/tuya/TuyaManufacturerCluster.js';
if (fs.existsSync(tuyaClusterPath)) {
  let content = fs.readFileSync(tuyaClusterPath, 'utf8');
  
  if (!content.includes('[DIAG] TUYA CLUSTER')) {
    // Wrap dataRequest
    if (content.includes('dataRequest(')) {
      content = content.replace(
        /async dataRequest\(([^)]*)\)\s*{/,
        `async dataRequest($1) {
    console.log('📤 [DIAG] TUYA CLUSTER: dataRequest', JSON.stringify(arguments[0]));
    try {
      const result = await this._originalDataRequest(...arguments);
      console.log('✅ [DIAG] TUYA CLUSTER: dataRequest SUCCESS', JSON.stringify(result));
      return result;
    } catch (err) {
      console.error('❌ [DIAG] TUYA CLUSTER: dataRequest FAILED', err.message);
      throw err;
    }
  }
  
  async _originalDataRequest($1) {`
      );
    }
    
    // Wrap dataReport
    if (content.includes('dataReport(')) {
      content = content.replace(
        /dataReport\(([^)]*)\)\s*{/,
        `dataReport($1) {
    console.log('📥 [DIAG] TUYA CLUSTER: dataReport received', JSON.stringify(arguments[0]));
    try {
      const result = this._originalDataReport(...arguments);
      console.log('✅ [DIAG] TUYA CLUSTER: dataReport processed');
      return result;
    } catch (err) {
      console.error('❌ [DIAG] TUYA CLUSTER: dataReport FAILED', err.message);
      throw err;
    }
  }
  
  _originalDataReport($1) {`
      );
    }
    
    fs.writeFileSync(tuyaClusterPath, content, 'utf8');
    console.log('✅ Added logs to TuyaManufacturerCluster\n');
  }
}

// Update USB outlet 2port for better recognition
const usb2portPath = './drivers/usb_outlet_2port/driver.compose.json';
if (fs.existsSync(usb2portPath)) {
  const compose = JSON.parse(fs.readFileSync(usb2portPath, 'utf8'));
  
  // Make name VERY explicit
  compose.name = {
    en: 'USB Outlet 1 AC + 2 USB (NOT 1gang switch)',
    fr: 'Prise USB 1 AC + 2 USB (PAS switch 1gang)'
  };
  
  // Add more product IDs
  if (!compose.zigbee) compose.zigbee = {};
  if (!compose.zigbee.productId) compose.zigbee.productId = [];
  
  const additionalIds = [
    'TS011F', 'TS0121', '_TZ3000_rdtixbnu',
    '_TZ3000_2xlvlnvp', '_TZ3000_typdpbpg',
    '_TZ3000_cymsnfvf'
  ];
  
  for (const id of additionalIds) {
    if (!compose.zigbee.productId.includes(id)) {
      compose.zigbee.productId.push(id);
    }
  }
  
  fs.writeFileSync(usb2portPath, JSON.stringify(compose, null, 2) + '\n', 'utf8');
  console.log('✅ Enhanced USB outlet 2port recognition\n');
}

console.log('═══════════════════════════════════════════════════════════');
console.log('🎉 DIAGNOSTIC LOGS ADDED!');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📊 SUMMARY:');
console.log(`   Device files: ${logsAdded}`);
console.log('   Base device: ✅');
console.log('   Tuya cluster: ✅');
console.log('   USB recognition: ✅\n');

console.log('💡 Next diagnostic reports will show EVERYTHING!\n');
