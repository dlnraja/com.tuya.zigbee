const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🖼️  CORRECTIF ULTIME - IMAGES DRIVERS\n');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');

// ============================================================================
// DIAGNOSTIC: Pourquoi .homeybuild utilise mauvaises images?
// ============================================================================

function diagnoseImageIssue() {
  console.log('🔍 DIAGNOSTIC: Analyse problème images...\n');
  
  // Vérifier structure .homeybuild
  const homeybuildPath = path.join(PROJECT_ROOT, '.homeybuild');
  
  if (fs.existsSync(homeybuildPath)) {
    const testDriver = path.join(homeybuildPath, 'drivers', 'air_quality_monitor_ac');
    
    if (fs.existsSync(testDriver)) {
      console.log(`📁 Structure .homeybuild/drivers/air_quality_monitor_ac:`);
      
      try {
        const driverJson = path.join(testDriver, 'driver.json');
        if (fs.existsSync(driverJson)) {
          const driver = JSON.parse(fs.readFileSync(driverJson, 'utf8'));
          console.log(`   images config:`, JSON.stringify(driver.images, null, 2));
        }
        
        // Lister fichiers images
        const assetsPath = path.join(testDriver, 'assets');
        if (fs.existsSync(assetsPath)) {
          const files = fs.readdirSync(assetsPath);
          console.log(`   assets files:`, files);
        }
      } catch (err) {
        console.log(`   Erreur lecture: ${err.message}`);
      }
    }
  }
  
  console.log('');
}

// ============================================================================
// SOLUTION 1: Vérifier images object dans driver.compose.json
// ============================================================================

function fixDriverImagesConfig() {
  console.log('🔧 SOLUTION 1: Configuration images dans driver.compose.json...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );
  
  let fixed = 0;
  
  for (const driverName of drivers) {
    const composeJsonPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    
    if (!fs.existsSync(composeJsonPath)) continue;
    
    try {
      const driver = JSON.parse(fs.readFileSync(composeJsonPath, 'utf8'));
      let modified = false;
      
      // Vérifier si images object existe et pointe vers bonnes images
      if (!driver.images || typeof driver.images !== 'object') {
        // Ajouter configuration images explicite
        driver.images = {
          small: `./drivers/${driverName}/assets/images/small.png`,
          large: `./drivers/${driverName}/assets/images/large.png`,
          xlarge: `./drivers/${driverName}/assets/images/xlarge.png`
        };
        modified = true;
      } else {
        // Vérifier chemins
        const expectedPaths = {
          small: `./drivers/${driverName}/assets/images/small.png`,
          large: `./drivers/${driverName}/assets/images/large.png`,
          xlarge: `./drivers/${driverName}/assets/images/xlarge.png`
        };
        
        for (const [size, expectedPath] of Object.entries(expectedPaths)) {
          if (driver.images[size] !== expectedPath) {
            driver.images[size] = expectedPath;
            modified = true;
          }
        }
      }
      
      if (modified) {
        fs.writeFileSync(composeJsonPath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
        console.log(`✅ ${driverName}: Configuration images corrigée`);
        fixed++;
      }
      
    } catch (err) {
      console.error(`❌ ${driverName}: ${err.message}`);
    }
  }
  
  console.log(`\n📊 ${fixed} drivers mis à jour\n`);
  return fixed;
}

// ============================================================================
// SOLUTION 2: Créer images manquantes avec bonnes dimensions
// ============================================================================

function ensureAllDriverImages() {
  console.log('🔧 SOLUTION 2: Vérification/création images drivers...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );
  
  const DRIVER_IMAGE_SPECS = {
    small: { width: 75, height: 75 },
    large: { width: 500, height: 500 },
    xlarge: { width: 1000, height: 1000 }
  };
  
  let created = 0;
  let verified = 0;
  
  for (const driverName of drivers) {
    const imagesPath = path.join(DRIVERS_DIR, driverName, 'assets', 'images');
    
    // Créer dossier si manquant
    if (!fs.existsSync(imagesPath)) {
      fs.mkdirSync(imagesPath, { recursive: true });
    }
    
    // Vérifier chaque image
    for (const [sizeName, specs] of Object.entries(DRIVER_IMAGE_SPECS)) {
      const imagePath = path.join(imagesPath, `${sizeName}.png`);
      
      if (fs.existsSync(imagePath)) {
        // Vérifier dimensions
        try {
          const identify = execSync(`magick identify -format "%wx%h" "${imagePath}"`, {
            encoding: 'utf8'
          }).trim();
          
          const [width, height] = identify.split('x').map(Number);
          
          if (width !== specs.width || height !== specs.height) {
            // Redimensionner
            execSync(`magick "${imagePath}" -resize ${specs.width}x${specs.height}! "${imagePath}"`);
            console.log(`🔄 ${driverName}/${sizeName}.png: Redimensionné ${width}x${height} → ${specs.width}x${specs.height}`);
            verified++;
          }
        } catch (err) {
          // Imagick pas disponible ou erreur
        }
      } else {
        // Créer image placeholder
        try {
          // Copier depuis template ou app images
          const sourcePath = path.join(PROJECT_ROOT, 'assets', 'images', `${sizeName}.png`);
          
          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, imagePath);
            // Redimensionner aux bonnes dimensions driver
            execSync(`magick "${imagePath}" -resize ${specs.width}x${specs.height}! "${imagePath}"`);
            console.log(`✨ ${driverName}/${sizeName}.png: Créé (${specs.width}x${specs.height})`);
            created++;
          }
        } catch (err) {
          console.error(`⚠️  ${driverName}/${sizeName}.png: ${err.message}`);
        }
      }
    }
  }
  
  console.log(`\n📊 ${created} images créées, ${verified} redimensionnées\n`);
  return created + verified;
}

// ============================================================================
// SOLUTION 3: Supprimer images dupliquées hors /assets/images/
// ============================================================================

function cleanDuplicateImages() {
  console.log('🔧 SOLUTION 3: Nettoyage images dupliquées...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );
  
  let cleaned = 0;
  
  for (const driverName of drivers) {
    const assetsPath = path.join(DRIVERS_DIR, driverName, 'assets');
    
    if (!fs.existsSync(assetsPath)) continue;
    
    // Images qui ne doivent PAS être dans /assets/ directement
    const files = fs.readdirSync(assetsPath);
    
    for (const file of files) {
      if (file.endsWith('.png') && ['small.png', 'large.png', 'xlarge.png'].includes(file)) {
        const filePath = path.join(assetsPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile()) {
          // Vérifier si image existe déjà dans /images/
          const correctPath = path.join(assetsPath, 'images', file);
          
          if (fs.existsSync(correctPath)) {
            // Supprimer duplicate
            fs.unlinkSync(filePath);
            console.log(`🗑️  ${driverName}/assets/${file}: Supprimé (duplicate)`);
            cleaned++;
          } else {
            // Déplacer vers /images/
            const imagesDir = path.join(assetsPath, 'images');
            if (!fs.existsSync(imagesDir)) {
              fs.mkdirSync(imagesDir, { recursive: true });
            }
            fs.renameSync(filePath, correctPath);
            console.log(`📦 ${driverName}/assets/${file}: Déplacé vers /images/`);
            cleaned++;
          }
        }
      }
    }
  }
  
  console.log(`\n📊 ${cleaned} images nettoyées\n`);
  return cleaned;
}

// ============================================================================
// SOLUTION 4: Rebuild avec cache nettoyé
// ============================================================================

function rebuildClean() {
  console.log('🔧 SOLUTION 4: Rebuild avec cache nettoyé...\n');
  
  try {
    // Nettoyer cache
    console.log('🧹 Nettoyage .homeybuild, .homeycompose...');
    execSync('Remove-Item -Recurse -Force .homeybuild,.homeycompose -ErrorAction SilentlyContinue', {
      cwd: PROJECT_ROOT,
      shell: 'powershell.exe',
      stdio: 'inherit'
    });
    
    // Rebuild
    console.log('\n🔨 Build app...');
    execSync('homey app build', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });
    
    console.log('\n✅ Build terminé\n');
    return true;
  } catch (err) {
    console.error('\n❌ Build failed:', err.message);
    return false;
  }
}

// ============================================================================
// VALIDATION FINALE
// ============================================================================

function validateImages() {
  console.log('🔍 VALIDATION FINALE...\n');
  
  try {
    execSync('homey app validate --level publish', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });
    
    console.log('\n🎉 VALIDATION PASSED!\n');
    return true;
  } catch (err) {
    console.log('\n⚠️  Validation has issues\n');
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🖼️  CORRECTIF ULTIME - IMAGES DRIVERS HOMEY SDK3');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Diagnostic
    diagnoseImageIssue();
    
    // Solution 1: Config
    const configFixed = fixDriverImagesConfig();
    
    // Solution 2: Images
    const imagesEnsured = ensureAllDriverImages();
    
    // Solution 3: Cleanup
    const imagesCleaned = cleanDuplicateImages();
    
    // Solution 4: Rebuild
    const buildSuccess = rebuildClean();
    
    if (!buildSuccess) {
      throw new Error('Build failed');
    }
    
    // Validation
    const validationPassed = validateImages();
    
    // Résumé
    console.log('═══════════════════════════════════════════════════════');
    console.log('                    📊 RÉSUMÉ FINAL');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Config corrigée:      ${configFixed} drivers`);
    console.log(`Images traitées:      ${imagesEnsured} fichiers`);
    console.log(`Duplicates nettoyés:  ${imagesCleaned} fichiers`);
    console.log(`Build:                ${buildSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Validation:           ${validationPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (validationPassed) {
      console.log('🎉 ✅ TOUTES LES IMAGES SONT CORRECTES!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Des problèmes subsistent. Consultez les logs ci-dessus.\n');
      process.exit(1);
    }
    
  } catch (err) {
    console.error('\n❌ ERREUR FATALE:', err);
    process.exit(1);
  }
}

main();
