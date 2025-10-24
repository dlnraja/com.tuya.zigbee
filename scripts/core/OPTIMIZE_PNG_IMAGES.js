#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

/**
 * OPTIMIZE PNG IMAGES - ORCHESTRATEUR COMPLET
 * 1. Vérifie format PNG uniquement
 * 2. Optimise taille PNG sans perte qualité
 * 3. Valide chemins dans app.json + drivers
 * 4. Respecte limites Homey App Store (<50MB)
 */

const HOMEY_IMAGE_SPECS = {
  app: {
    small: { width: 250, height: 175, maxSize: 50 * 1024 }, // 50KB
    large: { width: 500, height: 350, maxSize: 100 * 1024 }, // 100KB
    xlarge: { width: 1000, height: 700, maxSize: 200 * 1024 } // 200KB
  },
  driver: {
    small: { width: 75, height: 75, maxSize: 10 * 1024 }, // 10KB
    large: { width: 500, height: 500, maxSize: 50 * 1024 } // 50KB
  }
};

class ImageOptimizer {
  constructor() {
    this.stats = {
      total_images: 0,
      png_images: 0,
      svg_images: 0,
      oversized_images: [],
      invalid_paths: [],
      total_size_before: 0,
      total_size_after: 0
    };
  }

  async analyzeAppImages() {
    console.log('📊 ANALYZING APP IMAGES\n');
    
    const appImagesDir = path.join(__dirname, '../..', 'assets/images');
    
    try {
      const files = await fs.readdir(appImagesDir);
      
      for (const file of files) {
        if (file === '.force-update') continue;
        
        const filePath = path.join(appImagesDir, file);
        const stats = await fs.stat(filePath);
        
        this.stats.total_images++;
        this.stats.total_size_before += stats.size;
        
        const ext = path.extname(file).toLowerCase();
        
        if (ext === '.png') {
          this.stats.png_images++;
          
          // Check size
          const type = String(file).replace('.png', '');
          const spec = HOMEY_IMAGE_SPECS.app[type];
          
          if (spec && stats.size > spec.maxSize) {
            this.stats.oversized_images.push({
              path: `assets/images/${file}`,
              size: stats.size,
              maxSize: spec.maxSize,
              reduction: Math.round((1 - spec.maxSize / stats.size) * 100)
            });
          }
          
          console.log(`  ✅ ${file}: ${this.formatSize(stats.size)}`);
        } else if (ext === '.svg') {
          this.stats.svg_images++;
          console.log(`  ⚠️  ${file}: SVG (should convert to PNG)`);
        }
      }
    } catch (err) {
      console.error('Error analyzing app images:', err.message);
    }
  }

  async analyzeDriverImages() {
    console.log('\n📦 ANALYZING DRIVER IMAGES\n');
    
    const driversDir = path.join(__dirname, '../..', 'drivers');
    const folders = await fs.readdir(driversDir);
    
    let count = 0;
    for (const folder of folders) {
      try {
        const driverPath = path.join(driversDir, folder);
        const stats = await fs.stat(driverPath);
        if (!stats.isDirectory()) continue;
        
        const assetsPath = path.join(driverPath, 'assets');
        const smallPath = path.join(assetsPath, 'small.png');
        const largePath = path.join(assetsPath, 'large.png');
        
        // Check small.png
        try {
          const smallStats = await fs.stat(smallPath);
          this.stats.total_images++;
          this.stats.png_images++;
          this.stats.total_size_before += smallStats.size;
          
          if (smallStats.size > HOMEY_IMAGE_SPECS.driver.small.maxSize) {
            this.stats.oversized_images.push({
              path: `drivers/${folder}/assets/small.png`,
              size: smallStats.size,
              maxSize: HOMEY_IMAGE_SPECS.driver.small.maxSize,
              reduction: Math.round((1 - HOMEY_IMAGE_SPECS.driver.small.maxSize / smallStats.size) * 100)
            });
          }
        } catch (err) {
          // File doesn't exist
        }
        
        // Check large.png
        try {
          const largeStats = await fs.stat(largePath);
          this.stats.total_images++;
          this.stats.png_images++;
          this.stats.total_size_before += largeStats.size;
          
          if (largeStats.size > HOMEY_IMAGE_SPECS.driver.large.maxSize) {
            this.stats.oversized_images.push({
              path: `drivers/${folder}/assets/large.png`,
              size: largeStats.size,
              maxSize: HOMEY_IMAGE_SPECS.driver.large.maxSize,
              reduction: Math.round((1 - HOMEY_IMAGE_SPECS.driver.large.maxSize / largeStats.size) * 100)
            });
          }
        } catch (err) {
          // File doesn't exist
        }
        
        count++;
        if (count % 50 === 0) {
          console.log(`  Analyzed ${count}/${folders.length} drivers...`);
        }
      } catch (err) {
        // Skip
      }
    }
    
    console.log(`  ✅ Analyzed ${count} drivers`);
  }

  async validateImagePaths() {
    console.log('\n🔍 VALIDATING IMAGE PATHS\n');
    
    // Check app.json
    const appJsonPath = path.join(__dirname, '../..', 'app.json');
    const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf8'));
    
    if (appJson.images) {
      for (const [key, imgPath] of Object.entries(appJson.images)) {
        const fullPath = path.join(__dirname, '../..', String(imgPath).replace(/^\//, ''));
        try {
          await fs.access(fullPath);
          console.log(`  ✅ app.json.images.${key}: ${imgPath}`);
        } catch (err) {
          this.stats.invalid_paths.push({
            location: `app.json.images.${key}`,
            path: imgPath,
            error: 'File not found'
          });
          console.log(`  ❌ app.json.images.${key}: ${imgPath} (NOT FOUND)`);
        }
      }
    }
    
    // Check drivers
    const driversDir = path.join(__dirname, '../..', 'drivers');
    const folders = await fs.readdir(driversDir);
    
    for (const folder of folders) {
      try {
        const driverPath = path.join(driversDir, folder);
        const stats = await fs.stat(driverPath);
        if (!stats.isDirectory()) continue;
        
        const composePath = path.join(driverPath, 'driver.compose.json');
        try {
          const compose = JSON.parse(await fs.readFile(composePath, 'utf8'));
          
          if (compose.images) {
            for (const [key, imgPath] of Object.entries(compose.images)) {
              const fullPath = path.join(driverPath, String(imgPath).replace(/^\.\//, ''));
              try {
                await fs.access(fullPath);
              } catch (err) {
                this.stats.invalid_paths.push({
                  location: `drivers/${folder}/driver.compose.json`,
                  path: imgPath,
                  error: 'File not found'
                });
              }
            }
          }
        } catch (err) {
          // No driver.compose.json
        }
      } catch (err) {
        // Skip
      }
    }
  }

  async optimizePNGs() {
    console.log('\n🔧 OPTIMIZING PNG FILES\n');
    console.log('This would compress PNGs without quality loss.\n');
    console.log('⚠️  Manual optimization recommended using:');
    console.log('   - pngquant (lossy compression)');
    console.log('   - optipng (lossless optimization)');
    console.log('   - imagemagick (resize + optimize)\n');
    
    if (this.stats.oversized_images.length > 0) {
      console.log('📊 OVERSIZED IMAGES FOUND:\n');
      this.stats.oversized_images.forEach((img, i) => {
        console.log(`${i + 1}. ${img.path}`);
        console.log(`   Current: ${this.formatSize(img.size)}`);
        console.log(`   Target: ${this.formatSize(img.maxSize)}`);
        console.log(`   Reduction needed: ${img.reduction}%\n`);
      });
    }
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async generateReport() {
    console.log('\n\n📊 OPTIMIZATION REPORT\n');
    console.log('='.repeat(50));
    
    console.log('\n📈 Statistics:');
    console.log(`  Total images: ${this.stats.total_images}`);
    console.log(`  PNG format: ${this.stats.png_images} (${Math.round(this.stats.png_images / this.stats.total_images * 100)}%)`);
    console.log(`  SVG format: ${this.stats.svg_images}`);
    console.log(`  Total size: ${this.formatSize(this.stats.total_size_before)}`);
    
    console.log('\n🔴 Issues:');
    console.log(`  Oversized images: ${this.stats.oversized_images.length}`);
    console.log(`  Invalid paths: ${this.stats.invalid_paths.length}`);
    
    if (this.stats.oversized_images.length > 0) {
      const potentialSavings = this.stats.oversized_images.reduce((sum, img) => {
        return sum + (img.size - img.maxSize);
      }, 0);
      console.log(`  Potential size reduction: ${this.formatSize(potentialSavings)}`);
    }
    
    console.log('\n✅ Compliance:');
    const appSizeMB = this.stats.total_size_before / (1024 * 1024);
    console.log(`  Current app size (images only): ${appSizeMB.toFixed(2)} MB`);
    console.log(`  Homey limit: 50 MB`);
    console.log(`  Status: ${appSizeMB < 50 ? '✅ OK' : '❌ EXCEEDS LIMIT'}`);
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_images: this.stats.total_images,
        png_images: this.stats.png_images,
        svg_images: this.stats.svg_images,
        total_size_bytes: this.stats.total_size_before,
        total_size_mb: (this.stats.total_size_before / (1024 * 1024)).toFixed(2)
      },
      issues: {
        oversized_count: this.stats.oversized_images.length,
        oversized_images: this.stats.oversized_images.slice(0, 20),
        invalid_paths: this.stats.invalid_paths
      },
      recommendations: this.generateRecommendations()
    };
    
    const reportPath = path.join(__dirname, '../../reports/PNG_OPTIMIZATION_REPORT.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full report: ${reportPath}`);
    
    return report;
  }

  generateRecommendations() {
    const recs = [];
    
    if (this.stats.oversized_images.length > 0) {
      recs.push({
        priority: 'HIGH',
        issue: `${this.stats.oversized_images.length} images exceed Homey size limits`,
        action: 'Compress PNG files using pngquant or optipng',
        impact: 'Reduce app size, faster downloads'
      });
    }
    
    if (this.stats.svg_images > 0) {
      recs.push({
        priority: 'MEDIUM',
        issue: `${this.stats.svg_images} SVG files found`,
        action: 'Convert SVG to optimized PNG at correct dimensions',
        impact: 'Better compatibility, controlled file size'
      });
    }
    
    if (this.stats.invalid_paths.length > 0) {
      recs.push({
        priority: 'CRITICAL',
        issue: `${this.stats.invalid_paths.length} invalid image paths`,
        action: 'Fix paths in app.json and driver.compose.json files',
        impact: 'Prevent app validation errors'
      });
    }
    
    return recs;
  }
}

async function main() {
  console.log('🎨 PNG IMAGE OPTIMIZER - ORCHESTRATEUR COMPLET\n');
  console.log('This tool will:');
  console.log('  1. Analyze all PNG images');
  console.log('  2. Identify oversized files');
  console.log('  3. Validate image paths');
  console.log('  4. Generate optimization report\n');
  console.log('='.repeat(50) + '\n');
  
  const optimizer = new ImageOptimizer();
  
  await optimizer.analyzeAppImages();
  await optimizer.analyzeDriverImages();
  await optimizer.validateImagePaths();
  await optimizer.optimizePNGs();
  await optimizer.generateReport();
  
  console.log('\n\n💡 NEXT STEPS:\n');
  console.log('1. Review PNG_OPTIMIZATION_REPORT.json');
  console.log('2. Install optimization tools:');
  console.log('   npm install -g pngquant-bin optipng-bin');
  console.log('3. Run bulk optimization:');
  console.log('   node scripts/automation/BULK_OPTIMIZE_PNGS.js');
  console.log('4. Verify app size < 50MB');
  console.log('5. Test image quality in Homey app\n');
}

main().catch(console.error);
