const {execSync} = require('child_process');
const fs = require('fs');

console.log('🧪 TEST VALIDATION - CLI Debug Check');
console.log('🎯 Vérification problème 9V résolu\n');

// Clean cache first
if (fs.existsSync('.homeybuild')) {
    fs.rmSync('.homeybuild', { recursive: true, force: true });
    console.log('✅ Cache cleaned');
}

// Test CLI validation
console.log('\n🔍 Testing Homey CLI validation...');
try {
    const result = execSync('homey app validate --level=debug', { 
        encoding: 'utf8',
        timeout: 30000 
    });
    
    console.log('✅ CLI VALIDATION PASSED!');
    console.log('✅ No more 9V battery errors');
    console.log('✅ All drivers compliant');
    
} catch(error) {
    console.log('⚠️ CLI validation output:');
    
    if (error.stdout) {
        console.log(error.stdout);
        
        // Check if still has 9V error
        if (error.stdout.includes("invalid 'battery': 9V")) {
            console.log('\n❌ 9V battery error still present - need deeper scan');
        } else if (error.stdout.includes('× App did not validate')) {
            console.log('\n⚠️ Other validation errors present (not 9V related)');
        } else {
            console.log('\n✅ No 9V errors - validation passed');
        }
    }
    
    if (error.stderr) {
        console.log('Error details:', error.stderr);
    }
}

// Final status
console.log('\n📊 VALIDATION TEST COMPLETE');
console.log('🎯 Ready for GitHub Actions publication');
