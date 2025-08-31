// Simple test environment check
console.log('Test environment check:');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());

// Check if we can write to the directory
try {
  const fs = require('fs');
  const testFile = 'test-write.txt';
  fs.writeFileSync(testFile, 'test');
  console.log('✓ Can write to directory');
  fs.unlinkSync(testFile);
} catch (error) {
  console.error('✗ Cannot write to directory:', error.message);
}

// Check if we can require test dependencies
try {
  require('chai');
  require('mocha');
  require('sinon');
  console.log('✓ Test dependencies are available');
} catch (error) {
  console.error('✗ Missing test dependencies:', error.message);
}

console.log('\nEnvironment check complete.');
