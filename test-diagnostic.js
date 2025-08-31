const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Test Environment Diagnostic ===\n');

// Check Node.js and npm versions
try {
  console.log('Node.js version:', process.version);
  console.log('npm version:', execSync('npm --version').toString().trim());
} catch (error) {
  console.error('Error checking versions:', error.message);
}

// Check test file exists
const testFile = path.join(__dirname, 'test', 'unit', 'simple.test.js');
console.log('\nChecking test file:', testFile);
if (fs.existsSync(testFile)) {
  console.log('Test file exists');
  console.log('File content starts with:', 
    fs.readFileSync(testFile, 'utf8').substring(0, 100) + '...');
} else {
  console.error('Test file does not exist');
}

// Try to run Mocha directly
console.log('\nAttempting to run Mocha directly...');
try {
  const mochaPath = path.join(__dirname, 'node_modules', '.bin', 'mocha');
  const output = execSync(`"${mochaPath}" --version`).toString().trim();
  console.log('Mocha version:', output);
  
  // Run a simple test
  console.log('\nRunning simple test...');
  const testOutput = execSync(`"${mochaPath}" test/unit/simple.test.js --reporter spec`);
  console.log(testOutput.toString());
} catch (error) {
  console.error('Error running Mocha:', error.message);
  if (error.stdout) console.error('stdout:', error.stdout.toString());
  if (error.stderr) console.error('stderr:', error.stderr.toString());
}

console.log('\nDiagnostic complete.');
