/**
 * Check Environment Script
 * 
 * This script checks the development environment for common issues
 * that might prevent the Tuya Zigbee project from running properly.
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const REQUIRED_NODE_VERSION = '18.0.0';
const REQUIRED_NPM_VERSION = '8.0.0';
const REQUIRED_HOMEY_CLI_VERSION = '11.0.0';

// Check results
const results = {
  node: { installed: false, version: null, compatible: false },
  npm: { installed: false, version: null, compatible: false },
  homey: { installed: false, version: null, compatible: false },
  directories: {
    node_modules: { exists: false, path: null },
    drivers: { exists: false, path: null },
    templates: { exists: false, path: null }
  },
  files: {
    appJson: { exists: false, path: null },
    packageJson: { exists: false, path: null }
  }
};

/**
 * Compare version strings
 */
function compareVersions(version1, version2) {
  const v1 = version1.split('.').map(Number);
  const v2 = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const n1 = v1[i] || 0;
    const n2 = v2[i] || 0;
    
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  
  return 0;
}

/**
 * Check Node.js installation
 */
function checkNode() {
  try {
    const version = execSync('node --version')
      .toString()
      .trim()
      .replace('v', '');
    
    results.node.installed = true;
    results.node.version = version;
    results.node.compatible = compareVersions(version, REQUIRED_NODE_VERSION) >= 0;
  } catch (error) {
    results.node.installed = false;
  }
}

/**
 * Check npm installation
 */
function checkNpm() {
  try {
    const version = execSync('npm --version')
      .toString()
      .trim();
    
    results.npm.installed = true;
    results.npm.version = version;
    results.npm.compatible = compareVersions(version, REQUIRED_NPM_VERSION) >= 0;
  } catch (error) {
    results.npm.installed = false;
  }
}

/**
 * Check Homey CLI installation
 */
function checkHomey() {
  try {
    const version = execSync('homey --version')
      .toString()
      .trim();
    
    results.homey.installed = true;
    results.homey.version = version;
    results.homey.compatible = compareVersions(version, REQUIRED_HOMEY_CLI_VERSION) >= 0;
  } catch (error) {
    results.homey.installed = false;
  }
}

/**
 * Check project structure
 */
function checkProjectStructure() {
  const projectRoot = process.cwd();
  
  // Check node_modules
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  results.directories.node_modules = {
    exists: fs.existsSync(nodeModulesPath),
    path: nodeModulesPath
  };
  
  // Check drivers directory
  const driversPath = path.join(projectRoot, 'drivers');
  results.directories.drivers = {
    exists: fs.existsSync(driversPath),
    path: driversPath
  };
  
  // Check templates directory
  const templatesPath = path.join(projectRoot, 'drivers', '_templates');
  results.directories.templates = {
    exists: fs.existsSync(templatesPath),
    path: templatesPath
  };
  
  // Check app.json
  const appJsonPath = path.join(projectRoot, 'app.json');
  results.files.appJson = {
    exists: fs.existsSync(appJsonPath),
    path: appJsonPath
  };
  
  // Check package.json
  const packageJsonPath = path.join(projectRoot, 'package.json');
  results.files.packageJson = {
    exists: fs.existsSync(packageJsonPath),
    path: packageJsonPath
  };
}

/**
 * Print report
 */
function printReport() {
  console.log('\n=== Environment Check Report ===\n');
  
  // Node.js
  console.log('Node.js:');
  if (results.node.installed) {
    console.log(`  ✅ Installed: v${results.node.version}`);
    if (results.node.compatible) {
      console.log('  ✅ Version is compatible');
    } else {
      console.log(`  ❌ Version ${results.node.version} is not compatible, v${REQUIRED_NODE_VERSION} or higher required`);
    }
  } else {
    console.log('  ❌ Not installed or not in PATH');
  }
  
  // npm
  console.log('\nnpm:');
  if (results.npm.installed) {
    console.log(`  ✅ Installed: v${results.npm.version}`);
    if (results.npm.compatible) {
      console.log('  ✅ Version is compatible');
    } else {
      console.log(`  ❌ Version ${results.npm.version} is not compatible, v${REQUIRED_NPM_VERSION} or higher required`);
    }
  } else {
    console.log('  ❌ Not installed or not in PATH');
  }
  
  // Homey CLI
  console.log('\nHomey CLI:');
  if (results.homey.installed) {
    console.log(`  ✅ Installed: v${results.homey.version}`);
    if (results.homey.compatible) {
      console.log('  ✅ Version is compatible');
    } else {
      console.log(`  ⚠️  Version ${results.homey.version} might not be compatible, v${REQUIRED_HOMEY_CLI_VERSION} or higher recommended`);
    }
  } else {
    console.log('  ❌ Not installed or not in PATH');
    console.log('  💡 Install with: npm install -g homey');
  }
  
  // Project structure
  console.log('\nProject Structure:');
  
  // node_modules
  console.log(`\nnode_modules directory:`);
  if (results.directories.node_modules.exists) {
    console.log(`  ✅ Found at: ${results.directories.node_modules.path}`);
  } else {
    console.log('  ❌ Not found');
    console.log('  💡 Run: npm install');
  }
  
  // drivers
  console.log(`\ndrivers directory:`);
  if (results.directories.drivers.exists) {
    console.log(`  ✅ Found at: ${results.directories.drivers.path}`);
  } else {
    console.log('  ❌ Not found');
    console.log('  💡 The drivers directory is missing. This is a required directory.');
  }
  
  // templates
  console.log(`\ntemplates directory:`);
  if (results.directories.templates.exists) {
    console.log(`  ✅ Found at: ${results.directories.templates.path}`);
  } else {
    console.log(`  ⚠️  Not found at: ${results.directories.templates.path}`);
    console.log('  💡 Consider creating a _templates directory with driver templates.');
  }
  
  // app.json
  console.log(`\napp.json:`);
  if (results.files.appJson.exists) {
    console.log(`  ✅ Found at: ${results.files.appJson.path}`);
  } else {
    console.log('  ❌ Not found');
    console.log('  💡 The app.json file is required for Homey apps.');
  }
  
  // package.json
  console.log(`\npackage.json:`);
  if (results.files.packageJson.exists) {
    console.log(`  ✅ Found at: ${results.files.packageJson.path}`);
  } else {
    console.log('  ❌ Not found');
    console.log('  💡 The package.json file is required for Node.js projects.');
  }
  
  // Summary
  console.log('\n=== Summary ===\n');
  
  const issues = [];
  
  if (!results.node.installed || !results.node.compatible) {
    issues.push('Node.js is not installed or not compatible');
  }
  
  if (!results.npm.installed || !results.npm.compatible) {
    issues.push('npm is not installed or not compatible');
  }
  
  if (!results.homey.installed) {
    issues.push('Homey CLI is not installed');
  }
  
  if (!results.directories.node_modules.exists) {
    issues.push('node_modules directory is missing (run npm install)');
  }
  
  if (!results.directories.drivers.exists) {
    issues.push('drivers directory is missing');
  }
  
  if (!results.files.appJson.exists) {
    issues.push('app.json is missing');
  }
  
  if (!results.files.packageJson.exists) {
    issues.push('package.json is missing');
  }
  
  if (issues.length === 0) {
    console.log('✅ Your environment is properly configured!');
    console.log('   You can now run: npm start');
  } else {
    console.log(`⚠️  Found ${issues.length} issue(s) that need attention:\n`);
    issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
    
    console.log('\n💡 Run the following commands to fix the issues:');
    
    if (!results.node.installed) {
      console.log('  - Install Node.js from: https://nodejs.org/');
    }
    
    if (!results.npm.installed) {
      console.log('  - npm should be installed with Node.js. Try reinstalling Node.js.');
    }
    
    if (!results.homey.installed) {
      console.log('  - Install Homey CLI: npm install -g homey');
    }
    
    if (!results.directories.node_modules.exists) {
      console.log('  - Install dependencies: npm install');
    }
    
    if (!results.directories.drivers.exists) {
      console.log('  - Create a drivers directory: mkdir drivers');
    }
    
    if (!results.files.appJson.exists) {
      console.log('  - Create an app.json file with your app configuration');
    }
    
    if (!results.files.packageJson.exists) {
      console.log('  - Create a package.json file: npm init -y');
    }
  }
  
  console.log('\nFor more information, visit: https://developers.athom.com/');
}

// Run checks
console.log('🔍 Checking development environment...');

checkNode();
checkNpm();
checkHomey();
checkProjectStructure();

// Print report after a short delay to allow all checks to complete
setTimeout(printReport, 100);
