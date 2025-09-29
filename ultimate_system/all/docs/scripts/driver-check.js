const fs = require('fs');
const {execSync} = require('child_process');

console.log('🔍 DRIVER CHECK & IMPROVEMENT');

let fixed = 0;
const driversPath = 'drivers';
const drivers = fs.readdirSync(driversPath).filter(d => 
    fs.statSync(`${driversPath}/${d}`).isDirectory()
);

console.log(`📊 Checking ${drivers.length} drivers`);

drivers.forEach(name => {
    const composePath = `${driversPath}/${name}/driver.compose.json`;
    
    if (fs.existsSync(composePath)) {
        try {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            let changed = false;
            
            // Fix 1: Invalid batteries
            if (compose.energy?.batteries) {
                compose.energy.batteries = compose.energy.batteries.map(b => 
                    b === '9V' ? 'PP3' : b
                );
                changed = true;
            }
            
            // Fix 2: Enhance manufacturer IDs
            if (compose.zigbee?.manufacturerName) {
                const enhanced = [
                    ...compose.zigbee.manufacturerName,
                    "_TZE200_", "_TZ3000_", "Tuya", "MOES"
                ];
                compose.zigbee.manufacturerName = [...new Set(enhanced)];
                changed = true;
            }
            
            // Fix 3: Add capability options
            if (compose.capabilities && !compose.capabilitiesOptions) {
                compose.capabilitiesOptions = {};
                compose.capabilities.forEach(cap => {
                    if (cap.startsWith('measure_temperature')) {
                        compose.capabilitiesOptions[cap] = {
                            title: {en: "Temperature"}, units: {en: "°C"}
                        };
                    }
                    if (cap.startsWith('measure_humidity')) {
                        compose.capabilitiesOptions[cap] = {
                            title: {en: "Humidity"}, units: {en: "%"}
                        };
                    }
                });
                changed = true;
            }
            
            if (changed) {
                fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                console.log(`✅ ${name}: improved`);
                fixed++;
            }
            
        } catch(e) {
            console.log(`❌ ${name}: ${e.message}`);
        }
    }
    
    // Create missing assets
    const assetsPath = `${driversPath}/${name}/assets/images`;
    if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, { recursive: true });
    }
});

console.log(`\n📊 Summary: ${fixed} drivers improved`);

// Commit improvements
if (fixed > 0) {
    execSync('git add -A && git commit -m "🔧 IMPROVE: All drivers enhanced + fixed" && git push origin master');
    console.log('🚀 Improvements committed to GitHub');
}

console.log('✅ Driver check complete!');
