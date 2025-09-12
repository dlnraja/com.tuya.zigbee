#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Build comprehensive drivers configuration for app.json
function buildDriversConfig() {
    const driversDir = path.join(__dirname, '..', 'drivers');
    const appJsonPath = path.join(__dirname, '..', '.homeycompose', 'app.json');
    
    console.log('🔧 Building Ultimate Zigbee Hub drivers configuration...');
    
    const drivers = [];
    const driverFolders = fs.readdirSync(driversDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(name => !name.startsWith('.') && !name.startsWith('_'));
    
    console.log(`📁 Found ${driverFolders.length} driver folders`);
    
    for (const driverFolder of driverFolders) {
        const driverPath = path.join(driversDir, driverFolder);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(composePath)) {
            try {
                const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                
                // Skip template and test drivers
                if (composeData.id && 
                    !composeData.id.includes('template') && 
                    !composeData.id.includes('test') &&
                    !composeData.id.includes('_base') &&
                    !composeData.id.includes('_common') &&
                    composeData.name) {
                    
                    // Ensure proper image paths
                    if (composeData.images) {
                        if (composeData.images.small && !composeData.images.small.includes('{{driverAssetsPath}}')) {
                            composeData.images.small = `{{driverAssetsPath}}/images/small.png`;
                        }
                        if (composeData.images.large && !composeData.images.large.includes('{{driverAssetsPath}}')) {
                            composeData.images.large = `{{driverAssetsPath}}/images/large.png`;
                        }
                    } else {
                        composeData.images = {
                            small: `{{driverAssetsPath}}/images/small.png`,
                            large: `{{driverAssetsPath}}/images/large.png`
                        };
                    }
                    
                    // Ensure proper platforms and connectivity
                    composeData.platforms = composeData.platforms || ["local"];
                    composeData.connectivity = composeData.connectivity || ["zigbee"];
                    
                    drivers.push(composeData);
                    console.log(`✅ Added driver: ${composeData.id} - ${composeData.name.en || composeData.name}`);
                }
            } catch (error) {
                console.warn(`⚠️  Warning: Could not parse ${composePath}: ${error.message}`);
            }
        }
    }
    
    // Load current app.json
    const appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    // Update drivers array
    appData.drivers = drivers;
    
    // Write updated app.json
    fs.writeFileSync(appJsonPath, JSON.stringify(appData, null, 2));
    
    console.log(`🚀 Successfully updated app.json with ${drivers.length} drivers`);
    console.log('Driver categories found:');
    
    const categories = {};
    drivers.forEach(driver => {
        const category = driver.class || 'other';
        categories[category] = (categories[category] || 0) + 1;
    });
    
    Object.entries(categories).forEach(([category, count]) => {
        console.log(`  📊 ${category}: ${count} drivers`);
    });
    
    return drivers.length;
}

// Create missing driver assets
function createDriverAssets() {
    console.log('\n🎨 Creating driver assets...');
    
    const driversDir = path.join(__dirname, '..', 'drivers');
    const driverFolders = fs.readdirSync(driversDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(name => !name.startsWith('.'));
    
    for (const driverFolder of driverFolders) {
        const driverPath = path.join(driversDir, driverFolder);
        const assetsPath = path.join(driverPath, 'assets');
        const imagesPath = path.join(assetsPath, 'images');
        
        // Create directories if they don't exist
        if (!fs.existsSync(assetsPath)) {
            fs.mkdirSync(assetsPath, { recursive: true });
        }
        if (!fs.existsSync(imagesPath)) {
            fs.mkdirSync(imagesPath, { recursive: true });
        }
        
        // Create placeholder images if they don't exist
        const smallImagePath = path.join(imagesPath, 'small.png');
        const largeImagePath = path.join(imagesPath, 'large.png');
        
        if (!fs.existsSync(smallImagePath)) {
            // Copy from template or create placeholder
            const templateSmall = path.join(__dirname, '..', 'assets', 'small.png');
            if (fs.existsSync(templateSmall)) {
                fs.copyFileSync(templateSmall, smallImagePath);
                console.log(`📄 Created small image for ${driverFolder}`);
            }
        }
        
        if (!fs.existsSync(largeImagePath)) {
            // Copy from template or create placeholder
            const templateLarge = path.join(__dirname, '..', 'assets', 'large.png');
            if (fs.existsSync(templateLarge)) {
                fs.copyFileSync(templateLarge, largeImagePath);
                console.log(`📄 Created large image for ${driverFolder}`);
            }
        }
    }
}

if (require.main === module) {
    try {
        const driverCount = buildDriversConfig();
        createDriverAssets();
        
        console.log('\n🎉 Ultimate Zigbee Hub build completed successfully!');
        console.log(`📱 Total drivers configured: ${driverCount}`);
        console.log('🔧 Next steps: Run homey app validate to check for issues');
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

module.exports = { buildDriversConfig, createDriverAssets };
