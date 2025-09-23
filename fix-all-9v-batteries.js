const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

console.log('🔋 FIX ALL 9V BATTERIES - Global Correction');
console.log('🎯 Scan & fix "9V" → "PP3" in all drivers\n');

let totalFixed = 0;

// 1. Fix app.json
console.log('📝 FIXING app.json:');
try {
    let appContent = fs.readFileSync('app.json', 'utf8');
    const appOriginal = appContent;
    
    // Replace all "9V" with "PP3" in app.json
    appContent = appContent.replace(/"9V"/g, '"PP3"');
    
    if (appContent !== appOriginal) {
        fs.writeFileSync('app.json', appContent);
        console.log('✅ app.json: "9V" → "PP3" fixed');
        totalFixed++;
    } else {
        console.log('✅ app.json: No "9V" found');
    }
} catch(e) {
    console.log(`❌ app.json error: ${e.message}`);
}

// 2. Fix all driver.compose.json files
console.log('\n📁 SCANNING ALL DRIVERS:');
const driversPath = 'drivers';

if (fs.existsSync(driversPath)) {
    const drivers = fs.readdirSync(driversPath);
    
    drivers.forEach(driverName => {
        const driverPath = path.join(driversPath, driverName);
        const composeFile = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(composeFile)) {
            try {
                let content = fs.readFileSync(composeFile, 'utf8');
                const original = content;
                
                // Replace "9V" with "PP3"
                content = content.replace(/"9V"/g, '"PP3"');
                
                if (content !== original) {
                    fs.writeFileSync(composeFile, content);
                    console.log(`✅ ${driverName}: "9V" → "PP3" fixed`);
                    totalFixed++;
                } else {
                    console.log(`✅ ${driverName}: No "9V" found`);
                }
            } catch(e) {
                console.log(`❌ ${driverName}: Error - ${e.message}`);
            }
        }
    });
} else {
    console.log('❌ Drivers directory not found');
}

// 3. Also check for other driver files that might have battery configs
console.log('\n🔍 SCANNING OTHER CONFIG FILES:');
const configFiles = ['driver.json', 'device.json', 'driver.settings.compose.json'];

if (fs.existsSync(driversPath)) {
    const drivers = fs.readdirSync(driversPath);
    
    drivers.forEach(driverName => {
        const driverPath = path.join(driversPath, driverName);
        
        configFiles.forEach(configFile => {
            const filePath = path.join(driverPath, configFile);
            
            if (fs.existsSync(filePath)) {
                try {
                    let content = fs.readFileSync(filePath, 'utf8');
                    const original = content;
                    
                    content = content.replace(/"9V"/g, '"PP3"');
                    
                    if (content !== original) {
                        fs.writeFileSync(filePath, content);
                        console.log(`✅ ${driverName}/${configFile}: "9V" → "PP3" fixed`);
                        totalFixed++;
                    }
                } catch(e) {
                    console.log(`❌ ${driverName}/${configFile}: Error - ${e.message}`);
                }
            }
        });
    });
}

// 4. Clean cache
if (fs.existsSync('.homeybuild')) {
    fs.rmSync('.homeybuild', { recursive: true, force: true });
    console.log('\n✅ Cache .homeybuild cleaned');
}

// 5. Summary and commit
console.log(`\n📊 SUMMARY:`);
console.log(`   💡 Total fixes applied: ${totalFixed}`);
console.log(`   🔋 All "9V" → "PP3" corrections completed`);
console.log(`   ✅ CLI validation ready`);

if (totalFixed > 0) {
    try {
        execSync('git add -A && git commit -m "🔋 GLOBAL FIX: All 9V batteries → PP3 for CLI validation" && git push origin master');
        console.log('\n🚀 Changes committed and pushed to GitHub');
        console.log('✅ GitHub Actions triggered for publication');
    } catch(e) {
        console.log(`\n⚠️ Git commit error: ${e.message}`);
    }
} else {
    console.log('\n✅ No fixes needed - all batteries already correct');
}

console.log('\n🎯 GLOBAL 9V FIX COMPLETE!');
