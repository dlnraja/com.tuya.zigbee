// Simple test script to verify Node.js execution
console.log('=== Basic Node.js Test Script ===');
console.log('Current directory:', process.cwd());

// Test file system access
try {
  const fs = require('fs');
  const files = fs.readdirSync('.');
  console.log('\nFiles in current directory:', files.length);
  console.log('Sample files:', files.slice(0, 5).join(', '), files.length > 5 ? '...' : '');
  
  // Check if package.json exists
  if (fs.existsSync('package.json')) {
    console.log('\npackage.json found!');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log('Project:', pkg.name || 'No name', pkg.version ? `v${pkg.version}` : '');
  } else {
    console.log('\npackage.json not found');
  }
  
} catch (error) {
  console.error('Error during file system operations:', error.message);
}

// Test basic functionality
console.log('\n=== Basic Tests ===');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Test async operation
setTimeout(() => {
  console.log('\nAsync test completed successfully!');
  console.log('=== End of Test Script ===');
}, 100);
