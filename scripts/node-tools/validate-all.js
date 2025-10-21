#!/usr/bin/env node

/**
 * Validate all project components
 * Comprehensive validation suite
 */

import path from 'path';
import { logger } from './lib/logger.js';
import { readJSON, exists, getProjectRoot, findFiles } from './lib/file-utils.js';
import { glob } from 'glob';

const PROJECT_ROOT = getProjectRoot();

class ProjectValidator {
  constructor() {
    this.results = {
      app: { passed: 0, failed: 0, warnings: 0 },
      drivers: { passed: 0, failed: 0, warnings: 0 },
      images: { passed: 0, failed: 0, warnings: 0 },
      scripts: { passed: 0, failed: 0, warnings: 0 }
    };
  }

  async validate() {
    logger.title('🔍 VALIDATION COMPLÈTE DU PROJET');
    
    await this.validateApp();
    await this.validateDrivers();
    await this.validateImages();
    await this.validateScripts();
    
    this.displaySummary();
    
    const totalFailed = Object.values(this.results).reduce((sum, r) => sum + r.failed, 0);
    
    if (totalFailed === 0) {
      logger.success('\n🎉 VALIDATION RÉUSSIE - Projet prêt pour production!\n');
      return true;
    } else {
      logger.error(`\n❌ VALIDATION ÉCHOUÉE - ${totalFailed} erreurs détectées\n`);
      return false;
    }
  }

  async validateApp() {
    logger.section('📦 Validation app.json');
    
    try {
      const appPath = path.join(PROJECT_ROOT, 'app.json');
      
      if (!await exists(appPath)) {
        this.fail('app', 'app.json not found');
        return;
      }
      
      const app = await readJSON(appPath);
      
      // Required fields
      const requiredFields = ['id', 'version', 'name', 'description', 'category', 'permissions'];
      for (const field of requiredFields) {
        if (!app[field]) {
          this.fail('app', `Missing required field: ${field}`);
        } else {
          this.pass('app', `✓ ${field}`);
        }
      }
      
      // Version format
      if (app.version && !/^\d+\.\d+\.\d+$/.test(app.version)) {
        this.warn('app', `Invalid version format: ${app.version}`);
      } else {
        this.pass('app', '✓ Version format valid');
      }
      
      // SDK version
      if (app.sdk !== 3) {
        this.warn('app', `SDK version is ${app.sdk}, expected 3`);
      } else {
        this.pass('app', '✓ SDK 3');
      }
      
      logger.success('✅ app.json validé\n');
      
    } catch (error) {
      this.fail('app', `Error: ${error.message}`);
    }
  }

  async validateDrivers() {
    logger.section('🚗 Validation drivers');
    
    try {
      const driverFiles = await glob('**/driver.compose.json', {
        cwd: path.join(PROJECT_ROOT, 'drivers'),
        absolute: true
      });
      
      logger.info(`Validation de ${driverFiles.length} drivers...\n`);
      
      let validDrivers = 0;
      
      for (const file of driverFiles) {
        const driverName = path.basename(path.dirname(file));
        
        try {
          const driver = await readJSON(file);
          
          // Required fields
          if (!driver.name || !driver.class || !driver.capabilities) {
            this.fail('drivers', `${driverName}: Missing required fields`);
            continue;
          }
          
          // Zigbee configuration
          if (driver.connectivity?.includes('zigbee')) {
            if (!driver.zigbee) {
              this.fail('drivers', `${driverName}: Missing zigbee config`);
              continue;
            }
            
            if (!driver.zigbee.manufacturerName || driver.zigbee.manufacturerName.length === 0) {
              this.fail('drivers', `${driverName}: No manufacturer IDs`);
              continue;
            }
            
            if (!driver.zigbee.productId || driver.zigbee.productId.length === 0) {
              this.warn('drivers', `${driverName}: No product IDs`);
            }
          }
          
          validDrivers++;
          this.pass('drivers', driverName);
          
        } catch (error) {
          this.fail('drivers', `${driverName}: ${error.message}`);
        }
      }
      
      logger.success(`✅ ${validDrivers}/${driverFiles.length} drivers validés\n`);
      
    } catch (error) {
      this.fail('drivers', `Error: ${error.message}`);
    }
  }

  async validateImages() {
    logger.section('🖼️  Validation images');
    
    try {
      // App images
      const appImagesPath = path.join(PROJECT_ROOT, 'assets');
      const requiredAppImages = ['icon.svg', 'small.png', 'large.png'];
      
      for (const img of requiredAppImages) {
        const imgPath = path.join(appImagesPath, img);
        if (await exists(imgPath)) {
          this.pass('images', `App: ${img}`);
        } else {
          this.fail('images', `App: Missing ${img}`);
        }
      }
      
      // Driver images
      const driverDirs = await glob('*/', {
        cwd: path.join(PROJECT_ROOT, 'drivers'),
        absolute: true
      });
      
      let validImages = 0;
      let totalImages = 0;
      
      for (const driverDir of driverDirs) {
        const driverName = path.basename(driverDir);
        const assetsPath = path.join(driverDir, 'assets');
        
        if (await exists(assetsPath)) {
          const images = await glob('*.{png,svg}', {
            cwd: assetsPath
          });
          
          totalImages += images.length;
          validImages += images.length;
        }
      }
      
      logger.success(`✅ ${validImages} images de drivers trouvées\n`);
      
    } catch (error) {
      this.fail('images', `Error: ${error.message}`);
    }
  }

  async validateScripts() {
    logger.section('📜 Validation scripts');
    
    try {
      // Check Node.js scripts
      const nodeScripts = await glob('*.js', {
        cwd: path.join(PROJECT_ROOT, 'scripts', 'node-tools'),
        absolute: true
      });
      
      for (const script of nodeScripts) {
        const scriptName = path.basename(script);
        
        try {
          // Check if file is valid JavaScript
          await import(script);
          this.pass('scripts', scriptName);
        } catch (error) {
          this.fail('scripts', `${scriptName}: ${error.message}`);
        }
      }
      
      logger.success(`✅ ${nodeScripts.length} scripts Node.js validés\n`);
      
    } catch (error) {
      this.fail('scripts', `Error: ${error.message}`);
    }
  }

  pass(category, message) {
    this.results[category].passed++;
    if (message) {
      logger.log(`  ✓ ${message}`, { color: 'green' });
    }
  }

  fail(category, message) {
    this.results[category].failed++;
    logger.log(`  ✗ ${message}`, { color: 'red' });
  }

  warn(category, message) {
    this.results[category].warnings++;
    logger.log(`  ⚠️  ${message}`, { color: 'yellow' });
  }

  displaySummary() {
    logger.section('📊 RÉSUMÉ DE LA VALIDATION');
    
    const categories = [
      { name: 'App', key: 'app' },
      { name: 'Drivers', key: 'drivers' },
      { name: 'Images', key: 'images' },
      { name: 'Scripts', key: 'scripts' }
    ];
    
    for (const cat of categories) {
      const result = this.results[cat.key];
      const total = result.passed + result.failed + result.warnings;
      
      logger.log(`\n${cat.name}:`, { color: 'cyan' });
      logger.log(`  ✓ Passed: ${result.passed}`, { color: 'green' });
      
      if (result.warnings > 0) {
        logger.log(`  ⚠️  Warnings: ${result.warnings}`, { color: 'yellow' });
      }
      
      if (result.failed > 0) {
        logger.log(`  ✗ Failed: ${result.failed}`, { color: 'red' });
      }
    }
    
    console.log('');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ProjectValidator();
  
  validator.validate()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logger.error(`Erreur fatale: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    });
}

export default ProjectValidator;
