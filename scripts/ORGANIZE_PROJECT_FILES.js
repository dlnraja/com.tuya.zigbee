#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Structure d'organisation
const FILE_ORGANIZATION = {
  // Rapports et documentation d'enrichissement
  enrichment_reports: [
    'enrichment_log.txt',
    'ultra_enrichment_log.txt',
    'IMAGE_IMPROVEMENT_REPORT.md',
    'ENRICHMENT_FINAL_COMPLETE_v4.1.0.md'
  ],
  
  // Guides et documentation
  documentation: [
    'IMAGE_IMPROVEMENT_GUIDE.md',
    'IMAGE_SOURCES.md'
  ],
  
  // Fichiers de données JSON
  data: [
    'ENRICHMENT_RESULTS.json'
  ]
};

// Dossiers de destination
const DEST_FOLDERS = {
  enrichment_reports: path.join(ROOT, 'docs', 'enrichment', 'reports'),
  documentation: path.join(ROOT, 'docs', 'guides'),
  data: path.join(ROOT, 'project-data', 'enrichment')
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Créé: ${path.relative(ROOT, dir)}`);
  }
}

function moveFile(source, dest) {
  if (fs.existsSync(source)) {
    ensureDir(path.dirname(dest));
    fs.renameSync(source, dest);
    console.log(`📦 Déplacé: ${path.basename(source)} → ${path.relative(ROOT, dest)}`);
    return true;
  }
  return false;
}

async function main() {
  console.log('🧹 ORGANISATION INTELLIGENTE DU PROJET\n');
  console.log('═'.repeat(70) + '\n');
  
  let moved = 0;
  let notFound = 0;
  
  // Créer tous les dossiers de destination
  for (const folder of Object.values(DEST_FOLDERS)) {
    ensureDir(folder);
  }
  
  console.log('\n📂 Organisation des fichiers...\n');
  
  // Déplacer les fichiers par catégorie
  for (const [category, files] of Object.entries(FILE_ORGANIZATION)) {
    console.log(`\n📁 ${category}:`);
    const destFolder = DEST_FOLDERS[category];
    
    for (const file of files) {
      const source = path.join(ROOT, file);
      const dest = path.join(destFolder, file);
      
      if (moveFile(source, dest)) {
        moved++;
      } else {
        console.log(`ℹ️  Non trouvé: ${file}`);
        notFound++;
      }
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('\n✅ ORGANISATION TERMINÉE\n');
  console.log(`📊 Résumé:`);
  console.log(`   - Fichiers déplacés: ${moved}`);
  console.log(`   - Fichiers non trouvés: ${notFound}`);
  console.log(`\n📁 Structure organisée:\n`);
  console.log(`   docs/`);
  console.log(`   ├── enrichment/reports/    (Rapports d'enrichissement)`);
  console.log(`   └── guides/                (Guides et documentation)`);
  console.log(`   project-data/`);
  console.log(`   └── enrichment/            (Données JSON)`);
  console.log('');
}

main().catch(err => {
  console.error('❌ ERREUR:', err);
  process.exit(1);
});
