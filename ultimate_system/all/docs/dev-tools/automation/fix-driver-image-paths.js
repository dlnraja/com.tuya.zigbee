const fs = require('fs-extra');
const path = require('path');

class DriverImagePathFixer {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.fixedFiles = [];
    }

    async fixAllDriverPaths() {
        console.log('🔧 Fixing driver image paths for flat structure...');
        
        const driversDir = path.join(this.projectRoot, 'drivers');
        const drivers = await fs.readdir(driversDir);
        
        for (const driver of drivers) {
            const driverPath = path.join(driversDir, driver);
            const stat = await fs.stat(driverPath);
            
            if (stat.isDirectory()) {
                await this.fixDriverComposePaths(driver, driverPath);
            }
        }
        
        console.log(`✅ Fixed ${this.fixedFiles.length} driver files`);
        return this.fixedFiles;
    }
    
    async fixDriverComposePaths(driverName, driverPath) {
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (!await fs.pathExists(composePath)) {
            return;
        }
        
        try {
            let content = await fs.readFile(composePath, 'utf8');
            let changed = false;
            
            // Fix categorized image paths to flat structure
            // Pattern: /drivers/[category]/[driver]/assets/ -> /drivers/[driver]/assets/
            const oldPattern = new RegExp(`/drivers/[^/]+/${driverName}/assets/`, 'g');
            const newPath = `/drivers/${driverName}/assets/`;
            
            if (content.match(oldPattern)) {
                content = content.replace(oldPattern, newPath);
                changed = true;
            }
            
            if (changed) {
                await fs.writeFile(composePath, content, 'utf8');
                this.fixedFiles.push({
                    driver: driverName,
                    file: composePath,
                    fixed: true
                });
                console.log(`   ✅ Fixed ${driverName}/driver.compose.json`);
            }
        } catch (error) {
            console.error(`   ❌ Error fixing ${driverName}: ${error.message}`);
        }
    }
}

async function main() {
    const projectRoot = process.cwd();
    const fixer = new DriverImagePathFixer(projectRoot);
    
    try {
        await fixer.fixAllDriverPaths();
        console.log('🎉 All driver image paths fixed for flat structure');
    } catch (error) {
        console.error('❌ Error fixing driver paths:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = DriverImagePathFixer;
