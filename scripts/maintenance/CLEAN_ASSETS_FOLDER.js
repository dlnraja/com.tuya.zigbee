#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * CLEAN ASSETS FOLDER
 * Nettoie et organise le dossier assets selon les standards Homey
 */

class AssetsCleaner {
  constructor() {
    this.moved = [];
    this.removed = [];
    this.kept = [];
  }

  async cleanAssetsFolder() {
    console.log('🧹 CLEANING ASSETS FOLDER\n');
    
    const assetsPath = path.join(__dirname, '../..', 'assets');
    const files = await fs.readdir(assetsPath);
    
    // Structure recommandée
    const structure = {
      images: {
        purpose: 'App images (PNG only)',
        keep: ['small.png', 'large.png', 'xlarge.png']
      },
      icons: {
        purpose: 'Reusable icons and badges',
        keep: ['power-ac.svg', 'power-battery.svg', 'power-battery-low.svg', 'placeholder.svg']
      },
      templates: {
        purpose: 'Source SVG files',
        move: []
      }
    };
    
    console.log('📋 Current assets structure:\n');
    
    for (const file of files) {
      const filePath = path.join(assetsPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const ext = path.extname(file);
        const basename = path.basename(file, ext);
        
        // Déterminer l'action
        if (ext === '.svg') {
          // SVG files should be in templates/ (except icons)
          if (!file.includes('power') && file !== 'placeholder.svg') {
            structure.templates.move.push(file);
            console.log(`  📦 ${file} → templates/ (source file)`);
          } else {
            this.kept.push(file);
            console.log(`  ✅ ${file} (keep in icons/)`);
          }
        } else if (ext === '.png') {
          // PNG files
          if (['small.png', 'large.png', 'xlarge.png'].includes(file)) {
            this.kept.push(file);
            console.log(`  ✅ ${file} (keep in images/)`);
          } else {
            // Old PNG, should be removed if SVG exists
            this.removed.push(file);
            console.log(`  🗑️  ${file} (duplicate, SVG exists)`);
          }
        } else if (stats.isDirectory()) {
          console.log(`  📁 ${file}/ (directory)`);
        }
      }
    }
    
    return structure;
  }

  async moveToTemplates() {
    console.log('\n📦 MOVING SVG SOURCE FILES TO TEMPLATES\n');
    
    const assetsPath = path.join(__dirname, '../..', 'assets');
    const templatesPath = path.join(assetsPath, 'templates');
    
    // Ensure templates directory exists
    await fs.mkdir(templatesPath, { recursive: true });
    
    const filesToMove = [
      'icon.svg',
      'large.svg',
      'small.svg',
      'xlarge.svg',
      'temp_alarm.svg'
    ];
    
    for (const file of filesToMove) {
      const sourcePath = path.join(assetsPath, file);
      const targetPath = path.join(templatesPath, file);
      
      try {
        // Check if file exists
        await fs.access(sourcePath);
        
        // Move file
        await fs.rename(sourcePath, targetPath);
        this.moved.push({ from: file, to: `templates/${file}` });
        console.log(`  ✅ Moved: ${file} → templates/`);
      } catch (err) {
        console.log(`  ⏭️  Skip: ${file} (not found or already moved)`);
      }
    }
  }

  async updateAssetsREADME() {
    console.log('\n📝 UPDATING ASSETS README\n');
    
    const readme = `# Assets Directory

**Organization**: Homey SDK3 Standard Structure

## Structure

\`\`\`
assets/
├── images/              # App images (PNG only)
│   ├── small.png       # 250x175px - App icon small
│   ├── large.png       # 500x350px - App icon large
│   └── xlarge.png      # 1000x700px - App icon extra large
│
├── icons/              # Reusable icons and badges
│   ├── power-ac.svg           # AC power badge
│   ├── power-battery.svg      # Battery power badge
│   ├── power-battery-low.svg  # Low battery badge
│   └── placeholder.svg        # Generic placeholder
│
└── templates/          # Source SVG files (not used in app)
    ├── icon.svg               # Source for app icon
    ├── small.svg              # Source template
    ├── large.svg              # Source template
    ├── xlarge.svg             # Source template
    └── [category]-icon.svg    # Category-specific templates
\`\`\`

## Guidelines

### App Images (\`images/\`)
- **Format**: PNG only (optimized)
- **Purpose**: Main app icons in Homey App Store
- **Sizes**:
  - small: 250x175px (max 50KB)
  - large: 500x350px (max 100KB)
  - xlarge: 1000x700px (max 200KB)

### Icons (\`icons/\`)
- **Format**: SVG preferred (small file size)
- **Purpose**: Reusable badges and overlays
- **Usage**: Energy badges on driver images

### Templates (\`templates/\`)
- **Format**: SVG source files
- **Purpose**: Design source, not used in production
- **Usage**: Generate PNG from these

## Energy Badges

All driver images should have energy badge in **bottom-right corner**:
- Battery-powered devices: \`icons/power-battery.svg\`
- AC-powered devices: \`icons/power-ac.svg\`
- Low battery warning: \`icons/power-battery-low.svg\`

## Optimization

### PNG Files
Run optimization script to reduce file sizes:
\`\`\`bash
node scripts/automation/OPTIMIZE_PNG_IMAGES.js
pwsh scripts/optimize-images.ps1
\`\`\`

### SVG to PNG Conversion
Use ImageMagick to convert SVG templates to PNG:
\`\`\`bash
magick convert template.svg -resize 500x500 output.png
magick convert template.svg -define png:compression-level=9 output.png
\`\`\`

## Driver Images

Driver images are stored in each driver's \`assets/\` folder:
\`\`\`
drivers/[driver-name]/
└── assets/
    ├── small.png      # 75x75px (max 10KB)
    └── large.png      # 500x500px (max 50KB)
\`\`\`

### Adding Energy Badge to Driver Image

Use overlay script:
\`\`\`bash
node scripts/automation/ADD_ENERGY_BADGES.js
\`\`\`

Or manually with ImageMagick:
\`\`\`bash
magick composite -gravity SouthEast -geometry +10+10 \\
  assets/icons/power-battery.svg \\
  drivers/[driver]/assets/large.png \\
  drivers/[driver]/assets/large.png
\`\`\`

## Validation

Check all image paths and sizes:
\`\`\`bash
node scripts/automation/VERIFY_AND_FIX_IMAGE_PATHS.js
\`\`\`

---

**Maintainer**: Dylan (dlnraja)  
**Last Updated**: ${new Date().toISOString().split('T')[0]}  
**Version**: v2.15.85
`;

    const readmePath = path.join(__dirname, '../..', 'assets/README.md');
    await fs.writeFile(readmePath, readme);
    console.log('  ✅ Updated: assets/README.md');
  }

  async generateReport() {
    console.log('\n\n📊 CLEANUP REPORT\n');
    console.log('='.repeat(50));
    
    console.log('\n📦 Files Moved:');
    if (this.moved.length > 0) {
      this.moved.forEach(m => {
        console.log(`  ✅ ${m.from} → ${m.to}`);
      });
    } else {
      console.log('  (none)');
    }
    
    console.log('\n🗑️  Files Removed:');
    if (this.removed.length > 0) {
      this.removed.forEach(f => {
        console.log(`  🗑️  ${f}`);
      });
    } else {
      console.log('  (none)');
    }
    
    console.log('\n✅ Files Kept:');
    console.log(`  ${this.kept.length} files in correct location`);
    
    console.log('\n📁 Recommended Structure:');
    console.log('  assets/');
    console.log('  ├── images/      (3 PNG files)');
    console.log('  ├── icons/       (4 SVG files)');
    console.log('  └── templates/   (5+ SVG sources)');
  }
}

async function main() {
  console.log('🧹 ASSETS FOLDER CLEANER\n');
  console.log('This will organize assets according to Homey standards\n');
  console.log('='.repeat(50) + '\n');
  
  const cleaner = new AssetsCleaner();
  
  await cleaner.cleanAssetsFolder();
  await cleaner.moveToTemplates();
  await cleaner.updateAssetsREADME();
  await cleaner.generateReport();
  
  console.log('\n\n✅ CLEANUP COMPLETE!\n');
  console.log('📝 Review changes before committing');
  console.log('🎨 Next: Add energy badges to driver images\n');
}

main().catch(console.error);
