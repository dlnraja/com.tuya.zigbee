const fs = require('fs');
const path = require('path');

console.log('=== Checking Project Dependencies ===\n');

// Check if package.json exists
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('Error: package.json not found');
  process.exit(1);
}

// Read and parse package.json
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.error('Error parsing package.json:', error.message);
  process.exit(1);
}

// Display basic info
console.log(`Project: ${packageJson.name || 'N/A'}`);
console.log(`Version: ${packageJson.version || 'N/A'}\n`);

// Check dependencies
const checkDependencies = (deps, type) => {
  if (!deps || Object.keys(deps).length === 0) {
    console.log(`No ${type} dependencies found.`);
    return;
  }
  
  console.log(`${type} Dependencies (${Object.keys(deps).length}):`);
  Object.entries(deps).forEach(([pkg, version]) => {
    console.log(`- ${pkg}: ${version}`);
  });
  console.log('');
};

// Check different types of dependencies
checkDependencies(packageJson.dependencies, 'Production');
checkDependencies(packageJson.devDependencies, 'Development');
checkDependencies(packageJson.peerDependencies, 'Peer');

// Check scripts
if (packageJson.scripts) {
  console.log('Available Scripts:');
  Object.entries(packageJson.scripts).forEach(([name, script]) => {
    console.log(`- ${name}: ${script}`);
  });
  console.log('');
}

// Check for required dependencies
const requiredDeps = ['homey', 'homey-meshdriver'];
const missingDeps = [];

requiredDeps.forEach(dep => {
  if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
    missingDeps.push(dep);
  }
});

if (missingDeps.length > 0) {
  console.log('\n=== Missing Required Dependencies ===');
  missingDeps.forEach(dep => console.log(`- ${dep}`));
  console.log('\nRun: npm install --save ' + missingDeps.join(' '));
}

console.log('\n=== Dependency Check Complete ===');
