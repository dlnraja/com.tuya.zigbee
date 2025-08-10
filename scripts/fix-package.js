'use strict';

const fs = require('fs');
const path = require('path');

const PKG = path.join(process.cwd(), 'package.json');

function load(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function save(p, o) {
  fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
}

(function() {
  if (!fs.existsSync(PKG)) {
    console.error('[fixpkg] package.json not found');
    process.exit(1);
  }
  
  const before = load(PKG);
  const pkg = JSON.parse(JSON.stringify(before));
  
  // Initialiser les sections si manquantes
  pkg.dependencies = pkg.dependencies || {};
  pkg.devDependencies = pkg.devDependencies || {};
  pkg.scripts = pkg.scripts || {};
  
  // Déplacer homey vers devDependencies
  if (pkg.dependencies.homey) {
    pkg.devDependencies.homey = pkg.dependencies.homey;
    delete pkg.dependencies.homey;
  }
  
  // Ajouter les dépendances essentielles
  if (!pkg.dependencies['homey-meshdriver']) {
    pkg.dependencies['homey-meshdriver'] = '^2.0.0';
  }
  if (!pkg.dependencies['zigbee-clusters']) {
    pkg.dependencies['zigbee-clusters'] = '^2.0.0';
  }
  
  // Déplacer les outils de développement
  const devTools = ['chai', 'sinon', 'chalk', 'commander', 'inquirer', 'eslint', 'prettier', 'mocha', 'nyc'];
  for (const tool of devTools) {
    if (pkg.dependencies[tool]) {
      pkg.devDependencies[tool] = pkg.dependencies[tool];
      delete pkg.dependencies[tool];
    }
  }
  
  // Marquer comme privé
  if (pkg.private !== true) {
    pkg.private = true;
  }
  
  // Scripts essentiels
  pkg.scripts.run = pkg.scripts.run || 'homey app run';
  pkg.scripts.remote = pkg.scripts.remote || 'homey app run --remote';
  pkg.scripts.test = pkg.scripts.test || 'homey app validate';
  
  // Scripts MEGA
  pkg.scripts.ingest = pkg.scripts.ingest || 'node scripts/ingest-tuya-zips.js';
  pkg.scripts.enrich = pkg.scripts.enrich || 'node scripts/enrich-drivers.js --apply';
  pkg.scripts.assets = pkg.scripts.assets || 'node scripts/assets-generate.js';
  pkg.scripts.reindex = pkg.scripts.reindex || 'node scripts/reindex-drivers.js';
  pkg.scripts.verify = pkg.scripts.verify || 'node scripts/verify-coherence-and-enrich.js';
  pkg.scripts.reorg = pkg.scripts.reorg || 'node scripts/reorganize-drivers.js';
  pkg.scripts.readme = pkg.scripts.readme || 'node scripts/update-readme.js';
  pkg.scripts.mega = pkg.scripts.mega || 'node scripts/mega-verify-enrich.js';
  pkg.scripts.mega_ultimate = pkg.scripts.mega_ultimate || 'node scripts/mega-ultimate-factorized.js';
  
  // Scripts utilitaires
  pkg.scripts.clean = pkg.scripts.clean || 'node -e "try{require(\'fs\').rmSync(\'node_modules\',{recursive:true,force:true})}catch{}"';
  pkg.scripts.fix_package = pkg.scripts.fix_package || 'node scripts/fix-package.js';
  
  // Vérifier les changements
  if (JSON.stringify(pkg) !== JSON.stringify(before)) {
    save(PKG, pkg);
    console.log('[fixpkg] package.json updated.');
  } else {
    console.log('[fixpkg] package.json already OK.');
  }
})();
