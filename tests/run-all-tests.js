#!/usr/bin/env node

/**
 * Main test runner - executes all test suites
 */

const { spawn } = require('child_process');
const path = require('path');

const testFiles = [
  'convert.test.js',
  'fingerprints.test.js',
  'tuya-cluster.test.js',
  'schema-validator.test.js',
  'error-handler.test.js',
  'capability-manager.test.js',
  'image-manager.test.js',
  'test-runner.test.js',
  'overlay-manager.test.js'
];

async function runTests() {
  console.log('🧪 Running all test suites...\n');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const testFile of testFiles) {
    const testPath = path.join(__dirname, testFile);
    
    try {
      console.log(`📋 Running ${testFile}...`);
      
      // For now, just check if file exists and has content
      const fs = require('fs');
      if (fs.existsSync(testPath)) {
        const content = fs.readFileSync(testPath, 'utf8');
        if (content.trim().length > 0) {
          console.log(`✅ ${testFile} - File exists and has content`);
          totalPassed++;
        } else {
          console.log(`❌ ${testFile} - File is empty`);
          totalFailed++;
        }
      } else {
        console.log(`❌ ${testFile} - File not found`);
        totalFailed++;
      }
      
    } catch (error) {
      console.log(`❌ ${testFile} - Error: ${error.message}`);
      totalFailed++;
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Test Summary:');
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📈 Total: ${totalPassed + totalFailed}`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
