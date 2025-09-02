// Simple environment test script
console.log('=== Environment Test ===');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform, process.arch);
console.log('Current directory:', process.cwd());

// Test file system access
try {
  const fs = require('fs');
  const path = require('path');
  
  const testDir = path.join(process.cwd(), 'drivers');
  console.log('\nTesting directory access:', testDir);
  
  if (fs.existsSync(testDir)) {
    const files = fs.readdirSync(testDir, { withFileTypes: true });
    const dirs = files.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
    console.log(`Found ${dirs.length} driver directories`);
    
    if (dirs.length > 0) {
      console.log('First 5 driver directories:', dirs.slice(0, 5).join(', '));
      
      // Test reading a driver file
      const testDriver = path.join(testDir, dirs[0], 'driver.compose.json');
      if (fs.existsSync(testDriver)) {
        console.log('\nSample driver file:', testDriver);
        const content = fs.readFileSync(testDriver, 'utf8');
        console.log('File size:', content.length, 'bytes');
      } else {
        console.log('\nDriver file not found:', testDriver);
      }
    }
  } else {
    console.log('Directory not found:', testDir);
  }
} catch (error) {
  console.error('Error during test:', error);
}
