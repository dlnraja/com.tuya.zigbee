// Simple script to check Node.js environment and basic functionality
console.log('=== Node.js Environment Check ===');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform, process.arch);
console.log('Current directory:', process.cwd());

// Test basic functionality
try {
  // Test file system access
  const fs = require('fs');
  const path = require('path');
  
  // Test file writing
  const testFile = 'test-file.txt';
  fs.writeFileSync(testFile, 'Test content');
  
  if (fs.existsSync(testFile)) {
    console.log('✅ File system access: OK');
    fs.unlinkSync(testFile);
  } else {
    console.log('❌ File system access: Failed');
  }
  
  // Test module loading
  console.log('✅ Module loading: OK');
  
  // Test script execution
  const { execSync } = require('child_process');
  const output = execSync('node -v').toString().trim();
  console.log('✅ Command execution: OK');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.code) console.error('Error code:', error.code);
  if (error.stack) console.error('Stack:', error.stack.split('\n')[1]);
}
