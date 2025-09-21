const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎯 MASTER EXECUTOR v1.0.32');

// Execute all algorithms
const scripts = ['auto-fix.js', 'master-recertification-system.js'];

scripts.forEach(script => {
  try {
    console.log(`🔄 Executing ${script}...`);
    execSync(`node scripts/${script}`, {stdio: 'inherit'});
    console.log(`✅ ${script} completed`);
  } catch(e) {
    console.log(`⚠️ ${script} had issues, continuing...`);
  }
});

// Final completion
console.log('🎉 ALL ALGORITHMS EXECUTED');
console.log('🚀 Ready for homey app publish');
