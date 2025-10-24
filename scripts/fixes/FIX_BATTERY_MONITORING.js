#!/usr/bin/env node
/**
 * 🔧 FIX BATTERY MONITORING
 * 
 * Corrige l'erreur "expected_cluster_id_number" dans battery monitoring
 * Simplifie le battery monitoring pour éviter les erreurs
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const LIB_FILE = path.join(ROOT, 'lib', 'BaseHybridDevice.js');

console.log('🔧 FIX BATTERY MONITORING\n');

let content = fs.readFileSync(LIB_FILE, 'utf8');

// Le problème est dans la configuration du battery monitoring
// Simplifions en supprimant configureAttributeReporting qui cause l'erreur

const oldCode = `  async setupBatteryMonitoring() {
    this.log('🔋 Setting up battery monitoring...');
    
    try {
      // Configure battery reporting
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 1, // powerConfiguration
        attributeName: 'batteryPercentageRemaining',
        minInterval: 3600, // 1 hour
        maxInterval: 43200, // 12 hours
        minChange: 5 // 5% change
      }]).catch(err => {
        this.log('Battery reporting config failed (non-critical):', err.message);
      });
      
      // Register battery capability with intelligent parser`;

const newCode = `  async setupBatteryMonitoring() {
    this.log('🔋 Setting up battery monitoring...');
    
    try {
      // Register battery capability with intelligent parser`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(LIB_FILE, content, 'utf8');
  console.log('✅ Battery monitoring simplified\n');
  console.log('   Removed configureAttributeReporting (was causing errors)\n');
} else {
  console.log('⚠️  Code pattern not found - may already be fixed\n');
}
