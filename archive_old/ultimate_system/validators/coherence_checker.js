#!/usr/bin/env node
/**
 * 🔍 Coherence Checker - Validate Driver Categories & IDs
 * Ensures drivers match their folder names and have unique manufacturer IDs
 */

const fs = require('fs');
const path = require('path');

class CoherenceChecker {
  constructor() {
    this.issues = [];
    this.manufacturerMap = new Map();
  }

  checkDriverCoherence() {
    console.log('🔍 Starting Coherence Check...');
    const driversDir = './drivers';
    
    fs.readdirSync(driversDir).forEach(driverName => {
      this.validateDriver(driverName);
    });

    this.generateReport();
    return this.issues.length === 0;
  }

  validateDriver(driverName) {
    const composePath = path.join('./drivers', driverName, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
      this.issues.push(`❌ Missing driver.compose.json: ${driverName}`);
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      // Check manufacturer ID uniqueness
      if (data.zigbee && data.zigbee.manufacturerName) {
        data.zigbee.manufacturerName.forEach(mfgId => {
          if (this.manufacturerMap.has(mfgId)) {
            this.issues.push(`⚠️ Duplicate manufacturer ID: ${mfgId} in ${driverName} and ${this.manufacturerMap.get(mfgId)}`);
          } else {
            this.manufacturerMap.set(mfgId, driverName);
          }
        });
      }

      // Validate folder name vs device type coherence
      this.validateCategoryCoherence(driverName, data);
      
    } catch (error) {
      this.issues.push(`❌ Invalid JSON in ${driverName}: ${error.message}`);
    }
  }

  validateCategoryCoherence(driverName, data) {
    const name = driverName.toLowerCase();
    const expectedCategories = {
      motion: ['motion', 'pir', 'sensor'],
      switch: ['switch'],
      plug: ['plug', 'socket'],
      curtain: ['curtain', 'blind'],
      climate: ['climate', 'temp', 'humidity'],
      contact: ['contact', 'door', 'window']
    };

    let matchFound = false;
    Object.keys(expectedCategories).forEach(category => {
      if (expectedCategories[category].some(keyword => name.includes(keyword))) {
        matchFound = true;
      }
    });

    if (!matchFound) {
      this.issues.push(`⚠️ Category mismatch: ${driverName} doesn't match expected patterns`);
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalIssues: this.issues.length,
      issues: this.issues,
      uniqueManufacturers: this.manufacturerMap.size,
      status: this.issues.length === 0 ? 'PASS' : 'FAIL'
    };

    const reportPath = './ultimate_system/reports/coherence_report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Coherence Report: ${this.issues.length} issues found`);
    return report;
  }
}

module.exports = CoherenceChecker;
