#!/usr/bin/env node
'use strict';

/**
 * 🧠 SMART HOMEY MONITOR
 * Multi-channel intelligent diagnostic system
 * - Real-time log streaming via Homey CLI
 * - Automatic error detection & categorization
 * - Auto-fix suggestions
 * - Diagnostic report generation
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class SmartHomeyMonitor {
  constructor() {
    this.errors = new Map();
    this.devices = new Map();
    this.logFile = path.join(__dirname, '..', 'diagnostic-reports', `diag-${Date.now()}.json`);
    this.startTime = Date.now();
    
    // Error patterns to detect
    this.errorPatterns = [
      { 
        pattern: /expected_cluster_id_number/i, 
        severity: 'CRITICAL',
        category: 'CLUSTER_ID',
        fix: 'Use CLUSTER.* constants instead of string literals'
      },
      { 
        pattern: /Invalid Flow Card ID/i, 
        severity: 'CRITICAL',
        category: 'FLOW_CARD',
        fix: 'Define flow card in app.json or remove registration'
      },
      { 
        pattern: /Does not exist \(.*Cluster\)/i, 
        severity: 'HIGH',
        category: 'CLUSTER_MISSING',
        fix: 'Check cluster presence before configureReporting'
      },
      { 
        pattern: /Zigbee est en cours de démarrage/i, 
        severity: 'HIGH',
        category: 'TIMING',
        fix: 'Add initialization delay before Zigbee operations'
      },
      { 
        pattern: /Could not read battery/i, 
        severity: 'MEDIUM',
        category: 'BATTERY',
        fix: 'Retry battery read with delay or check powerConfiguration cluster'
      },
      { 
        pattern: /reporting failed/i, 
        severity: 'MEDIUM',
        category: 'REPORTING',
        fix: 'Check if attribute exists before configureReporting'
      },
      { 
        pattern: /MODULE_NOT_FOUND/i, 
        severity: 'CRITICAL',
        category: 'MODULE',
        fix: 'Add missing module or add try-catch for graceful fallback'
      },
      { 
        pattern: /Timeout.*Expected Response/i, 
        severity: 'MEDIUM',
        category: 'TIMEOUT',
        fix: 'Increase timeout or add retry logic'
      }
    ];
  }

  async init() {
    console.log('🧠 Smart Homey Monitor Initializing...\n');
    
    // Ensure diagnostic reports directory exists
    const reportsDir = path.dirname(this.logFile);
    await fs.mkdir(reportsDir, { recursive: true });
    
    console.log(`📊 Monitoring started at: ${new Date().toLocaleString()}`);
    console.log(`📝 Log file: ${this.logFile}\n`);
    console.log('━'.repeat(80));
    console.log('🔍 WATCHING FOR ERRORS...\n');
  }

  /**
   * Start monitoring Homey app
   */
  async start() {
    await this.init();
    
    // Start homey app run in background
    const homeyProcess = spawn('homey', ['app', 'run'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Stream stdout
    homeyProcess.stdout.on('data', (data) => {
      this.processLog(data.toString(), 'INFO');
    });

    // Stream stderr
    homeyProcess.stderr.on('data', (data) => {
      this.processLog(data.toString(), 'ERROR');
    });

    // Handle process exit
    homeyProcess.on('close', (code) => {
      console.log(`\n━`.repeat(80));
      console.log(`\n📊 Monitoring ended. Exit code: ${code}`);
      this.generateReport();
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Monitor stopped by user');
      homeyProcess.kill();
      this.generateReport();
      process.exit(0);
    });
  }

  /**
   * Process each log line
   */
  processLog(text, level) {
    const lines = text.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      // Print line
      this.printColorized(line, level);
      
      // Check for errors
      this.detectErrors(line);
      
      // Extract device info
      this.extractDeviceInfo(line);
    }
  }

  /**
   * Detect errors using patterns
   */
  detectErrors(line) {
    for (const { pattern, severity, category, fix } of this.errorPatterns) {
      if (pattern.test(line)) {
        const errorKey = `${category}_${line.substring(0, 100)}`;
        
        if (!this.errors.has(errorKey)) {
          const error = {
            category,
            severity,
            message: line,
            fix,
            count: 1,
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString()
          };
          
          this.errors.set(errorKey, error);
          
          // Print alert
          console.log('\n' + '⚠️ '.repeat(40));
          console.log(`🚨 ${severity} ERROR DETECTED: ${category}`);
          console.log(`📝 ${line}`);
          console.log(`💡 FIX: ${fix}`);
          console.log('⚠️ '.repeat(40) + '\n');
        } else {
          // Update count
          const error = this.errors.get(errorKey);
          error.count++;
          error.lastSeen = new Date().toISOString();
        }
        
        break;
      }
    }
  }

  /**
   * Extract device information from logs
   */
  extractDeviceInfo(line) {
    // Extract device names and types
    const deviceMatch = line.match(/\[(.*?)\]/);
    if (deviceMatch) {
      const deviceName = deviceMatch[1];
      if (!this.devices.has(deviceName)) {
        this.devices.set(deviceName, {
          name: deviceName,
          events: [],
          errors: 0,
          firstSeen: new Date().toISOString()
        });
      }
      
      const device = this.devices.get(deviceName);
      device.events.push({
        time: new Date().toISOString(),
        message: line
      });
      
      // Check if error
      if (line.toLowerCase().includes('error') || line.includes('❌')) {
        device.errors++;
      }
    }
  }

  /**
   * Print colorized output
   */
  printColorized(line, level) {
    const timestamp = new Date().toLocaleTimeString();
    
    // Colorize based on content
    if (line.includes('✅') || line.includes('SUCCESS')) {
      console.log(`\x1b[32m[${timestamp}] ${line}\x1b[0m`);
    } else if (line.includes('❌') || line.includes('ERROR') || level === 'ERROR') {
      console.log(`\x1b[31m[${timestamp}] ${line}\x1b[0m`);
    } else if (line.includes('⚠️') || line.includes('WARN')) {
      console.log(`\x1b[33m[${timestamp}] ${line}\x1b[0m`);
    } else if (line.includes('🔍') || line.includes('DEBUG')) {
      console.log(`\x1b[36m[${timestamp}] ${line}\x1b[0m`);
    } else {
      console.log(`[${timestamp}] ${line}`);
    }
  }

  /**
   * Generate diagnostic report
   */
  async generateReport() {
    const duration = Date.now() - this.startTime;
    
    const report = {
      generated: new Date().toISOString(),
      duration: `${Math.round(duration / 1000)}s`,
      summary: {
        totalErrors: this.errors.size,
        totalDevices: this.devices.size,
        criticalErrors: Array.from(this.errors.values()).filter(e => e.severity === 'CRITICAL').length,
        highErrors: Array.from(this.errors.values()).filter(e => e.severity === 'HIGH').length,
        mediumErrors: Array.from(this.errors.values()).filter(e => e.severity === 'MEDIUM').length
      },
      errors: Array.from(this.errors.entries()).map(([key, error]) => ({
        id: key,
        ...error
      })),
      devices: Array.from(this.devices.entries()).map(([key, device]) => ({
        ...device,
        eventCount: device.events.length
      })),
      recommendations: this.generateRecommendations()
    };

    // Save report
    await fs.writeFile(this.logFile, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n━'.repeat(80));
    console.log('\n📊 DIAGNOSTIC REPORT SUMMARY\n');
    console.log(`Duration: ${report.duration}`);
    console.log(`Total Errors: ${report.summary.totalErrors}`);
    console.log(`  🔴 Critical: ${report.summary.criticalErrors}`);
    console.log(`  🟠 High: ${report.summary.highErrors}`);
    console.log(`  🟡 Medium: ${report.summary.mediumErrors}`);
    console.log(`Total Devices: ${report.summary.totalDevices}\n`);
    
    if (report.errors.length > 0) {
      console.log('🔥 TOP ERRORS:\n');
      report.errors
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .forEach((error, i) => {
          console.log(`${i + 1}. [${error.severity}] ${error.category} (${error.count}x)`);
          console.log(`   💡 ${error.fix}\n`);
        });
    }
    
    console.log(`📝 Full report saved to: ${this.logFile}\n`);
    console.log('━'.repeat(80));
  }

  /**
   * Generate fix recommendations based on errors
   */
  generateRecommendations() {
    const recommendations = [];
    
    const errorsByCategory = new Map();
    for (const error of this.errors.values()) {
      if (!errorsByCategory.has(error.category)) {
        errorsByCategory.set(error.category, []);
      }
      errorsByCategory.get(error.category).push(error);
    }
    
    // Generate recommendations per category
    for (const [category, errors] of errorsByCategory) {
      const totalCount = errors.reduce((sum, e) => sum + e.count, 0);
      recommendations.push({
        category,
        priority: errors[0].severity,
        occurrences: totalCount,
        fix: errors[0].fix,
        affectedDevices: errors.length
      });
    }
    
    return recommendations.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return severityOrder[a.priority] - severityOrder[b.priority];
    });
  }
}

// Start monitoring
const monitor = new SmartHomeyMonitor();
monitor.start().catch(console.error);
