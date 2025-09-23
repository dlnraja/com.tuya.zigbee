const {execSync} = require('child_process');

console.log('🚀 AUTO PUBLISH - GitHub Actions');

try {
    // Clean and fix
    execSync('node super-fix.js');
    
    // Commit and push
    execSync('git add -A');
    execSync('git commit -m "🚀 AUTO PUBLISH: Final fixes applied"');
    execSync('git push origin master');
    
    console.log('✅ AUTO PUBLISH TRIGGERED');
    console.log('🔗 Monitor: https://github.com/dlnraja/com.tuya.zigbee/actions');
    
} catch(e) {
    console.log(`❌ Error: ${e.message}`);
}

console.log('🎯 GitHub Actions will handle publication');
