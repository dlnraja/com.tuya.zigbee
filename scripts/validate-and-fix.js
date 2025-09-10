/**
 * Validate and Fix Script
 * 
 * This script runs validation and fixes for the Tuya Zigbee project.
 * It ensures all drivers are properly configured as Zigbee devices and fixes common issues.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
const fs = require('fs');
const readFile = promisify(fs.readFile);

// Configuration
const SCRIPTS = {
  VERIFY: path.join(__dirname, 'verify-zigbee-drivers.js'),
  FIX: path.join(__dirname, 'fix-common-issues.js'),
  LINT: path.join(__dirname, '..', 'node_modules', '.bin', 'eslint'),
  TEST: path.join(__dirname, '..', 'node_modules', '.bin', 'mocha')
};

/**
 * Run a command and return the result
 */
async function runCommand(command, cwd = process.cwd()) {
  console.log(`\n🚀 Running: ${command}`);
  
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    return { success: true, stdout, stderr };
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    return { success: false, error };
  }
}

/**
 * Run the verification script
 */
async function runVerification() {
  console.log('\n🔍 Verifying Zigbee drivers...');
  return runCommand(`node ${SCRIPTS.VERIFY}`);
}

/**
 * Run the fix script
 */
async function runFixes() {
  console.log('\n🔧 Fixing common issues...');
  return runCommand(`node ${SCRIPTS.FIX}`);
}

/**
 * Run ESLint
 */
async function runLint() {
  console.log('\n📝 Running ESLint...');
  return runCommand(`${SCRIPTS.LINT} . --fix`);
}

/**
 * Run tests
 */
async function runTests() {
  console.log('\n🧪 Running tests...');
  return runCommand(SCRIPTS.TEST);
}

/**
 * Validate app.json
 */
async function validateAppJson() {
  console.log('\n📋 Validating app.json...');
  
  try {
    const content = await readFile(path.join(process.cwd(), 'app.json'), 'utf8');
    const appJson = JSON.parse(content);
    
    // Basic validation
    if (!appJson.id || !appJson.name || !appJson.version) {
      console.error('❌ app.json is missing required fields (id, name, or version)');
      return false;
    }
    
    // Check drivers array
    if (!appJson.drivers || !Array.isArray(appJson.drivers)) {
      console.error('❌ app.json is missing or has an invalid drivers array');
      return false;
    }
    
    console.log('✅ app.json is valid');
    return true;
  } catch (error) {
    console.error('❌ Error validating app.json:', error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Tuya Zigbee Project Validation and Fixes\n');
  
  // 1. Validate app.json
  const isAppJsonValid = await validateAppJson();
  if (!isAppJsonValid) {
    console.log('\n❌ Please fix app.json issues before continuing.');
    process.exit(1);
  }
  
  // 2. Run verification
  const verifyResult = await runVerification();
  
  // 3. Run fixes if verification found issues
  if (!verifyResult.success) {
    console.log('\n⚠️  Issues found. Attempting to fix...');
    await runFixes();
    
    // Run verification again after fixes
    console.log('\n🔍 Re-verifying after fixes...');
    await runVerification();
  }
  
  // 4. Run linter
  await runLint();
  
  // 5. Run tests
  await runTests();
  
  console.log('\n✨ All checks completed! Your project should now be properly configured.');
  console.log('   Run "homey app run" to start the development server.');
}

// Run the script
main().catch(error => {
  console.error('\n❌ An error occurred:', error);
  process.exit(1);
});
