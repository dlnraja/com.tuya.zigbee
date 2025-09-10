#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

async function validateProject() {
  console.log('🔍 Validating project structure...\n');
  
  let errors = [];
  let warnings = [];
  
  try {
    // 1. Check package.json
    console.log('📦 Checking package.json...');
    try {
      const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
      if (!pkg.name || !pkg.version) {
        errors.push('package.json missing name or version');
      }
      console.log('✅ package.json valid');
    } catch (e) {
      errors.push('Invalid package.json: ' + e.message);
    }
    
    // 2. Check app.json
    console.log('📱 Checking app.json...');
    try {
      const app = JSON.parse(await fs.readFile('app.json', 'utf8'));
      if (!app.id || !app.name) {
        errors.push('app.json missing id or name');
      }
      console.log('✅ app.json valid');
    } catch (e) {
      errors.push('Invalid app.json: ' + e.message);
    }
    
    // 3. Check drivers
    console.log('🚗 Checking drivers...');
    const driversDir = path.join(__dirname, '../drivers');
    try {
      const drivers = await fs.readdir(driversDir);
      let driverCount = 0;
      
      for (const driver of drivers) {
        if (driver.startsWith('_')) continue; // Skip template directories
        
        const driverPath = path.join(driversDir, driver);
        const stat = await fs.stat(driverPath);
        if (!stat.isDirectory()) continue;
        
        driverCount++;
        
        // Check required files
        const requiredFiles = ['driver.js', 'driver.compose.json'];
        for (const file of requiredFiles) {
          const filePath = path.join(driverPath, file);
          try {
            await fs.access(filePath);
          } catch {
            errors.push(`Driver ${driver} missing ${file}`);
          }
        }
        
        // Check images
        const imagesDir = path.join(driverPath, 'assets', 'images');
        try {
          await fs.access(imagesDir);
        } catch {
          warnings.push(`Driver ${driver} missing images directory`);
        }
      }
      
      console.log(`✅ Found ${driverCount} drivers`);
    } catch (e) {
      errors.push('Could not read drivers directory: ' + e.message);
    }
    
    // 4. Check matrices
    console.log('📊 Checking matrices...');
    const matricesDir = path.join(__dirname, '../matrices');
    const requiredMatrices = ['DEVICE_MATRIX.csv', 'CLUSTER_MATRIX.csv'];
    
    for (const matrix of requiredMatrices) {
      const matrixPath = path.join(matricesDir, matrix);
      try {
        await fs.access(matrixPath);
        console.log(`✅ ${matrix} exists`);
      } catch {
        warnings.push(`Missing ${matrix}`);
      }
    }
    
    // 5. Check resources
    console.log('📁 Checking resources...');
    const resourcesDir = path.join(__dirname, '../resources');
    const requiredResources = ['SOURCES.md', 'user-patches.json'];
    
    for (const resource of requiredResources) {
      const resourcePath = path.join(resourcesDir, resource);
      try {
        await fs.access(resourcePath);
        console.log(`✅ ${resource} exists`);
      } catch {
        warnings.push(`Missing ${resource}`);
      }
    }
    
    // 6. Summary
    console.log('\n📋 Validation Summary');
    console.log('='.repeat(50));
    
    if (errors.length > 0) {
      console.log('❌ ERRORS:');
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ All validations passed!');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return {
      valid: false,
      errors: [error.message],
      warnings: []
    };
  }
}

// Run if called directly
if (require.main === module) {
  validateProject().then(result => {
    process.exit(result.valid ? 0 : 1);
  }).catch(error => {
    console.error('❌ Fatal validation error:', error);
    process.exit(1);
  });
}

module.exports = { validateProject };
