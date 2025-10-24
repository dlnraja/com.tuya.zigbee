#!/usr/bin/env node
'use strict';

/**
 * Script de mise à jour automatique des chemins dans README.md
 * 
 * Scanne tous les fichiers .md et met à jour dynamiquement les liens
 * dans README.md pour refléter la structure réelle du projet.
 * 
 * Usage: node scripts/automation/update-readme-paths.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const README_PATH = path.join(ROOT, 'README.md');
const DOCS_DIR = path.join(ROOT, 'docs');

// Catégories de documentation
const DOC_CATEGORIES = {
  'guides': '📚 Guides',
  'forum': '💬 Forum Responses',
  'community': '🌍 Community',
  'fixes': '🔧 Fixes & Solutions',
  'workflow': '⚙️ Workflows',
  'reports': '📊 Reports',
  'audits': '🔍 Audits',
  'enrichment': '💎 Enrichment',
  'github-issues': '🐛 GitHub Issues',
  'project-status': '📈 Project Status'
};

/**
 * Scanne récursivement un répertoire pour les fichiers .md
 */
function scanDirectory(dir, baseDir = dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !item.name.startsWith('.')) {
      files.push(...scanDirectory(fullPath, baseDir));
    } else if (item.isFile() && item.name.endsWith('.md')) {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push({
        name: item.name,
        path: relativePath,
        fullPath: fullPath,
        category: path.basename(path.dirname(fullPath))
      });
    }
  }
  
  return files;
}

/**
 * Groupe les fichiers par catégorie
 */
function groupByCategory(files) {
  const grouped = {};
  
  for (const file of files) {
    const category = file.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(file);
  }
  
  // Trier par nom dans chaque catégorie
  for (const category in grouped) {
    grouped[category].sort((a, b) => a.name.localeCompare(b.name));
  }
  
  return grouped;
}

/**
 * Génère la section documentation du README
 */
function generateDocSection(groupedFiles) {
  let markdown = '\n## 📚 Documentation\n\n';
  
  // Ordre des catégories
  const categoryOrder = Object.keys(DOC_CATEGORIES);
  
  for (const category of categoryOrder) {
    if (groupedFiles[category]) {
      const title = DOC_CATEGORIES[category] || category;
      markdown += `\n### ${title}\n\n`;
      
      for (const file of groupedFiles[category]) {
        const title = file.String(name).replace('.md', '').replace(/_/g, ' ');
        markdown += `- [${title}](docs/${file.path})\n`;
      }
    }
  }
  
  return markdown;
}

/**
 * Met à jour le README.md avec les nouveaux chemins
 */
function updateReadme() {
  console.log('🔍 Scanning documentation files...');
  
  // Scanner le répertoire docs
  const docsFiles = scanDirectory(DOCS_DIR);
  console.log(`   Found ${docsFiles.length} documentation files`);
  
  // Grouper par catégorie
  const grouped = groupByCategory(docsFiles);
  console.log(`   Grouped into ${Object.keys(grouped).length} categories`);
  
  // Lire README actuel
  let readme = fs.readFileSync(README_PATH, 'utf8');
  console.log('📖 Reading current README.md...');
  
  // Générer nouvelle section documentation
  const newDocSection = generateDocSection(grouped);
  console.log('✨ Generated new documentation section');
  
  // Remplacer section documentation
  const docStartMarker = '## 📚 Documentation';
  const docEndMarker = '## '; // Prochaine section H2
  
  const docStartIndex = readme.indexOf(docStartMarker);
  
  if (docStartIndex !== -1) {
    // Trouver la fin de la section
    let docEndIndex = readme.indexOf(docEndMarker, docStartIndex + docStartMarker.length);
    if (docEndIndex === -1) {
      docEndIndex = readme.length;
    }
    
    // Remplacer
    readme = readme.substring(0, docStartIndex) + newDocSection + '\n' + readme.substring(docEndIndex);
    console.log('✅ Documentation section updated');
  } else {
    // Ajouter à la fin
    readme += '\n' + newDocSection;
    console.log('✅ Documentation section added');
  }
  
  // Sauvegarder
  fs.writeFileSync(README_PATH, readme, 'utf8');
  console.log('💾 README.md saved');
  
  console.log('\n✨ README.md paths updated successfully!\n');
  
  // Afficher statistiques
  console.log('📊 Statistics:');
  for (const category in grouped) {
    const title = DOC_CATEGORIES[category] || category;
    console.log(`   ${title}: ${grouped[category].length} files`);
  }
}

/**
 * Déplace les fichiers MD de la racine vers docs/
 */
function moveRootMdFiles() {
  console.log('\n📦 Moving root .md files to docs/...');
  
  const rootFiles = fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.md') && f !== 'README.md' && f !== 'CHANGELOG.md');
  
  if (rootFiles.length === 0) {
    console.log('   No .md files to move from root');
    return;
  }
  
  const targetDir = path.join(DOCS_DIR, 'project-status');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  for (const file of rootFiles) {
    const src = path.join(ROOT, file);
    const dest = path.join(targetDir, file);
    
    try {
      fs.renameSync(src, dest);
      console.log(`   ✅ Moved: ${file} → docs/project-status/`);
    } catch (err) {
      console.error(`   ❌ Error moving ${file}:`, err.message);
    }
  }
  
  console.log(`\n✨ Moved ${rootFiles.length} files to docs/project-status/`);
}

// Exécution
if (require.main === module) {
  try {
    console.log('🚀 Starting README paths update...\n');
    
    // Déplacer fichiers MD de la racine
    moveRootMdFiles();
    
    // Mettre à jour README
    updateReadme();
    
    console.log('🎉 All done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { updateReadme, moveRootMdFiles };
