// Simple test script to check Node.js environment
console.log('=== Node.js Environment Test ===\n');

// Test basic functionality
try {
  // Test file system access
  const fs = require('fs');
  const path = require('path');
  
  console.log('✅ Basic Node.js modules loaded successfully');
  
  // Test file reading
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`✅ package.json found. App: ${pkg.name} v${pkg.version}`);
  } else {
    console.log('⚠️  package.json not found in current directory');
  }
  
  // Test process info
  console.log('\n=== System Information ===');
  console.log(`Node.js version: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(`Current directory: ${process.cwd()}`);
  
  // Test npm
  try {
    const { execSync } = require('child_process');
    const npmVersion = execSync('npm --version').toString().trim();
    console.log(`\n✅ npm version: ${npmVersion}`);
  } catch (e) {
    console.log('\n❌ npm is not available. Make sure Node.js and npm are installed.');
  }
  
  // List files in current directory
  console.log('\n=== Current Directory Contents ===');
  const files = fs.readdirSync('.');
  console.log(files.join('\n'));
  
  console.log('\n✅ Environment test completed successfully!');
  
} catch (error) {
  console.error('\n❌ Error during environment test:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
