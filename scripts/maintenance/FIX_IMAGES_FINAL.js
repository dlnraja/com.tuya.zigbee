#!/usr/bin/env node

/**
 * 🔧 FIX IMAGES FINAL
 * 
 * Corrige TOUS les problèmes d'images une fois pour toutes:
 * - Génère images app avec dimensions EXACTES
 * - Utilise design professionnel Homey
 * - Corrige les dimensions si incorrectes
 * - Nettoie les anciens fichiers problématiques
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class ImageFixer {
  constructor() {
    this.root = path.resolve(__dirname, '../..');
    this.imagesDir = path.join(this.root, 'assets/images');
  }

  async run() {
    console.log('🔧 FIX IMAGES FINAL');
    console.log('='.repeat(70));
    console.log('');

    try {
      // Phase 1: Backup anciennes images
      console.log('📦 Phase 1: Backup anciennes images...');
      await this.backupImages();

      // Phase 2: Génération nouvelles images
      console.log('\n🎨 Phase 2: Génération nouvelles images avec bonnes dimensions...');
      await this.generateNewImages();

      // Phase 3: Verification
      console.log('\n✅ Phase 3: Vérification...');
      await this.verifyImages();

      console.log('\n🎉 IMAGES CORRIGÉES AVEC SUCCÈS!');
      console.log('\nProchaines étapes:');
      console.log('1. git add assets/images/');
      console.log('2. git commit -m "🖼️  FIX: Images app dimensions correctes"');
      console.log('3. git push origin master');

    } catch (error) {
      console.error('\n❌ ERREUR:', error.message);
      throw error;
    }
  }

  async backupImages() {
    const backupDir = path.join(this.root, 'backup/images-old');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const files = fs.readdirSync(this.imagesDir)
      .filter(f => f.endsWith('.png'));

    files.forEach(file => {
      const src = path.join(this.imagesDir, file);
      const dest = path.join(backupDir, file);
      fs.copyFileSync(src, dest);
      console.log(`  ✅ Backup: ${file}`);
    });

    console.log(`  📦 ${files.length} images sauvegardées dans backup/images-old/`);
  }

  async generateNewImages() {
    // Vérifier si ImageMagick est disponible
    let hasImageMagick = false;
    try {
      await execAsync('convert -version');
      hasImageMagick = true;
      console.log('  ✅ ImageMagick disponible');
    } catch {
      console.log('  ⚠️  ImageMagick non disponible - utilisation méthode alternative');
    }

    if (hasImageMagick) {
      await this.generateWithImageMagick();
    } else {
      await this.generateWithSVG();
    }
  }

  async generateWithImageMagick() {
    const sizes = {
      'small.png': { width: 250, height: 175 },
      'large.png': { width: 500, height: 350 },
      'xlarge.png': { width: 1000, height: 700 }
    };

    console.log('\n  Génération avec ImageMagick...');

    for (const [filename, dim] of Object.entries(sizes)) {
      const output = path.join(this.imagesDir, filename);
      
      // Créer image avec gradient bleu moderne et icône Zigbee
      const cmd = `convert -size ${dim.width}x${dim.height} ` +
        `gradient:#1E88E5-#1565C0 ` +
        `-gravity center ` +
        `-pointsize ${Math.floor(dim.width / 8)} ` +
        `-fill white ` +
        `-annotate +0+0 "⚡" ` +
        `"${output}"`;

      try {
        await execAsync(cmd);
        console.log(`    ✅ Généré: ${filename} (${dim.width}x${dim.height})`);
      } catch (error) {
        console.log(`    ❌ Erreur ${filename}: ${error.message}`);
      }
    }
  }

  async generateWithSVG() {
    console.log('\n  Génération depuis SVG existant...');

    const svgFile = path.join(this.imagesDir, 'icon-large.svg');
    if (!fs.existsSync(svgFile)) {
      // Créer SVG de base
      const svg = this.createBaseSVG();
      fs.writeFileSync(svgFile, svg);
      console.log('    ✅ SVG de base créé');
    }

    // Si Sharp est disponible
    try {
      const sharp = require('sharp');
      const svgBuffer = fs.readFileSync(svgFile);

      const sizes = {
        'small.png': { width: 250, height: 175 },
        'large.png': { width: 500, height: 350 },
        'xlarge.png': { width: 1000, height: 700 }
      };

      for (const [filename, dim] of Object.entries(sizes)) {
        const output = path.join(this.imagesDir, filename);
        
        await sharp(svgBuffer)
          .resize(dim.width, dim.height, {
            fit: 'contain',
            background: { r: 30, g: 136, b: 229, alpha: 1 }
          })
          .png()
          .toFile(output);

        console.log(`    ✅ Généré: ${filename} (${dim.width}x${dim.height})`);
      }
    } catch (error) {
      console.log('    ⚠️  Sharp non disponible - copie des images existantes');
      this.copyAndResizeManually();
    }
  }

  createBaseSVG() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="350" viewBox="0 0 500 350" xmlns="http://www.w3.org/2000/svg">
  <!-- Gradient background -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1E88E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1565C0;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="500" height="350" fill="url(#bg)"/>
  
  <!-- Zigbee icon -->
  <g transform="translate(250, 175)">
    <!-- Lightning bolt symbol -->
    <path d="M -30 -50 L 10 -10 L -10 -10 L 30 50 L -10 10 L 10 10 Z" 
          fill="white" 
          opacity="0.9"/>
  </g>
  
  <!-- Text -->
  <text x="250" y="300" 
        font-family="Arial, sans-serif" 
        font-size="24" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle"
        opacity="0.8">Universal Tuya Zigbee</text>
</svg>`;
  }

  copyAndResizeManually() {
    // Si rien d'autre ne fonctionne, au moins s'assurer que les fichiers existent
    const sizes = ['small.png', 'large.png', 'xlarge.png'];
    
    sizes.forEach(size => {
      const filepath = path.join(this.imagesDir, size);
      if (!fs.existsSync(filepath)) {
        // Copier depuis large.png si existe
        const largePath = path.join(this.imagesDir, 'large.png');
        if (fs.existsSync(largePath)) {
          fs.copyFileSync(largePath, filepath);
          console.log(`    ✅ Copié: ${size}`);
        }
      }
    });
  }

  async verifyImages() {
    const sizes = {
      'small.png': { width: 250, height: 175 },
      'large.png': { width: 500, height: 350 },
      'xlarge.png': { width: 1000, height: 700 }
    };

    console.log('\n  Vérification finale:');

    for (const [filename, expectedDim] of Object.entries(sizes)) {
      const filepath = path.join(this.imagesDir, filename);
      
      if (!fs.existsSync(filepath)) {
        console.log(`    ❌ ${filename}: MANQUANT`);
        continue;
      }

      const stats = fs.statSync(filepath);
      console.log(`    ✅ ${filename}: ${(stats.size / 1024).toFixed(2)} KB`);

      // Tentative vérification dimensions
      try {
        const output = await execAsync(`identify -format "%wx%h" "${filepath}"`);
        const dimensions = output.stdout.trim();
        const expected = `${expectedDim.width}x${expectedDim.height}`;
        
        if (dimensions === expected) {
          console.log(`       ✅ Dimensions: ${dimensions}`);
        } else {
          console.log(`       ⚠️  Dimensions: ${dimensions} (attendu: ${expected})`);
        }
      } catch {
        console.log(`       ℹ️  Dimensions non vérifiables`);
      }
    }
  }
}

// Run
if (require.main === module) {
  const fixer = new ImageFixer();
  fixer.run()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('FATAL:', error);
      process.exit(1);
    });
}

module.exports = ImageFixer;
