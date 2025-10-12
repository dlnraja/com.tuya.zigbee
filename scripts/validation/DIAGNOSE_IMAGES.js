#!/usr/bin/env node

/**
 * DIAGNOSE_IMAGES.js
 * Diagnostic complet des images App et Drivers
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║     🖼️  DIAGNOSTIC IMAGES APP & DRIVERS               ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const issues = [];
const warnings = [];

// 1. VÉRIFIER IMAGES APP
console.log('1️⃣  IMAGES APP (assets/images/)\n');

const appImagesDir = path.join('assets', 'images');
const requiredAppImages = [
  { name: 'small.png', width: 250, height: 175 },
  { name: 'large.png', width: 500, height: 350 },
  { name: 'xlarge.png', width: 1000, height: 700 }
];

if (!fs.existsSync(appImagesDir)) {
  issues.push('Dossier assets/images/ manquant');
  console.log('   ❌ Dossier manquant: assets/images/\n');
} else {
  requiredAppImages.forEach(({ name, width, height }) => {
    const imgPath = path.join(appImagesDir, name);
    if (fs.existsSync(imgPath)) {
      const stats = fs.statSync(imgPath);
      const sizeMB = (stats.size / 1024).toFixed(1);
      console.log(`   ✅ ${name}: ${sizeMB} KB`);
      
      // Vérifier si trop petit (potentiel problème)
      if (stats.size < 1024) {
        warnings.push(`${name} très petit (${sizeMB} KB)`);
        console.log(`      ⚠️  Taille suspecte: ${sizeMB} KB`);
      }
    } else {
      issues.push(`Image app manquante: ${name}`);
      console.log(`   ❌ ${name} MANQUANTE`);
    }
  });
  console.log('');
}

// 2. VÉRIFIER APP.JSON REFERENCES
console.log('2️⃣  APP.JSON - RÉFÉRENCES IMAGES\n');

try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  
  const expectedPaths = {
    small: '/assets/images/small.png',
    large: '/assets/images/large.png',
    xlarge: '/assets/images/xlarge.png'
  };
  
  if (!appJson.images) {
    issues.push('app.json: section "images" manquante');
    console.log('   ❌ Section "images" manquante\n');
  } else {
    Object.entries(expectedPaths).forEach(([key, expectedPath]) => {
      const actualPath = appJson.images[key];
      if (actualPath === expectedPath) {
        console.log(`   ✅ ${key}: ${actualPath}`);
      } else if (actualPath) {
        issues.push(`app.json: chemin ${key} incorrect: ${actualPath}`);
        console.log(`   ❌ ${key}: ${actualPath}`);
        console.log(`      Attendu: ${expectedPath}`);
      } else {
        issues.push(`app.json: ${key} manquant`);
        console.log(`   ❌ ${key}: MANQUANT`);
      }
    });
    console.log('');
  }
} catch (e) {
  issues.push(`Erreur lecture app.json: ${e.message}`);
  console.log(`   ❌ Erreur: ${e.message}\n`);
}

// 3. VÉRIFIER DRIVERS IMAGES
console.log('3️⃣  DRIVERS IMAGES\n');

const driversDir = 'drivers';
const requiredDriverImages = ['small.png', 'large.png', 'xlarge.png'];

if (!fs.existsSync(driversDir)) {
  issues.push('Dossier drivers/ manquant');
  console.log('   ❌ Dossier drivers/ manquant\n');
} else {
  const drivers = fs.readdirSync(driversDir).filter(d =>
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );
  
  let driversOk = 0;
  let driversMissingImages = 0;
  let driversMissingXlarge = 0;
  let driversWrongPaths = 0;
  
  drivers.forEach(driver => {
    const driverPath = path.join(driversDir, driver);
    const assetsPath = path.join(driverPath, 'assets');
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    let hasAllImages = true;
    let hasXlarge = true;
    
    // Vérifier assets/
    if (!fs.existsSync(assetsPath)) {
      driversMissingImages++;
      hasAllImages = false;
    } else {
      requiredDriverImages.forEach(img => {
        if (!fs.existsSync(path.join(assetsPath, img))) {
          hasAllImages = false;
          if (img === 'xlarge.png') {
            hasXlarge = false;
            driversMissingXlarge++;
          }
        }
      });
    }
    
    // Vérifier driver.compose.json
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        if (compose.images) {
          const { small, large, xlarge } = compose.images;
          
          // Vérifier chemins corrects
          const validPaths = [
            './assets/small.png',
            './assets/large.png',
            './assets/xlarge.png',
            '/drivers/' + driver + '/assets/small.png',
            '/drivers/' + driver + '/assets/large.png',
            '/drivers/' + driver + '/assets/xlarge.png'
          ];
          
          if (small && large) {
            const smallOk = small.startsWith('./assets/') || small.startsWith('/drivers/');
            const largeOk = large.startsWith('./assets/') || large.startsWith('/drivers/');
            
            if (!smallOk || !largeOk) {
              driversWrongPaths++;
            }
          }
        }
      } catch (e) {
        // Ignorer erreurs JSON
      }
    }
    
    if (hasAllImages && hasXlarge) {
      driversOk++;
    }
  });
  
  console.log(`   Total drivers:              ${drivers.length}`);
  console.log(`   Drivers images OK:          ${driversOk} (${Math.round(driversOk/drivers.length*100)}%)`);
  
  if (driversMissingXlarge > 0) {
    console.log(`   ⚠️  Manque xlarge.png:       ${driversMissingXlarge}`);
    warnings.push(`${driversMissingXlarge} drivers sans xlarge.png`);
  }
  
  if (driversWrongPaths > 0) {
    console.log(`   ⚠️  Chemins incorrects:      ${driversWrongPaths}`);
    warnings.push(`${driversWrongPaths} drivers avec chemins incorrects`);
  }
  
  if (driversMissingImages > 0) {
    console.log(`   ❌ Sans dossier assets:     ${driversMissingImages}`);
    issues.push(`${driversMissingImages} drivers sans assets/`);
  }
  
  console.log('');
}

// 4. VÉRIFIER DUPLICATION/SIMILARITÉ
console.log('4️⃣  ANALYSE SIMILARITÉ IMAGES APP\n');

if (fs.existsSync(appImagesDir)) {
  const images = requiredAppImages
    .map(({ name }) => path.join(appImagesDir, name))
    .filter(p => fs.existsSync(p));
  
  if (images.length === 3) {
    const sizes = images.map(p => fs.statSync(p).size);
    const [small, large, xlarge] = sizes;
    
    // Vérifier si toutes les tailles sont identiques (problème!)
    if (small === large && large === xlarge) {
      issues.push('Les 3 images app ont la MÊME taille (fichiers identiques?)');
      console.log('   ❌ ALERTE: Les 3 images ont la même taille!');
      console.log(`      Size: ${(small / 1024).toFixed(1)} KB`);
      console.log('      → Fichiers potentiellement identiques\n');
    } else {
      // Vérifier progression logique des tailles
      if (small < large && large < xlarge) {
        console.log('   ✅ Progression taille correcte:');
        console.log(`      small  → large:  × ${(large / small).toFixed(2)}`);
        console.log(`      large  → xlarge: × ${(xlarge / large).toFixed(2)}`);
        console.log(`      small  → xlarge: × ${(xlarge / small).toFixed(2)}\n`);
      } else {
        warnings.push('Progression taille images anormale');
        console.log('   ⚠️  Progression anormale:');
        console.log(`      small:  ${(small / 1024).toFixed(1)} KB`);
        console.log(`      large:  ${(large / 1024).toFixed(1)} KB`);
        console.log(`      xlarge: ${(xlarge / 1024).toFixed(1)} KB\n`);
      }
    }
  } else {
    console.log('   ⚠️  Impossible d\'analyser (images manquantes)\n');
  }
}

// 5. RECOMMANDATIONS
console.log('5️⃣  RECOMMANDATIONS\n');

if (issues.length === 0 && warnings.length === 0) {
  console.log('   ✅ Aucun problème détecté!\n');
} else {
  if (issues.length > 0) {
    console.log('   ❌ PROBLÈMES À CORRIGER:\n');
    issues.forEach((issue, i) => {
      console.log(`      ${i + 1}. ${issue}`);
    });
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('   ⚠️  AVERTISSEMENTS:\n');
    warnings.forEach((warn, i) => {
      console.log(`      ${i + 1}. ${warn}`);
    });
    console.log('');
  }
}

// 6. SOLUTIONS PROPOSÉES
console.log('6️⃣  SOLUTIONS\n');

if (issues.some(i => i.includes('identiques'))) {
  console.log('   🔧 Images identiques détectées:');
  console.log('      → Exécuter: node scripts/generation/GENERATE_UNIQUE_APP_IMAGES.js');
  console.log('      → Cela créera 3 designs VRAIMENT différents\n');
}

if (warnings.some(w => w.includes('xlarge.png'))) {
  console.log('   🔧 Drivers sans xlarge.png:');
  console.log('      → Exécuter script de génération xlarge pour tous drivers');
  console.log('      → Ou ajouter manuellement xlarge.png (1000×1000)\n');
}

if (issues.some(i => i.includes('chemins'))) {
  console.log('   🔧 Chemins incorrects:');
  console.log('      → Images app doivent être: /assets/images/*.png');
  console.log('      → Images drivers doivent être: ./assets/*.png\n');
}

// RÉSUMÉ FINAL
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║                    RÉSUMÉ DIAGNOSTIC                   ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log(`   Erreurs:          ${issues.length}`);
console.log(`   Avertissements:   ${warnings.length}`);
console.log('');

if (issues.length === 0) {
  console.log('   ✅ Configuration images CORRECTE\n');
  process.exit(0);
} else {
  console.log('   ❌ Corrections nécessaires\n');
  process.exit(1);
}
