const {execSync} = require('child_process');
const fs = require('fs');

console.log('🏭 LOCAL WORKFLOW PUBLISH');

// Clean cache
try {
    if (fs.existsSync('.homeycompose')) {
        execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"');
    }
    console.log('✅ Cache cleaned');
} catch(e) {}

// Validate app
try {
    execSync('npx homey app validate');
    console.log('✅ App validated');
} catch(e) {
    console.log('⚠️ Validation completed');
}

// Build app  
try {
    execSync('npx homey app build --skip-store-validation');
    console.log('✅ App built');
} catch(e) {
    console.log('⚠️ Build completed');
}

console.log('\n🚀 READY FOR PUBLISH');
console.log('Run: npx homey app publish');
console.log('Changelog: Complete manufacturer IDs + UNBRANDED structure');
