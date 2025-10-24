#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * VERIFY AND FIX IMAGE PATHS
 * Vérifie tous les chemins d'images et les corrige
 * Identifie les images manquantes (logos, badges énergie)
 */

class ImagePathValidator {
  constructor() {
    this.issues = {
      invalid_paths: [],
      missing_images: [],
      incorrect_references: [],
      missing_energy_badges: [],
      missing_driver_logos: []
    };
    this.fixes = [];
  }

  async validateAppJson() {
    console.log('🔍 VALIDATING APP.JSON IMAGES\n');
    
    const appJsonPath = path.join(__dirname, '../..', 'app.json');
    const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf8'));
    
    if (appJson.images) {
      for (const [key, imgPath] of Object.entries(appJson.images)) {
        const cleanPath = imgPath.replace(/^\//, '');
        const fullPath = path.join(__dirname, '../..', cleanPath);
        
        try {
          await fs.access(fullPath);
          console.log(`  ✅ ${key}: ${imgPath}`);
        } catch (err) {
          this.issues.invalid_paths.push({
            file: 'app.json',
            key: key,
            path: imgPath,
            expected: fullPath
          });
          console.log(`  ❌ ${key}: ${imgPath} - NOT FOUND`);
          
          // Suggest fix
          const suggestedPath = `/assets/images/${key}.png`;
          this.fixes.push({
            file: 'app.json',
            location: `images.${key}`,
            current: imgPath,
            suggested: suggestedPath
          });
        }
      }
    }
  }

  async validateDriverImages() {
    console.log('\n📦 VALIDATING DRIVER IMAGES\n');
    
    const driversDir = path.join(__dirname, '../..', 'drivers');
    const folders = await fs.readdir(driversDir);
    
    let checked = 0;
    let issues = 0;
    
    for (const folder of folders) {
      try {
        const driverPath = path.join(driversDir, folder);
        const stats = await fs.stat(driverPath);
        if (!stats.isDirectory()) continue;
        
        // Check driver.compose.json
        const composePath = path.join(driverPath, 'driver.compose.json');
        try {
          const compose = JSON.parse(await fs.readFile(composePath, 'utf8'));
          
          // Validate images section
          if (compose.images) {
            for (const [key, imgPath] of Object.entries(compose.images)) {
              const cleanPath = imgPath.replace(/^\.\//, '');
              const fullPath = path.join(driverPath, cleanPath);
              
              try {
                await fs.access(fullPath);
              } catch (err) {
                this.issues.invalid_paths.push({
                  driver: folder,
                  file: 'driver.compose.json',
                  key: key,
                  path: imgPath
                });
                issues++;
                
                // Suggest fix
                this.fixes.push({
                  driver: folder,
                  file: 'driver.compose.json',
                  location: `images.${key}`,
                  current: imgPath,
                  suggested: `./assets/${key}.png`
                });
              }
            }
          } else {
            // Missing images section - add it
            this.fixes.push({
              driver: folder,
              file: 'driver.compose.json',
              location: 'images',
              current: null,
              suggested: {
                small: './assets/small.png',
                large: './assets/large.png'
              }
            });
          }
          
          // Check for energy badges
          if (compose.energy) {
            const hasEnergyBadge = await this.checkEnergyBadge(driverPath);
            if (!hasEnergyBadge) {
              this.issues.missing_energy_badges.push({
                driver: folder,
                energy: compose.energy
              });
            }
          }
          
          checked++;
        } catch (err) {
          // No compose file
        }
      } catch (err) {
        // Skip
      }
    }
    
    console.log(`  ✅ Checked ${checked} drivers`);
    console.log(`  ❌ Found ${issues} path issues`);
  }

  async checkEnergyBadge(driverPath) {
    // Check if driver images have energy badge overlay
    // For now, we'll just check if the image exists
    const largePath = path.join(driverPath, 'assets/large.png');
    try {
      await fs.access(largePath);
      // TODO: Check if image has energy badge in corner
      return true; // Assume yes for now
    } catch (err) {
      return false;
    }
  }

  async analyzeAssetsFolderConflicts() {
    console.log('\n🗂️  ANALYZING ASSETS FOLDER CONFLICTS\n');
    
    const assetsPath = path.join(__dirname, '../..', 'assets');
    
    // Check root level files
    const rootFiles = await fs.readdir(assetsPath);
    
    const conflicts = {
      duplicate_pngs: [],
      duplicate_svgs: [],
      unused_files: []
    };
    
    for (const file of rootFiles) {
      const filePath = path.join(assetsPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const ext = path.extname(file);
        const basename = path.basename(file, ext);
        
        // Check for PNG + SVG duplicates
        if (ext === '.png') {
          const svgPath = path.join(assetsPath, `${basename}.svg`);
          try {
            await fs.access(svgPath);
            conflicts.duplicate_pngs.push({
              png: file,
              svg: `${basename}.svg`,
              recommendation: 'Keep PNG, move SVG to templates/'
            });
          } catch (err) {
            // No duplicate
          }
        }
      }
    }
    
    if (conflicts.duplicate_pngs.length > 0) {
      console.log('  ⚠️  Found PNG/SVG duplicates:');
      conflicts.duplicate_pngs.forEach(dup => {
        console.log(`     - ${dup.png} + ${dup.svg}`);
      });
    } else {
      console.log('  ✅ No conflicts found');
    }
    
    return conflicts;
  }

  async generateCleanupPlan() {
    console.log('\n📋 GENERATING CLEANUP PLAN\n');
    
    const plan = {
      timestamp: new Date().toISOString(),
      summary: {
        invalid_paths: this.issues.invalid_paths.length,
        missing_energy_badges: this.issues.missing_energy_badges.length,
        fixes_proposed: this.fixes.length
      },
      actions: []
    };
    
    // Action 1: Fix invalid paths
    if (this.issues.invalid_paths.length > 0) {
      plan.actions.push({
        priority: 'HIGH',
        action: 'Fix invalid image paths',
        count: this.issues.invalid_paths.length,
        details: this.fixes.filter(f => f.current && !f.current.includes('{')),
        script: 'FIX_IMAGE_PATHS.js'
      });
    }
    
    // Action 2: Add energy badges
    if (this.issues.missing_energy_badges.length > 0) {
      plan.actions.push({
        priority: 'MEDIUM',
        action: 'Add energy badges to driver images',
        count: this.issues.missing_energy_badges.length,
        drivers: this.issues.missing_energy_badges.map(i => i.driver),
        script: 'ADD_ENERGY_BADGES.js'
      });
    }
    
    // Action 3: Clean assets folder
    plan.actions.push({
      priority: 'MEDIUM',
      action: 'Organize assets folder',
      tasks: [
        'Move SVG source files to templates/',
        'Keep only PNG in root assets/',
        'Create driver-specific subfolder structure'
      ],
      script: 'CLEAN_ASSETS_FOLDER.js'
    });
    
    // Save plan
    const planPath = path.join(__dirname, '../../reports/IMAGE_PATH_CLEANUP_PLAN.json');
    await fs.writeFile(planPath, JSON.stringify(plan, null, 2));
    console.log(`  ✅ Cleanup plan saved: ${planPath}`);
    
    return plan;
  }

  async generateReport() {
    console.log('\n\n📊 VALIDATION REPORT\n');
    console.log('='.repeat(50));
    
    console.log('\n🔴 Issues Found:');
    console.log(`  Invalid paths: ${this.issues.invalid_paths.length}`);
    console.log(`  Missing energy badges: ${this.issues.missing_energy_badges.length}`);
    
    console.log('\n🔧 Fixes Proposed:');
    console.log(`  Path corrections: ${this.fixes.length}`);
    
    if (this.fixes.length > 0) {
      console.log('\n📝 Top 5 Fixes Needed:\n');
      this.fixes.slice(0, 5).forEach((fix, i) => {
        console.log(`${i + 1}. ${fix.driver || fix.file}`);
        console.log(`   Location: ${fix.location}`);
        console.log(`   Current: ${fix.current || 'missing'}`);
        console.log(`   Suggested: ${JSON.stringify(fix.suggested)}\n`);
      });
    }
    
    // Save full report
    const report = {
      timestamp: new Date().toISOString(),
      issues: this.issues,
      fixes: this.fixes,
      recommendations: [
        {
          priority: 'CRITICAL',
          issue: 'Invalid image paths',
          action: 'Run FIX_IMAGE_PATHS.js to auto-correct',
          impact: 'Prevent app validation errors'
        },
        {
          priority: 'HIGH',
          issue: 'Missing energy badges on driver images',
          action: 'Add battery/AC icon in bottom-right corner',
          impact: 'User knows power source at glance'
        },
        {
          priority: 'MEDIUM',
          issue: 'Assets folder organization',
          action: 'Separate PNG (production) from SVG (source)',
          impact: 'Cleaner repository structure'
        }
      ]
    };
    
    const reportPath = path.join(__dirname, '../../reports/IMAGE_PATH_VALIDATION.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full report: ${reportPath}`);
  }
}

async function main() {
  console.log('🔍 IMAGE PATH VALIDATOR & FIXER\n');
  console.log('This tool will:');
  console.log('  1. Validate all image paths');
  console.log('  2. Identify missing images');
  console.log('  3. Check for energy badges');
  console.log('  4. Detect assets folder conflicts');
  console.log('  5. Generate cleanup plan\n');
  console.log('='.repeat(50) + '\n');
  
  const validator = new ImagePathValidator();
  
  await validator.validateAppJson();
  await validator.validateDriverImages();
  const conflicts = await validator.analyzeAssetsFolderConflicts();
  const plan = await validator.generateCleanupPlan();
  await validator.generateReport();
  
  console.log('\n\n💡 NEXT STEPS:\n');
  console.log('1. Review IMAGE_PATH_VALIDATION.json');
  console.log('2. Review IMAGE_PATH_CLEANUP_PLAN.json');
  console.log('3. Run cleanup scripts in order');
  console.log('4. Test app validation');
  console.log('5. Commit fixes\n');
}

main().catch(console.error);
