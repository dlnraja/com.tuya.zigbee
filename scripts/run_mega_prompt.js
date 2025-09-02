#!/usr/bin/env node

/**
 * Mega-Prompt Execution Script for Tuya Zigbee Project
 * 
 * This script automates the execution of the mega-prompt steps
 * based on the configuration in mega-prompt-config.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Load configuration
const configPath = path.join(__dirname, '..', 'mega-prompt-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Utility functions
const logStep = (step, message) => {
  console.log(chalk.blue(`[${step}]`), message);
};

const logSuccess = (message) => {
  console.log(chalk.green('✓'), message);
};

const logError = (message, error) => {
  console.error(chalk.red('✗'), message);
  if (error) console.error(chalk.red(error));
  process.exit(1);
};

const runCommand = (command, cwd = process.cwd()) => {
  try {
    logStep('EXEC', command);
    return execSync(command, { stdio: 'inherit', cwd });
  } catch (error) {
    logError(`Command failed: ${command}`, error);
  }
};

// Main execution function
const executeMegaPrompt = async () => {
  console.log(chalk.cyan.bold('\n=== Tuya Zigbee Mega-Prompt Execution ===\n'));
  
  // Phase 1: Setup & Initialization
  logStep('PHASE 1', 'Project Setup & Initialization');
  runCommand('git status');
  runCommand('npm ci || npm install');
  
  // Phase 2: Code Quality & Validation
  logStep('PHASE 2', 'Code Quality & Validation');
  runCommand('npm run lint');
  runCommand('npm run format');
  
  // Phase 3: Testing
  logStep('PHASE 3', 'Running Tests');
  runCommand('npm test');
  
  // Phase 4: Update Device Matrix
  logStep('PHASE 4', 'Updating Device Matrix');
  runCommand('node scripts/update_device_matrix.mjs');
  
  // Phase 5: Documentation Generation
  logStep('PHASE 5', 'Generating Documentation');
  runCommand('npm run docs');
  
  // Phase 6: Sync Lite Version
  logStep('PHASE 6', 'Syncing Lite Version');
  runCommand('node scripts/sync_lite_version.mjs');
  
  // Phase 7: Final Checks
  logStep('PHASE 7', 'Running Final Checks');
  runCommand('git diff --exit-code');
  
  logSuccess('Mega-prompt execution completed successfully!');
  console.log(chalk.cyan('\nNext steps:'));
  console.log('1. Review the changes');
  console.log('2. Commit and push your changes');
  console.log('3. Create a pull request if needed\n');
};

// Execute the script
if (require.main === module) {
  executeMegaPrompt().catch(error => {
    logError('Error executing mega-prompt:', error);
    process.exit(1);
  });
}

module.exports = {
  executeMegaPrompt
};
