const fs = require('fs-extra');
const path = require('path');

class ManufacturerIdFixer {
    constructor() {
        this.driversPath = path.join(process.cwd(), 'drivers');
        this.fixedCount = 0;
        this.errorCount = 0;
    }

    async run() {
        console.log('🔧 Fixing manufacturerId errors in driver.compose.json files...');
        
        // Get all driver directories
        const driverDirs = await fs.readdir(this.driversPath);
        
        for (const driverDir of driverDirs) {
            const driverPath = path.join(this.driversPath, driverDir);
            const stat = await fs.stat(driverPath);
            
            if (stat.isDirectory()) {
                await this.fixDriverComposeFile(driverPath, driverDir);
            }
        }
        
        console.log(`\n✅ Fix complete! Fixed: ${this.fixedCount}, Errors: ${this.errorCount}`);
    }

    async fixDriverComposeFile(driverPath, driverDir) {
        const composeFilePath = path.join(driverPath, 'driver.compose.json');
        
        try {
            // Check if driver.compose.json exists
            if (!await fs.pathExists(composeFilePath)) {
                console.log(`⚠️  No driver.compose.json found in ${driverDir}`);
                this.errorCount++;
                return;
            }
            
            // Read the file
            const composeData = await fs.readJson(composeFilePath);
            
            // Check if manufacturerId exists and is an array
            if (composeData.manufacturerId && !Array.isArray(composeData.manufacturerId)) {
                // Convert to array or remove if it's not needed
                if (typeof composeData.manufacturerId === 'string') {
                    composeData.manufacturerId = [composeData.manufacturerId];
                } else {
                    delete composeData.manufacturerId;
                }
                
                // Write the fixed file
                await fs.writeJson(composeFilePath, composeData, { spaces: 2 });
                console.log(`✅ Fixed manufacturerId in ${driverDir}`);
                this.fixedCount++;
            } else if (composeData.manufacturerId === undefined) {
                // No manufacturerId field, which is fine
                console.log(`ℹ️  No manufacturerId field in ${driverDir} (OK)`);
            } else {
                // Already an array or properly formatted
                console.log(`✅ manufacturerId already properly formatted in ${driverDir}`);
            }
        } catch (error) {
            console.log(`❌ Error fixing ${driverDir}: ${error.message}`);
            this.errorCount++;
        }
    }
}

// Run the fixer
if (require.main === module) {
    const fixer = new ManufacturerIdFixer();
    fixer.run().catch(console.error);
}

module.exports = ManufacturerIdFixer;
