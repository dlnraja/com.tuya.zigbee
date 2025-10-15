#!/usr/bin/env node
'use strict';

/**
 * ORGANIZE ALL JS FILES
 * Organisation complète et intelligente de TOUS les fichiers JS du projet
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

class OrganizeAllJSFiles {
  constructor() {
    this.organized = {
      moved: [],
      kept: [],
      duplicates: [],
      errors: []
    };
    
    // Catégories avec patterns de détection
    this.categories = {
      'scripts/core': {
        patterns: ['orchestrat', 'master', 'ultimate', 'system', 'main'],
        description: 'Orchestrateurs et systèmes principaux'
      },
      'scripts/validation': {
        patterns: ['validat', 'check', 'verify', 'test', 'coherence'],
        description: 'Scripts de validation et vérification'
      },
      'scripts/enrichment': {
        patterns: ['enrich', 'enhance', 'improve', 'battery', 'flow'],
        description: 'Scripts d\'enrichissement'
      },
      'scripts/maintenance': {
        patterns: ['fix', 'repair', 'clean', 'maintain', 'update'],
        description: 'Scripts de maintenance'
      },
      'scripts/automation': {
        patterns: ['auto', 'cron', 'schedule', 'watch', 'monitor'],
        description: 'Scripts d\'automation'
      },
      'scripts/deployment': {
        patterns: ['deploy', 'publish', 'release', 'push'],
        description: 'Scripts de déploiement'
      },
      'scripts/tools': {
        patterns: ['convert', 'generate', 'create', 'analyze', 'scrap'],
        description: 'Outils et utilitaires'
      },
      'utils/helpers': {
        patterns: ['helper', 'util', 'common', 'shared'],
        description: 'Helpers utilitaires'
      },
      'utils/parsers': {
        patterns: ['parse', 'format', 'transform'],
        description: 'Parseurs et transformateurs'
      }
    };

    // Fichiers à garder à la racine
    this.rootAllowed = [
      'create_driver_images.js',
      'create_professional_images.js',
      'verify_all_images.js',
      'README.txt'  // Requis pour Homey App Store
    ];

    // Dossiers à ignorer
    this.ignoreDirs = [
      'node_modules',
      '.git',
      '.github',
      'drivers',
      'lib',
      'api',
      'backup',
      'archive',
      '.archive',
      'organized',
      'ultimate_system'
    ];
  }

  log(msg, icon = '📁') {
    console.log(`${icon} ${msg}`);
  }

  // Vérifier si un dossier doit être ignoré
  shouldIgnoreDir(dirName) {
    return this.ignoreDirs.includes(dirName) || dirName.startsWith('.');
  }

  // Catégoriser un fichier JS
  categorizeFile(filePath, fileName) {
    const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
    const lowerName = fileName.toLowerCase();

    // Score par catégorie
    const scores = {};
    
    for (const [category, config] of Object.entries(this.categories)) {
      let score = 0;
      
      for (const pattern of config.patterns) {
        // Check dans le nom
        if (lowerName.includes(pattern)) {
          score += 10;
        }
        
        // Check dans le contenu (premiers 1000 chars)
        const contentSample = content.substring(0, 1000);
        const patternCount = (contentSample.match(new RegExp(pattern, 'g')) || []).length;
        score += patternCount * 2;
      }
      
      scores[category] = score;
    }

    // Trouver meilleure catégorie
    let bestCategory = 'scripts/tools'; // Default
    let bestScore = 0;
    
    for (const [category, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  // Trouver tous les fichiers JS
  findAllJSFiles(dir, fileList = [], currentPath = '') {
    try {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const relativePath = currentPath ? path.join(currentPath, file) : file;
        
        try {
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            if (!this.shouldIgnoreDir(file)) {
              this.findAllJSFiles(filePath, fileList, relativePath);
            }
          } else if (file.endsWith('.js')) {
            fileList.push({
              fullPath: filePath,
              relativePath: relativePath,
              fileName: file,
              dir: path.dirname(relativePath)
            });
          }
        } catch (err) {
          // Ignore errors on individual files
        }
      }
    } catch (err) {
      this.log(`Erreur lecture ${dir}: ${err.message}`, '⚠️');
    }

    return fileList;
  }

  // Organiser un fichier
  organizeFile(fileInfo) {
    try {
      // Fichiers racine autorisés
      if (fileInfo.dir === '.' && this.rootAllowed.includes(fileInfo.fileName)) {
        this.organized.kept.push(fileInfo.fileName);
        return;
      }

      // Fichiers déjà dans scripts/ ou utils/
      if (fileInfo.dir.startsWith('scripts') || fileInfo.dir.startsWith('utils')) {
        // Vérifier si dans la bonne catégorie
        const targetCategory = this.categorizeFile(fileInfo.fullPath, fileInfo.fileName);
        const currentCategory = fileInfo.dir.split(path.sep).slice(0, 2).join('/');

        if (targetCategory === currentCategory) {
          this.organized.kept.push(fileInfo.relativePath);
          return;
        }

        // Devrait être déplacé
        const targetPath = path.join(ROOT, targetCategory, fileInfo.fileName);
        
        // Vérifier si existe déjà
        if (fs.existsSync(targetPath)) {
          this.organized.duplicates.push({
            file: fileInfo.fileName,
            original: targetPath,
            duplicate: fileInfo.fullPath
          });
          return;
        }

        // Créer dossier cible si nécessaire
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Déplacer
        fs.renameSync(fileInfo.fullPath, targetPath);
        this.organized.moved.push({
          file: fileInfo.fileName,
          from: fileInfo.dir,
          to: targetCategory
        });
        this.log(`${fileInfo.fileName} → ${targetCategory}`, '  ✅');
      } else if (fileInfo.dir !== '.' && !fileInfo.dir.startsWith('scripts') && !fileInfo.dir.startsWith('utils')) {
        // Fichiers dans d'autres dossiers (docs/, reports/, etc.)
        const targetCategory = this.categorizeFile(fileInfo.fullPath, fileInfo.fileName);
        const targetPath = path.join(ROOT, targetCategory, fileInfo.fileName);

        // Vérifier duplicata
        if (fs.existsSync(targetPath)) {
          this.organized.duplicates.push({
            file: fileInfo.fileName,
            original: targetPath,
            duplicate: fileInfo.fullPath
          });
          return;
        }

        // Créer dossier
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Déplacer
        fs.renameSync(fileInfo.fullPath, targetPath);
        this.organized.moved.push({
          file: fileInfo.fileName,
          from: fileInfo.dir,
          to: targetCategory
        });
        this.log(`${fileInfo.fileName} → ${targetCategory}`, '  ✅');
      }
    } catch (err) {
      this.organized.errors.push({
        file: fileInfo.fileName,
        error: err.message
      });
      this.log(`Erreur ${fileInfo.fileName}: ${err.message}`, '  ❌');
    }
  }

  // Générer index pour catégorie
  generateIndex(category) {
    const categoryPath = path.join(ROOT, category);
    
    if (!fs.existsSync(categoryPath)) return;

    const files = fs.readdirSync(categoryPath)
      .filter(f => f.endsWith('.js') && f !== 'index.js')
      .sort();

    if (files.length === 0) return;

    const indexContent = `#!/usr/bin/env node
'use strict';

/**
 * INDEX - ${this.categories[category]?.description || category}
 * Auto-generated by ORGANIZE_ALL_JS_FILES
 */

${files.map(f => {
  const name = path.basename(f, '.js');
  return `const ${name} = require('./${f}');`;
}).join('\n')}

module.exports = {
${files.map(f => '  ' + path.basename(f, '.js')).join(',\n')}
};
`;

    const indexPath = path.join(categoryPath, 'index.js');
    fs.writeFileSync(indexPath, indexContent);
    this.log(`Index: ${category}/index.js`, '  📑');
  }

  // Générer tous les index
  generateAllIndexes() {
    this.log('Génération index...', '📑');
    
    for (const category of Object.keys(this.categories)) {
      this.generateIndex(category);
    }
  }

  // Générer rapport
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        moved: this.organized.moved.length,
        kept: this.organized.kept.length,
        duplicates: this.organized.duplicates.length,
        errors: this.organized.errors.length
      },
      details: this.organized
    };

    const reportPath = path.join(ROOT, 'reports', 'ORGANIZE_ALL_JS_FILES_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     ORGANIZE ALL JS FILES - ORGANISATION TOTALE                    ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Trouver tous les JS
    this.log('Recherche fichiers JS...', '🔍');
    const allFiles = this.findAllJSFiles(ROOT);
    this.log(`${allFiles.length} fichiers JS trouvés`);

    console.log('\n' + '═'.repeat(70));
    this.log('Organisation en cours...', '📁');
    console.log('═'.repeat(70));

    // Organiser chaque fichier
    for (const fileInfo of allFiles) {
      this.organizeFile(fileInfo);
    }

    // Générer index
    console.log('\n' + '═'.repeat(70));
    this.generateAllIndexes();

    // Générer rapport
    const report = this.generateReport();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Résumé
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ ORGANISATION');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`📦 Fichiers trouvés: ${allFiles.length}`);
    console.log(`✅ Déplacés: ${report.summary.moved}`);
    console.log(`📌 Gardés en place: ${report.summary.kept}`);
    console.log(`🔄 Duplicatas détectés: ${report.summary.duplicates}`);
    console.log(`❌ Erreurs: ${report.summary.errors}`);

    if (report.summary.duplicates > 0) {
      console.log('\n🔄 Duplicatas:');
      this.organized.duplicates.slice(0, 5).forEach(dup => {
        console.log(`   - ${dup.file}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ ORGANISATION TERMINÉE');
    console.log('═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const organizer = new OrganizeAllJSFiles();
  organizer.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = OrganizeAllJSFiles;
