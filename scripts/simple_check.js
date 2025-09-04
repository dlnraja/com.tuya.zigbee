const fs = require('fs');
const path = require('path');

console.log('=== Project Structure Check ===\n');

// Check if we're in the project root
const isProjectRoot = fs.existsSync('package.json') && fs.existsSync('app.json');
if (!isProjectRoot) {
  console.error('Error: This script must be run from the project root directory');
  process.exit(1);
}

// Function to check if a directory exists and list its contents
function checkDirectory(name, required = true) {
  const exists = fs.existsSync(name);
  console.log(`[${exists ? 'FOUND' : 'MISSING'}] ${name}/`);
  
  if (exists) {
    try {
      const items = fs.readdirSync(name, { withFileTypes: true });
      const dirs = items.filter(d => d.isDirectory()).map(d => `  📁 ${d.name}`);
      const files = items.filter(f => f.isFile()).map(f => `  📄 ${f.name}`);
      
      console.log(`  Contains: ${items.length} items (${dirs.length} directories, ${files.length} files)`);
      
      // Show a few items as examples
      const sample = [...dirs.slice(0, 3), ...files.slice(0, 3)];
      if (sample.length > 0) {
        console.log('  ' + sample.join('\n  '));
        if (dirs.length + files.length > 6) {
          console.log(`  ... and ${dirs.length + files.length - 6} more items`);
        }
      }
      
      return true;
    } catch (err) {
      console.error(`  Error reading directory: ${err.message}`);
      return false;
    }
  } else if (required) {
    console.error(`  ERROR: Required directory '${name}/' is missing`);
    return false;
  }
  
  return false;
}

// Check package.json
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`\n=== Package Info ===`);
  console.log(`Name: ${pkg.name || 'Not specified'}`);
  console.log(`Version: ${pkg.version || '0.0.0'}`);
  console.log(`Description: ${pkg.description || 'No description'}`);
  
  // Check required scripts
  const requiredScripts = ['start', 'build', 'test'];
  const missingScripts = requiredScripts.filter(s => !pkg.scripts?.[s]);
  
  if (missingScripts.length > 0) {
    console.log('\n[WARNING] Missing recommended scripts:', missingScripts.join(', '));
  }
} catch (err) {
  console.error('\n[ERROR] Failed to read package.json:', err.message);
}

// Check app.json
try {
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  console.log(`\n=== App Info ===`);
  console.log(`App ID: ${app.id || 'Not specified'}`);
  console.log(`SDK Version: ${app.sdk || 'Not specified'}`);
  console.log(`Homey Version: ${app.compatibility || 'Not specified'}`);
  
  if (app.drivers) {
    console.log(`\nDrivers: ${app.drivers.length} defined`);
    
    // Check if driver files exist
    const driversWithIssues = [];
    
    app.drivers.forEach(driver => {
      const driverPath = path.join('drivers', driver.id);
      const exists = fs.existsSync(driverPath);
      
      if (!exists) {
        driversWithIssues.push(`  - ${driver.id}: Directory not found`);
        return;
      }
      
      const requiredFiles = ['device.js', 'driver.js', 'driver.compose.json'];
      const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(driverPath, file)));
      
      if (missingFiles.length > 0) {
        driversWithIssues.push(`  - ${driver.id}: Missing ${missingFiles.join(', ')}`);
      }
    });
    
    if (driversWithIssues.length > 0) {
      console.log('\n[ISSUES] Some drivers have problems:');
      console.log(driversWithIssues.join('\n'));
    }
  }
  
} catch (err) {
  console.error('\n[ERROR] Failed to read app.json:', err.message);
}

// Check important directories
console.log('\n=== Project Directories ===');
checkDirectory('drivers');
checkDirectory('assets');
checkDirectory('scripts');
checkDirectory('test');
checkDirectory('node_modules', false);

// Check for .git directory
const gitExists = fs.existsSync('.git');
console.log(`\n[${gitExists ? 'FOUND' : 'MISSING'}] .git/ directory`);

// Check for .env file
const envExists = fs.existsSync('.env');
console.log(`[${envExists ? 'FOUND' : 'MISSING'}] .env file`);

console.log('\n=== Check Complete ===');
