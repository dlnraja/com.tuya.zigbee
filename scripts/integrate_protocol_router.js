#!/usr/bin/env node
'use strict';

/**
 * INTEGRATE PROTOCOL ROUTER INTO BASE HYBRID DEVICE
 * 
 * This script intelligently integrates the IntelligentProtocolRouter
 * into BaseHybridDevice.js to enable automatic protocol detection.
 * 
 * Changes:
 * 1. Add IntelligentProtocolRouter import
 * 2. Initialize router in onNodeInit
 * 3. Detect protocol after Tuya EF00 check
 * 4. Route onOff capability commands through router
 * 5. Add protocol diagnostics
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE_DEVICE_PATH = path.join(ROOT, 'lib', 'BaseHybridDevice.js');

console.log('🔧 INTEGRATING PROTOCOL ROUTER INTO BASEHYBRIDDEVICE');
console.log('═══════════════════════════════════════════════════\n');

// Read current BaseHybridDevice
let content = fs.readFileSync(BASE_DEVICE_PATH, 'utf8');

// Backup
const backupPath = BASE_DEVICE_PATH + '.backup-router-integration';
fs.writeFileSync(backupPath, content, 'utf8');
console.log(`✅ Backup created: ${backupPath}\n`);

// ============================================================================
// STEP 1: Add Import
// ============================================================================

console.log('📦 Step 1: Adding IntelligentProtocolRouter import...');

const importSection = `const IASZoneManager = require('./IASZoneManager');
const MultiEndpointManager = require('./MultiEndpointManager');
const TuyaEF00Manager = require('./TuyaEF00Manager');`;

const newImportSection = `const IASZoneManager = require('./IASZoneManager');
const MultiEndpointManager = require('./MultiEndpointManager');
const TuyaEF00Manager = require('./TuyaEF00Manager');
const IntelligentProtocolRouter = require('./IntelligentProtocolRouter');`;

if (content.includes('IntelligentProtocolRouter')) {
  console.log('⚠️  IntelligentProtocolRouter already imported\n');
} else {
  content = content.replace(importSection, newImportSection);
  console.log('✅ Import added\n');
}

// ============================================================================
// STEP 2: Initialize Router in Constructor
// ============================================================================

console.log('🔧 Step 2: Initializing router in managers section...');

const managersInit = `      // Initialize managers (CRITICAL fixes from forum feedback)
      this.iasZoneManager = new IASZoneManager(this);
      this.multiEndpointManager = new MultiEndpointManager(this);
      this.tuyaEF00Manager = new TuyaEF00Manager(this);`;

const newManagersInit = `      // Initialize managers (CRITICAL fixes from forum feedback)
      this.iasZoneManager = new IASZoneManager(this);
      this.multiEndpointManager = new MultiEndpointManager(this);
      this.tuyaEF00Manager = new TuyaEF00Manager(this);
      this.protocolRouter = new IntelligentProtocolRouter(this);`;

if (content.includes('this.protocolRouter')) {
  console.log('⚠️  Protocol router already initialized\n');
} else {
  content = content.replace(managersInit, newManagersInit);
  console.log('✅ Router initialized\n');
}

// ============================================================================
// STEP 3: Detect Protocol After Tuya EF00
// ============================================================================

console.log('🔍 Step 3: Adding protocol detection after Tuya EF00...');

const tuyaEF00Section = `      // Step 4: Initialize Tuya EF00 (if applicable)
      this.log('[BACKGROUND] Step 3c/7: Checking Tuya EF00 support...');
      const hasTuyaEF00 = await this.tuyaEF00Manager.initialize(this.zclNode);
      if (hasTuyaEF00) {
        this.log('[BACKGROUND] ✅ Tuya EF00 manager initialized');
      } else {
        this.log('[BACKGROUND] ✅ Standard Zigbee device (Tuya EF00 not needed)');
      }`;

const newTuyaEF00Section = `      // Step 4: Initialize Tuya EF00 (if applicable)
      this.log('[BACKGROUND] Step 3c/7: Checking Tuya EF00 support...');
      const hasTuyaEF00 = await this.tuyaEF00Manager.initialize(this.zclNode);
      if (hasTuyaEF00) {
        this.log('[BACKGROUND] ✅ Tuya EF00 manager initialized');
      } else {
        this.log('[BACKGROUND] ✅ Standard Zigbee device (Tuya EF00 not needed)');
      }
      
      // Step 4b: INTELLIGENT PROTOCOL DETECTION (NEW)
      this.log('[BACKGROUND] Step 3c.1/7: Detecting optimal protocol...');
      try {
        const deviceData = this.getData();
        const manufacturerName = deviceData.manufacturerName || '';
        const protocol = await this.protocolRouter.detectProtocol(this.zclNode, manufacturerName);
        this.log(\`[PROTOCOL] ✅ Selected protocol: \${protocol}\`);
        
        // Log diagnostics
        const diagnostics = this.protocolRouter.getDiagnostics();
        this.log('[PROTOCOL] Diagnostics:', JSON.stringify(diagnostics, null, 2));
        
        // Store for later use
        this.selectedProtocol = protocol;
      } catch (err) {
        this.error('[PROTOCOL] Detection failed:', err);
        this.selectedProtocol = 'ZIGBEE_NATIVE'; // Safe fallback
      }`;

if (content.includes('INTELLIGENT PROTOCOL DETECTION')) {
  console.log('⚠️  Protocol detection already added\n');
} else {
  content = content.replace(tuyaEF00Section, newTuyaEF00Section);
  console.log('✅ Protocol detection added\n');
}

// ============================================================================
// STEP 4: Add Capability Listener Override
// ============================================================================

console.log('🎛️  Step 4: Adding onOff capability routing...');

// Find end of _runBackgroundInitialization and add new method
const endOfBackgroundInit = `      this._initializationComplete = true;
      this.log('[BACKGROUND] ✅ Background initialization complete!');
    } catch (err) {
      this.error('[BACKGROUND] ❌ Background initialization failed:', err);
      this.log('[BACKGROUND] Device will continue with safe defaults');
    }
  }`;

const newEndWithCapabilityMethod = `      this._initializationComplete = true;
      this.log('[BACKGROUND] ✅ Background initialization complete!');
    } catch (err) {
      this.error('[BACKGROUND] ❌ Background initialization failed:', err);
      this.log('[BACKGROUND] Device will continue with safe defaults');
    }
  }
  
  /**
   * Override onCapability_onoff to route through IntelligentProtocolRouter
   * This ensures BSEED and other Tuya DP devices work correctly
   */
  async onCapability_onoff(value, opts) {
    try {
      this.log('[ONOFF] Setting onoff to:', value);
      
      // If protocol router is ready and suggests Tuya DP
      if (this.protocolRouter && this.protocolRouter.isUsingTuyaDP()) {
        this.log('[ONOFF] Routing via Tuya DP protocol');
        if (value) {
          await this.protocolRouter.setOn(1); // Endpoint 1
        } else {
          await this.protocolRouter.setOff(1);
        }
      } else {
        // Standard Zigbee
        this.log('[ONOFF] Routing via standard Zigbee');
        const endpoint = this.zclNode?.endpoints?.[1];
        if (!endpoint || !endpoint.clusters?.onOff) {
          throw new Error('OnOff cluster not available');
        }
        
        if (value) {
          await endpoint.clusters.onOff.setOn();
        } else {
          await endpoint.clusters.onOff.setOff();
        }
      }
      
      this.log('[ONOFF] Successfully set to', value);
    } catch (err) {
      this.error('[ONOFF] Failed:', err);
      throw err;
    }
  }
  
  /**
   * Override for multi-gang switches (onoff.2, onoff.3, etc.)
   */
  async onCapability_onoff_multigang(value, opts, capabilityId) {
    try {
      // Extract gang number from capabilityId (e.g., "onoff.2" -> 2)
      const gangMatch = capabilityId.match(/onoff\\.(\\d+)/);
      const gang = gangMatch ? parseInt(gangMatch[1]) : 1;
      
      this.log('[ONOFF-GANG' + gang + '] Setting to:', value);
      
      // If protocol router suggests Tuya DP
      if (this.protocolRouter && this.protocolRouter.isUsingTuyaDP()) {
        this.log('[ONOFF-GANG' + gang + '] Routing via Tuya DP protocol');
        if (value) {
          await this.protocolRouter.setOn(gang);
        } else {
          await this.protocolRouter.setOff(gang);
        }
      } else {
        // Standard Zigbee with endpoint
        this.log('[ONOFF-GANG' + gang + '] Routing via Zigbee endpoint', gang);
        const endpoint = this.zclNode?.endpoints?.[gang];
        if (!endpoint || !endpoint.clusters?.onOff) {
          throw new Error('OnOff cluster not available on endpoint ' + gang);
        }
        
        if (value) {
          await endpoint.clusters.onOff.setOn();
        } else {
          await endpoint.clusters.onOff.setOff();
        }
      }
      
      this.log('[ONOFF-GANG' + gang + '] Successfully set to', value);
    } catch (err) {
      this.error('[ONOFF-GANG] Failed:', err);
      throw err;
    }
  }`;

if (content.includes('onCapability_onoff_multigang')) {
  console.log('⚠️  Capability methods already added\n');
} else {
  content = content.replace(endOfBackgroundInit, newEndWithCapabilityMethod);
  console.log('✅ Capability routing methods added\n');
}

// ============================================================================
// SAVE MODIFIED FILE
// ============================================================================

fs.writeFileSync(BASE_DEVICE_PATH, content, 'utf8');

console.log('═══════════════════════════════════════════════════');
console.log('✅ INTEGRATION COMPLETE!');
console.log('═══════════════════════════════════════════════════\n');

console.log('Changes applied:');
console.log('  ✅ IntelligentProtocolRouter imported');
console.log('  ✅ Router initialized in managers');
console.log('  ✅ Protocol detection after Tuya EF00');
console.log('  ✅ onCapability_onoff routing added');
console.log('  ✅ Multi-gang capability routing added\n');

console.log('Next steps:');
console.log('  1. Test with BSEED 2-gang switch');
console.log('  2. Test with TS0601 devices');
console.log('  3. Verify logs show protocol selection');
console.log('  4. Commit changes\n');

console.log('Backup available at:');
console.log(`  ${backupPath}\n`);
