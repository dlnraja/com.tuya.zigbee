#!/usr/bin/env node

/**
 * ADVANCED_VERIFICATION.js
 * Script de vérification avancée pour Universal Tuya Zigbee
 * Vérifie la cohérence, la qualité et la conformité SDK3
 */

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     🔍 VÉRIFICATION AVANCÉE - UNIVERSAL TUYA ZIGBEE      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const results = {
  errors: [],
  warnings: [],
  info: [],
  stats: {}
};

// 1. VÉRIFICATION STRUCTURE PROJET
console.log('1️⃣  VÉRIFICATION STRUCTURE PROJET\n');

const requiredFiles = [
  'app.json',
  'package.json',
  '.homeychangelog.json',
  'README.md',
  'CHANGELOG.md'
];

const requiredDirs = [
  'drivers',
  'assets',
  '.github/workflows'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    results.errors.push(`Fichier manquant: ${file}`);
    console.log(`   ❌ ${file} MANQUANT`);
  }
});

requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`   ✅ ${dir}/`);
  } else {
    results.errors.push(`Dossier manquant: ${dir}`);
    console.log(`   ❌ ${dir}/ MANQUANT`);
  }
});

console.log('');

// 2. VÉRIFICATION APP.JSON
console.log('2️⃣  VÉRIFICATION APP.JSON\n');

try {
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  
  const appChecks = {
    version: !!app.version,
    sdk: app.sdk === 3,
    id: !!app.id,
    name: !!app.name?.en,
    description: !!app.description?.en,
    category: !!app.category,
    images: !!(app.images?.small && app.images?.large && app.images?.xlarge)
  };
  
  Object.entries(appChecks).forEach(([key, valid]) => {
    if (valid) {
      console.log(`   ✅ ${key}`);
    } else {
      results.errors.push(`app.json: ${key} invalide`);
      console.log(`   ❌ ${key}`);
    }
  });
  
  results.stats.appVersion = app.version;
  console.log(`\n   Version actuelle: ${app.version}\n`);
  
} catch (e) {
  results.errors.push(`Erreur lecture app.json: ${e.message}`);
  console.log(`   ❌ Erreur: ${e.message}\n`);
}

// 3. VÉRIFICATION DRIVERS
console.log('3️⃣  VÉRIFICATION DRIVERS\n');

const driversDir = 'drivers';
if (fs.existsSync(driversDir)) {
  const drivers = fs.readdirSync(driversDir).filter(d =>
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );
  
  results.stats.totalDrivers = drivers.length;
  let validDrivers = 0;
  let driverIssues = [];
  
  drivers.forEach(driver => {
    const driverPath = path.join(driversDir, driver);
    const issues = [];
    
    // Vérifier driver.compose.json
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
      issues.push('driver.compose.json manquant');
    } else {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Vérifier endpoints (requis SDK3)
        if (!compose.zigbee?.endpoints) {
          issues.push('endpoints manquants');
        }
        
        // Vérifier manufacturerName
        if (!compose.zigbee?.manufacturerName) {
          issues.push('manufacturerName manquant');
        }
        
        // Vérifier images
        if (!compose.images?.small || !compose.images?.large || !compose.images?.xlarge) {
          issues.push('images manquantes ou mal configurées');
        } else {
          // Vérifier chemins images
          const validPaths = 
            compose.images.small.startsWith('./assets/') &&
            compose.images.large.startsWith('./assets/') &&
            compose.images.xlarge.startsWith('./assets/');
          
          if (!validPaths) {
            issues.push('chemins images incorrects');
          }
        }
        
      } catch (e) {
        issues.push(`JSON invalide: ${e.message}`);
      }
    }
    
    // Vérifier device.js
    if (!fs.existsSync(path.join(driverPath, 'device.js'))) {
      issues.push('device.js manquant');
    }
    
    // Vérifier fichiers images
    const assetsPath = path.join(driverPath, 'assets');
    if (!fs.existsSync(assetsPath)) {
      issues.push('dossier assets manquant');
    } else {
      const requiredImages = ['small.png', 'large.png', 'xlarge.png'];
      requiredImages.forEach(img => {
        if (!fs.existsSync(path.join(assetsPath, img))) {
          issues.push(`${img} manquante`);
        }
      });
    }
    
    if (issues.length === 0) {
      validDrivers++;
    } else {
      driverIssues.push({driver, issues});
    }
  });
  
  console.log(`   Total drivers:      ${drivers.length}`);
  console.log(`   Drivers valides:    ${validDrivers} (${Math.round(validDrivers/drivers.length*100)}%)`);
  console.log(`   Drivers problèmes:  ${driverIssues.length}\n`);
  
  if (driverIssues.length > 0 && driverIssues.length <= 10) {
    console.log('   Problèmes détectés:\n');
    driverIssues.forEach(({driver, issues}) => {
      console.log(`   ⚠️  ${driver}:`);
      issues.forEach(issue => console.log(`      - ${issue}`));
    });
    console.log('');
  }
  
  results.stats.validDrivers = validDrivers;
  results.stats.driverIssues = driverIssues.length;
  
} else {
  results.errors.push('Dossier drivers manquant');
  console.log('   ❌ Dossier drivers manquant\n');
}

// 4. VÉRIFICATION CHANGELOG
console.log('4️⃣  VÉRIFICATION CHANGELOG\n');

try {
  if (fs.existsSync('.homeychangelog.json')) {
    const content = fs.readFileSync('.homeychangelog.json', 'utf8');
    const changelog = JSON.parse(content);
    const versions = Object.keys(changelog);
    
    console.log(`   Versions documentées:  ${versions.length}`);
    console.log(`   Dernière version:      ${versions[0]}`);
    
    // Vérifier longueur messages
    let tooShort = 0;
    let tooLong = 0;
    let hasTechnical = 0;
    
    const technicalTerms = ['SDK', 'cluster', 'endpoint', 'npm', 'git', 'async', 'API'];
    
    versions.forEach(v => {
      const msg = changelog[v].en;
      if (msg.length < 30) tooShort++;
      if (msg.length > 200) tooLong++;
      
      if (technicalTerms.some(term => msg.includes(term))) {
        hasTechnical++;
      }
    });
    
    if (tooShort > 0) {
      results.warnings.push(`${tooShort} messages changelog trop courts (<30 chars)`);
      console.log(`   ⚠️  ${tooShort} messages trop courts`);
    }
    
    if (tooLong > 0) {
      results.warnings.push(`${tooLong} messages changelog trop longs (>200 chars)`);
      console.log(`   ⚠️  ${tooLong} messages trop longs`);
    }
    
    if (hasTechnical > 0) {
      results.warnings.push(`${hasTechnical} messages avec jargon technique`);
      console.log(`   ⚠️  ${hasTechnical} messages avec jargon technique`);
    }
    
    if (tooShort === 0 && tooLong === 0 && hasTechnical === 0) {
      console.log(`   ✅ Tous messages conformes`);
    }
    
    console.log('');
    results.stats.changelogVersions = versions.length;
    
  } else {
    results.errors.push('.homeychangelog.json manquant');
    console.log('   ❌ .homeychangelog.json manquant\n');
  }
} catch (e) {
  results.errors.push(`Erreur changelog: ${e.message}`);
  console.log(`   ❌ Erreur: ${e.message}\n`);
}

// 5. VÉRIFICATION GIT
console.log('5️⃣  VÉRIFICATION GIT\n');

try {
  const status = execSync('git status --porcelain', {encoding: 'utf8'});
  const uncommitted = status.split('\n').filter(l => l.trim()).length;
  
  if (uncommitted === 0) {
    console.log('   ✅ Tous fichiers committés');
  } else {
    results.warnings.push(`${uncommitted} fichiers non committés`);
    console.log(`   ⚠️  ${uncommitted} fichiers non committés`);
  }
  
  const branch = execSync('git branch --show-current', {encoding: 'utf8'}).trim();
  console.log(`   Branche:               ${branch}`);
  
  const lastCommit = execSync('git log -1 --oneline', {encoding: 'utf8'}).trim();
  console.log(`   Dernier commit:        ${lastCommit.substring(0, 60)}...`);
  console.log('');
  
} catch (e) {
  results.warnings.push('Git non disponible ou erreur');
  console.log('   ⚠️  Git non disponible\n');
}

// 6. VÉRIFICATION IMAGES APP
console.log('6️⃣  VÉRIFICATION IMAGES APP\n');

const appImages = [
  {name: 'small.png', size: [250, 175]},
  {name: 'large.png', size: [500, 350]},
  {name: 'xlarge.png', size: [1000, 700]}
];

appImages.forEach(({name, size}) => {
  const imgPath = path.join('assets', 'images', name);
  if (fs.existsSync(imgPath)) {
    const stats = fs.statSync(imgPath);
    console.log(`   ✅ ${name} (${(stats.size/1024).toFixed(1)} KB)`);
  } else {
    results.errors.push(`Image app manquante: ${name}`);
    console.log(`   ❌ ${name} MANQUANTE`);
  }
});

console.log('');

// 7. VÉRIFICATION WORKFLOW
console.log('7️⃣  VÉRIFICATION GITHUB ACTIONS\n');

const workflowPath = '.github/workflows/homey-app-store.yml';
if (fs.existsSync(workflowPath)) {
  console.log('   ✅ Workflow configuré');
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  
  if (workflow.includes('HOMEY_TOKEN')) {
    console.log('   ✅ HOMEY_TOKEN référencé');
  } else {
    results.warnings.push('HOMEY_TOKEN non trouvé dans workflow');
    console.log('   ⚠️  HOMEY_TOKEN non trouvé');
  }
  
  if (workflow.includes('homey app publish')) {
    console.log('   ✅ Commande publish présente');
  } else {
    results.warnings.push('Commande publish manquante');
    console.log('   ⚠️  Commande publish manquante');
  }
} else {
  results.warnings.push('Workflow GitHub Actions manquant');
  console.log('   ⚠️  Workflow manquant');
}

console.log('');

// RÉSUMÉ FINAL
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║                    RÉSUMÉ VÉRIFICATION                    ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log(`📊 STATISTIQUES:\n`);
console.log(`   Version app:           ${results.stats.appVersion || 'N/A'}`);
console.log(`   Total drivers:         ${results.stats.totalDrivers || 0}`);
console.log(`   Drivers valides:       ${results.stats.validDrivers || 0}`);
console.log(`   Versions changelog:    ${results.stats.changelogVersions || 0}`);
console.log('');

if (results.errors.length === 0 && results.warnings.length === 0) {
  console.log('✅ AUCUN PROBLÈME DÉTECTÉ - PROJET PARFAIT!\n');
  process.exit(0);
} else {
  if (results.errors.length > 0) {
    console.log(`❌ ERREURS (${results.errors.length}):\n`);
    results.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
    console.log('');
  }
  
  if (results.warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${results.warnings.length}):\n`);
    results.warnings.forEach((warn, i) => {
      console.log(`   ${i + 1}. ${warn}`);
    });
    console.log('');
  }
  
  process.exit(results.errors.length > 0 ? 1 : 0);
}
