#!/usr/bin/env node

/**
 * Structure Flattener - Converts categorized drivers to flat structure for Homey validation
 * Maintains categorized organization for development while enabling validation
 */

const fs = require('fs-extra');
const path = require('path');

class StructureFlattener {
    constructor() {
        this.projectRoot = process.cwd();
        this.flattenedDrivers = [];
        this.backupCreated = false;
    }

    async flattenForValidation() {
        console.log('📂 Flattening driver structure for Homey validation...');
        
        // Step 1: Create backup of categorized structure
        await this.createStructureBackup();
        
        // Step 2: Move categorized drivers to flat structure
        await this.flattenDrivers();
        
        // Step 3: Update app.json image paths
        await this.updateImagePaths();
        
        console.log(`✅ Flattened ${this.flattenedDrivers.length} drivers for validation`);
        return this.flattenedDrivers;
    }

    async restoreCategorizedStructure() {
        console.log('🔄 Restoring categorized driver structure...');
        
        if (!this.backupCreated) {
            console.log('   ⚠️ No backup found, skipping restore');
            return;
        }
        
        // Remove flat drivers
        const driversDir = path.join(this.projectRoot, 'drivers');
        const flatDrivers = await fs.readdir(driversDir);
        
        for (const driver of flatDrivers) {
            const driverPath = path.join(driversDir, driver);
            const stat = await fs.stat(driverPath);
            if (stat.isDirectory() && !['sensors', 'lights', 'switches', 'plugs', 'safety', 'climate', 'covers', 'access'].includes(driver)) {
                await fs.remove(driverPath);
            }
        }
        
        // Restore categorized structure from backup
        const backupDir = path.join(this.projectRoot, '.structure-backup', 'drivers');
        if (await fs.pathExists(backupDir)) {
            await fs.copy(backupDir, driversDir);
            await fs.remove(path.join(this.projectRoot, '.structure-backup'));
            console.log('   ✅ Restored categorized structure');
        }
    }

    async createStructureBackup() {
        const backupDir = path.join(this.projectRoot, '.structure-backup');
        const driversDir = path.join(this.projectRoot, 'drivers');
        
        if (await fs.pathExists(driversDir)) {
            await fs.copy(driversDir, path.join(backupDir, 'drivers'));
            this.backupCreated = true;
            console.log('   💾 Created structure backup');
        }
    }

    async flattenDrivers() {
        const driversDir = path.join(this.projectRoot, 'drivers');
        const categories = await fs.readdir(driversDir);
        
        for (const category of categories) {
            const categoryPath = path.join(driversDir, category);
            const stat = await fs.stat(categoryPath);
            if (!stat.isDirectory()) continue;
            
            const drivers = await fs.readdir(categoryPath);
            for (const driver of drivers) {
                const sourcePath = path.join(categoryPath, driver);
                const targetPath = path.join(driversDir, driver);
                const driverStat = await fs.stat(sourcePath);
                
                if (driverStat.isDirectory()) {
                    // Move driver to flat structure
                    await fs.move(sourcePath, targetPath);
                    
                    this.flattenedDrivers.push({
                        id: driver,
                        originalCategory: category,
                        moved: true
                    });
                    
                    console.log(`   📁 ${category}/${driver} → ${driver}`);
                }
            }
            
            // Remove empty category directory
            try {
                await fs.remove(categoryPath);
            } catch (error) {
                // Directory might not be empty, that's okay
            }
        }
    }

    async updateImagePaths() {
        console.log('🖼️ Updating image paths in app.json...');
        
        const appJsonPath = path.join(this.projectRoot, '.homeycompose', 'app.json');
        const appJson = await fs.readJson(appJsonPath);
        
        for (const driver of appJson.drivers) {
            if (driver.images) {
                for (const [size, imagePath] of Object.entries(driver.images)) {
                    // Update from categorized path to flat path
                    if (imagePath.includes('/sensors/') || imagePath.includes('/lights/') || 
                        imagePath.includes('/switches/') || imagePath.includes('/plugs/') ||
                        imagePath.includes('/safety/') || imagePath.includes('/climate/') ||
                        imagePath.includes('/covers/') || imagePath.includes('/access/')) {
                        
                        // Extract driver name and create flat path
                        const pathParts = imagePath.split('/');
                        const driverName = pathParts[pathParts.length - 3]; // drivers/category/drivername/assets/size.png
                        driver.images[size] = `./drivers/${driverName}/assets/${size}.png`;
                    }
                }
            }
        }
        
        await fs.writeJson(appJsonPath, appJson, { spaces: 2 });
        console.log('   ✅ Updated image paths for flat structure');
    }

    async validateFlatStructure() {
        console.log('🔍 Validating flat structure...');
        
        const driversDir = path.join(this.projectRoot, 'drivers');
        const drivers = await fs.readdir(driversDir);
        
        let validationIssues = [];
        
        for (const driver of drivers) {
            const driverPath = path.join(driversDir, driver);
            const stat = await fs.stat(driverPath);
            
            if (!stat.isDirectory()) continue;
            
            // Check for required files
            const requiredFiles = ['driver.compose.json', 'device.js'];
            for (const file of requiredFiles) {
                const filePath = path.join(driverPath, file);
                if (!await fs.pathExists(filePath)) {
                    validationIssues.push(`Missing ${file} in ${driver}`);
                }
            }
            
            // Check for required assets
            const assetsDir = path.join(driverPath, 'assets');
            if (await fs.pathExists(assetsDir)) {
                const requiredImages = ['small.png', 'large.png', 'xlarge.png'];
                for (const image of requiredImages) {
                    const imagePath = path.join(assetsDir, image);
                    if (!await fs.pathExists(imagePath)) {
                        validationIssues.push(`Missing ${image} in ${driver}/assets`);
                    }
                }
            } else {
                validationIssues.push(`Missing assets directory in ${driver}`);
            }
        }
        
        if (validationIssues.length > 0) {
            console.log('   ⚠️ Found validation issues:');
            validationIssues.forEach(issue => console.log(`     - ${issue}`));
            return false;
        } else {
            console.log('   ✅ Flat structure validation passed');
            return true;
        }
    }
    
    async runHomeyValidation() {
        console.log('🔍 Running homey app validate...');
        
        const { spawn } = require('child_process');
        
        return new Promise((resolve) => {
            const homeyProcess = spawn('npx', ['homey', 'app', 'validate', '--level=publish'], {
                cwd: this.projectRoot,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let output = '';
            let error = '';
            
            homeyProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.log(text.trim());
            });
            
            homeyProcess.stderr.on('data', (data) => {
                const text = data.toString();
                error += text;
                console.error(text.trim());
            });
            
            homeyProcess.on('close', (code) => {
                resolve({
                    success: code === 0,
                    output,
                    error: error || (code !== 0 ? output : '')
                });
            });
        });
    }
}

// Execute if run directly
if (require.main === module) {
    const flattener = new StructureFlattener();
    
    async function main() {
        try {
            // Flatten structure
            await flattener.flattenForValidation();
            
            // Validate flat structure
            const structureValid = await flattener.validateFlatStructure();
            if (!structureValid) {
                console.log('❌ Structure validation failed');
                return;
            }
            
            // Run Homey validation
            const validationResult = await flattener.runHomeyValidation();
            
            if (validationResult.success) {
                console.log('🎉 Homey validation successful!');
            } else {
                console.log('❌ Homey validation failed');
                console.log('Error details:', validationResult.error);
            }
            
        } catch (error) {
            console.error('❌ Process failed:', error.message);
        } finally {
            // Always restore categorized structure
            await flattener.restoreCategorizedStructure();
        }
    }
    
    main();
}

module.exports = StructureFlattener;
