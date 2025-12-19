#!/usr/bin/env node

/**
 * 🎛️ MASTER CONTROLLER v1.0.0
 *
 * Orchestrateur central pour l'automatisation complète GitHub Johan → dlnraja
 * Coordonne tous les composants du système d'automatisation
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const GitHubAutoMonitor = require('./github-auto-monitor.js');
const SafetyValidator = require('./safety-validator.js');

class MasterController {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.config = {
      checkInterval: 3600000, // 1 hour
      maxConcurrentProcesses: 3,
      autoStart: true,
      safetyEnabled: true,
      dashboardPort: 8080
    };

    this.components = {
      monitor: null,
      validator: null,
      scheduler: null,
      dashboard: null
    };

    this.state = {
      running: false,
      lastRun: null,
      statistics: {
        totalRuns: 0,
        successfulRuns: 0,
        errors: 0,
        devicesProcessed: 0
      }
    };
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [MASTER/${level}] ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }

  /**
   * 🚀 Initialize and start the complete automation system
   */
  async initialize() {
    await this.log('INFO', '🤖 Initializing Master Controller...');

    try {
      // Initialize components
      this.components.monitor = new GitHubAutoMonitor();
      this.components.validator = new SafetyValidator(this.projectRoot);

      await this.log('SUCCESS', 'All components initialized');

      if (this.config.autoStart) {
        await this.startAutomation();
      }

    } catch (error) {
      await this.log('ERROR', 'Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * ⚡ Start the automation system
   */
  async startAutomation() {
    try {
      await this.log('INFO', 'Starting complete automation system...');

      // Start monitoring
      await this.components.monitor.startMonitoring();

      // Install Windows scheduler
      await this.installScheduler();

      this.state.running = true;
      await this.log('SUCCESS', '🚀 Automation system fully operational');

    } catch (error) {
      await this.log('ERROR', 'Failed to start automation:', error);
      this.state.running = false;
    }
  }

  /**
   * ⏰ Install Windows scheduler
   */
  async installScheduler() {
    try {
      const schedulerScript = path.join(__dirname, 'auto-scheduler.ps1');
      execSync(`powershell -ExecutionPolicy Bypass -File "${schedulerScript}" -Action Install`, {
        cwd: this.projectRoot
      });

      await this.log('SUCCESS', 'Windows scheduler installed');

    } catch (error) {
      await this.log('WARN', 'Scheduler installation failed:', error);
    }
  }

  /**
   * 📊 Get system status
   */
  async getSystemStatus() {
    return {
      running: this.state.running,
      lastRun: this.state.lastRun,
      statistics: this.state.statistics,
      components: {
        monitor: this.components.monitor ? 'active' : 'inactive',
        validator: this.components.validator ? 'active' : 'inactive',
        scheduler: 'installed',
        dashboard: 'available'
      }
    };
  }

  /**
   * 🛑 Stop automation system
   */
  async stopAutomation() {
    await this.log('INFO', 'Stopping automation system...');

    this.state.running = false;

    // Uninstall scheduler
    try {
      const schedulerScript = path.join(__dirname, 'auto-scheduler.ps1');
      execSync(`powershell -ExecutionPolicy Bypass -File "${schedulerScript}" -Action Uninstall`);
    } catch (error) {
      await this.log('WARN', 'Failed to uninstall scheduler:', error);
    }

    await this.log('SUCCESS', 'Automation system stopped');
  }
}

module.exports = MasterController;

// CLI Interface
if (require.main === module) {
  const controller = new MasterController();
  const action = process.argv[2];

  switch (action) {
    case 'start':
      controller.initialize();
      break;
    case 'stop':
      controller.stopAutomation();
      break;
    case 'status':
      controller.getSystemStatus().then(status => {
        console.log('System Status:', JSON.stringify(status, null, 2));
      });
      break;
    default:
      console.log(`
🎛️ Master Controller - GitHub Automation System

Usage: node master-controller.js <action>

Actions:
  start   - Initialize and start complete system
  stop    - Stop all automation processes
  status  - Show system status
      `);
  }
}
