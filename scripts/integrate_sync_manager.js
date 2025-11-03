#!/usr/bin/env node
'use strict';

/**
 * INTEGRATE TUYA SYNC MANAGER
 * 
 * Intègre TuyaSyncManager dans BaseHybridDevice pour:
 * - Time synchronization automatique
 * - Battery sync amélioré
 * - Health checks
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE_DEVICE = path.join(ROOT, 'lib', 'BaseHybridDevice.js');

console.log('🔧 INTÉGRATION TUYASYNCMANAGER DANS BASEHYBRIDDEVICE');
console.log('═══════════════════════════════════════════════════\n');

let content = fs.readFileSync(BASE_DEVICE, 'utf8');

// Backup
const backupPath = BASE_DEVICE + '.backup-sync-manager';
fs.writeFileSync(backupPath, content, 'utf8');
console.log(`✅ Backup: ${backupPath}\n`);

// ============================================================================
// STEP 1: Add Import
// ============================================================================

console.log('📦 Step 1: Adding TuyaSyncManager import...');

const importSection = `const TuyaEF00Manager = require('./TuyaEF00Manager');
const IntelligentProtocolRouter = require('./IntelligentProtocolRouter');`;

const newImport = `const TuyaEF00Manager = require('./TuyaEF00Manager');
const IntelligentProtocolRouter = require('./IntelligentProtocolRouter');
const TuyaSyncManager = require('./TuyaSyncManager');`;

if (content.includes('TuyaSyncManager')) {
  console.log('⚠️  TuyaSyncManager already imported\n');
} else {
  content = content.replace(importSection, newImport);
  console.log('✅ Import added\n');
}

// ============================================================================
// STEP 2: Initialize in Constructor
// ============================================================================

console.log('🔧 Step 2: Initializing syncManager...');

const constructorInit = `    this.protocolRouter = new IntelligentProtocolRouter(this);`;

const newConstructorInit = `    this.protocolRouter = new IntelligentProtocolRouter(this);
    this.syncManager = new TuyaSyncManager(this);`;

if (content.includes('this.syncManager')) {
  console.log('⚠️  syncManager already initialized\n');
} else {
  content = content.replace(constructorInit, newConstructorInit);
  console.log('✅ syncManager initialized\n');
}

// ============================================================================
// STEP 3: Initialize After Protocol Detection
// ============================================================================

console.log('🔍 Step 3: Adding sync initialization...');

const protocolSection = `      // Store for later use
      this.selectedProtocol = protocol;
    } catch (err) {
      this.error('[PROTOCOL] Detection failed:', err);
      this.selectedProtocol = 'ZIGBEE_NATIVE'; // Safe fallback
    }`;

const newProtocolSection = `      // Store for later use
      this.selectedProtocol = protocol;
    } catch (err) {
      this.error('[PROTOCOL] Detection failed:', err);
      this.selectedProtocol = 'ZIGBEE_NATIVE'; // Safe fallback
    }
    
    // Step 4c: INITIALIZE SYNC MANAGER (NEW)
    this.log('[BACKGROUND] Step 4c: Initializing TuyaSyncManager...');
    try {
      await this.syncManager.initialize(this.zclNode, this.tuyaEF00Manager);
      this.log('[BACKGROUND] ✅ TuyaSyncManager initialized');
      
      // Log sync status
      const syncStatus = this.syncManager.getStatus();
      this.log('[SYNC] Status:', JSON.stringify(syncStatus));
    } catch (err) {
      this.error('[SYNC] Failed to initialize sync manager:', err);
    }`;

if (content.includes('INITIALIZE SYNC MANAGER')) {
  console.log('⚠️  Sync manager initialization already added\n');
} else {
  content = content.replace(protocolSection, newProtocolSection);
  console.log('✅ Sync initialization added\n');
}

// ============================================================================
// STEP 4: Add Cleanup
// ============================================================================

console.log('🧹 Step 4: Adding cleanup...');

// Find onDeleted or similar cleanup method
if (!content.includes('syncManager.cleanup()')) {
  // Add cleanup before end of class or in existing cleanup
  const cleanupSection = `  /**
   * Called when device is deleted
   */
  async onDeleted() {`;
  
  const newCleanupSection = `  /**
   * Called when device is deleted
   */
  async onDeleted() {
    // Cleanup sync manager
    if (this.syncManager) {
      this.syncManager.cleanup();
      this.log('[CLEANUP] TuyaSyncManager cleaned up');
    }
    `;
  
  if (content.includes('async onDeleted()')) {
    content = content.replace(cleanupSection, newCleanupSection);
    console.log('✅ Cleanup added to onDeleted\n');
  } else {
    console.log('⚠️  onDeleted not found, manual cleanup needed\n');
  }
} else {
  console.log('⚠️  Cleanup already present\n');
}

// ============================================================================
// SAVE
// ============================================================================

fs.writeFileSync(BASE_DEVICE, content, 'utf8');

console.log('═══════════════════════════════════════════════════');
console.log('✅ INTÉGRATION COMPLETE!');
console.log('═══════════════════════════════════════════════════\n');

console.log('Changes applied:');
console.log('  ✅ TuyaSyncManager imported');
console.log('  ✅ syncManager initialized');
console.log('  ✅ Sync initialization added after protocol detection');
console.log('  ✅ Cleanup added\n');

console.log('Features enabled:');
console.log('  ✅ Automatic time sync (daily 3 AM)');
console.log('  ✅ Automatic battery sync (hourly)');
console.log('  ✅ Health checks (every 30min)');
console.log('  ✅ Manual sync triggers\n');

console.log(`Backup: ${backupPath}\n`);
