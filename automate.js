#!/usr/bin/env node

/**
 * Tuya Zigbee Driver Automation Script
 * 
 * This script automates the process of updating and enriching Tuya Zigbee drivers
 * by processing dumps, updating references, and enriching driver configurations.
 */

const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);
const path = require('path');
const fs = require('fs');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Configuration
const CONFIG = {
  // Directories
  rootDir: path.join(__dirname),
  toolsDir: path.join(__dirname, 'tools'),
  driversDir: path.join(__dirname, 'drivers'),
  referencesDir: path.join(__dirname, 'references'),
  dumpsDir: path.join(__dirname, 'dumps'),
  
  // Files
  logFile: path.join(__dirname, 'automation.log'),
  reportFile: path.join(__dirname, 'automation-report.md'),
  
  // Scripts
  scripts: {
    analyzeDrivers: path.join(__dirname, 'tools', 'analyze-drivers.js'),
    updateReferences: path.join(__dirname, 'tools', 'update-references.js'),
    enrichDrivers: path.join(__dirname, 'tools', 'enrich-drivers.js'),
    generateReport: path.join(__dirname, 'tools', 'generate-driver-report.js'),
    processDumps: path.join(__dirname, 'tools', 'process-dumps.js'),
    updatePlaceholders: path.join(__dirname, 'tools', 'update-placeholders.js')
  }
};

// Logging
const logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'a' });

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  
  // Write to log file
  logStream.write(logMessage);
  
  // Also log to console, but only errors in production
  if (level === 'error' || process.env.NODE_ENV !== 'production') {
    console[level === 'error' ? 'error' : 'log'](logMessage.trim());
  }
}

// Error handling
class AutomationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AutomationError';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Main automation class
class TuyaZigbeeAutomation {
  constructor() {
    this.report = {
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      steps: [],
      errors: [],
      summary: {}
    };
  }

  async run() {
    try {
      log('Starting Tuya Zigbee Automation');
      this.ensureDirectories();
      
      // Run the automation steps
      await this.step('Analyzing existing drivers', this.analyzeDrivers.bind(this));
      await this.step('Processing device dumps', this.processDumps.bind(this));
      await this.step('Updating device references', this.updateReferences.bind(this));
      await this.step('Enriching drivers', this.enrichDrivers.bind(this));
      await this.step('Updating placeholders', this.updatePlaceholders.bind(this));
      await this.step('Generating final report', this.generateFinalReport.bind(this));
      
      // Mark as completed
      this.report.endTime = new Date().toISOString();
      this.report.duration = new Date(this.report.endTime) - new Date(this.report.startTime);
      
      log(`Automation completed in ${this.report.duration}ms`);
      await this.saveReport();
      
      return this.report;
    } catch (error) {
      log(`Automation failed: ${error.message}`, 'error');
      this.report.errors.push({
        step: this.report.steps[this.report.steps.length - 1]?.name || 'Initialization',
        error: error.message,
        stack: error.stack,
        details: error.details
      });
      
      this.report.endTime = new Date().toISOString();
      this.report.duration = new Date(this.report.endTime) - new Date(this.report.startTime);
      
      await this.saveReport();
      throw error;
    } finally {
      logStream.end();
    }
  }
  
  async step(name, action) {
    const step = { name, startTime: new Date().toISOString(), success: false };
    this.report.steps.push(step);
    
    log(`Starting step: ${name}`);
    
    try {
      const result = await action();
      step.endTime = new Date().toISOString();
      step.duration = new Date(step.endTime) - new Date(step.startTime);
      step.success = true;
      step.result = result;
      
      log(`Completed step: ${name} (${step.duration}ms)`);
      return result;
    } catch (error) {
      step.endTime = new Date().toISOString();
      step.duration = new Date(step.endTime) - new Date(step.startTime);
      step.error = error.message;
      
      log(`Step failed: ${name} - ${error.message}`, 'error');
      throw error;
    }
  }
  
  ensureDirectories() {
    const requiredDirs = [
      CONFIG.referencesDir,
      CONFIG.dumpsDir,
      path.join(CONFIG.driversDir, 'tuya-ts011f', 'assets', 'images')
    ];
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log(`Created directory: ${dir}`);
      }
    }
  }
  
  async analyzeDrivers() {
    return this.runScript('analyzeDrivers');
  }
  
  async processDumps() {
    return this.runScript('processDumps');
  }
  
  async updateReferences() {
    return this.runScript('updateReferences');
  }
  
  async enrichDrivers() {
    return this.runScript('enrichDrivers');
  }
  
  async updatePlaceholders() {
    return this.runScript('updatePlaceholders');
  }
  
  async generateFinalReport() {
    return this.runScript('generateReport');
  }
  
  async runScript(scriptName) {
    const scriptPath = CONFIG.scripts[scriptName];
    
    if (!scriptPath || !fs.existsSync(scriptPath)) {
      throw new AutomationError(`Script not found: ${scriptName}`, { scriptPath });
    }
    
    try {
      const { stdout, stderr } = await execAsync(`node ${scriptPath}`, {
        cwd: CONFIG.rootDir,
        env: { ...process.env, NODE_ENV: 'production' },
        maxBuffer: 1024 * 1024 * 10 // 10MB
      });
      
      if (stderr) {
        log(`Script ${scriptName} stderr: ${stderr}`, 'warn');
      }
      
      return { stdout, stderr };
    } catch (error) {
      throw new AutomationError(`Script ${scriptName} failed`, {
        script: scriptName,
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      });
    }
  }
  
  async saveReport() {
    const markdown = this.generateMarkdownReport();
    await writeFile(CONFIG.reportFile, markdown);
    
    // Also save the full report as JSON
    const jsonReport = {
      ...this.report,
      config: {
        ...CONFIG,
        // Remove functions from the config for serialization
        scripts: Object.keys(CONFIG.scripts).reduce((acc, key) => ({
          ...acc,
          [key]: CONFIG.scripts[key].replace(CONFIG.rootDir, '')
        }), {})
      }
    };
    
    await writeFile(
      CONFIG.reportFile.replace('.md', '.json'),
      JSON.stringify(jsonReport, null, 2)
    );
    
    return markdown;
  }
  
  generateMarkdownReport() {
    let markdown = `# Tuya Zigbee Automation Report\n\n`;
    
    // Header
    markdown += `**Start Time:** ${new Date(this.report.startTime).toLocaleString()}\n`;
    markdown += `**End Time:** ${this.report.endTime ? new Date(this.report.endTime).toLocaleString() : 'Incomplete'}\n`;
    markdown += `**Duration:** ${this.report.duration ? `${this.report.duration}ms` : 'N/A'}\n\n`;
    
    // Summary
    markdown += '## 📊 Summary\n\n';
    const successSteps = this.report.steps.filter(step => step.success);
    const failedSteps = this.report.steps.filter(step => !step.success);
    
    markdown += `- **Total Steps:** ${this.report.steps.length}\n`;
    markdown += `- **Completed Successfully:** ${successSteps.length}\n`;
    markdown += `- **Failed:** ${failedSteps.length}\n`;
    markdown += `- **Errors:** ${this.report.errors.length}\n\n`;
    
    // Steps
    markdown += '## 🔄 Steps\n\n';
    markdown += '| Step | Status | Duration (ms) |\n';
    markdown += '|------|--------|--------------|\n';
    
    for (const step of this.report.steps) {
      const status = step.success ? '✅ Success' : '❌ Failed';
      markdown += `| ${step.name} | ${status} | ${step.duration || 'N/A'} |\n`;
    }
    markdown += '\n';
    
    // Errors
    if (this.report.errors.length > 0) {
      markdown += '## ❌ Errors\n\n';
      markdown += '| Step | Error | Details |\n';
      markdown += '|------|-------|---------|\n';
      
      for (const error of this.report.errors) {
        const details = error.details ? `\`\`\`json\n${JSON.stringify(error.details, null, 2)}\n\`\`\`` : 'No details';
        markdown += `| ${error.step} | ${error.error} | ${details} |\n`;
      }
      markdown += '\n';
    }
    
    // Recommendations
    markdown += '## 📝 Recommendations\n\n';
    
    if (failedSteps.length > 0) {
      markdown += '### Fix the following failed steps:\n';
      for (const step of failedSteps) {
        markdown += `- ${step.name}: ${step.error || 'Unknown error'}\n`;
      }
      markdown += '\n';
    } else {
      markdown += 'All steps completed successfully! 🎉\n\n';
    }
    
    // Next Steps
    markdown += '### Next Steps\n\n';
    markdown += '1. Review the generated reports and logs\n';
    markdown += '2. Commit the changes to version control\n';
    markdown += '3. Test the updated drivers with actual devices\n';
    markdown += '4. Create a new release with the updated drivers\n\n';
    
    // Footer
    markdown += '---\n';
    markdown += `*Report generated by Tuya Zigbee Automation on ${new Date().toLocaleString()}*\n`;
    
    return markdown;
  }
}

// Run the automation if this script is executed directly
if (require.main === module) {
  const automation = new TuyaZigbeeAutomation();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  const isVerbose = args.includes('--verbose') || args.includes('-v');
  
  if (isVerbose) {
    process.env.NODE_ENV = 'development';
  }
  
  // Start the automation
  automation.run()
    .then(() => {
      console.log(`\n✅ Automation completed successfully!`);
      console.log(`📄 Report saved to: ${CONFIG.reportFile}`);
      console.log(`📋 Logs saved to: ${CONFIG.logFile}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Automation failed:', error.message);
      console.error(`📄 See ${CONFIG.reportFile} for details`);
      console.error(`📋 See ${CONFIG.logFile} for logs`);
      process.exit(1);
    });
}

module.exports = TuyaZigbeeAutomation;
