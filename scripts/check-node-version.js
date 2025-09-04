// Simple script to check Node.js environment
console.log('=== Node.js Environment Check ===');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform, process.arch);
console.log('Current directory:', process.cwd());

// Test file system access
try {
  const fs = require('fs');
  const testFile = 'test-file.txt';
  fs.writeFileSync(testFile, 'Test content');
  
  if (fs.existsSync(testFile)) {
    console.log('✅ File system access: OK');
    fs.unlinkSync(testFile);
  } else {
    console.log('❌ File system access: Failed');
  }
} catch (error) {
  console.log('❌ File system access error:', error.message);
}

// Test module loading
try {
  const path = require('path');
  console.log('✅ Module loading: OK');
} catch (error) {
  console.log('❌ Module loading error:', error.message);
}
