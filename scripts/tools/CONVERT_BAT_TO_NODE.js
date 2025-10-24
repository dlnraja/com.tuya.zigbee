#!/usr/bin/env node
'use strict';

/**
 * CONVERT BAT TO NODE
 * Convertit tous les scripts .bat Windows en Node.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

class BatToNodeConverter {
  constructor() {
    this.converted = [];
    this.deleted = [];
  }

  log(msg, icon = '🔄') {
    console.log(`${icon} ${msg}`);
  }

  // Convertir un fichier .bat en .js
  convertBatFile(batPath) {
    try {
      const batContent = fs.readFileSync(batPath, 'utf8');
      const baseName = path.basename(batPath, '.bat');
      const jsPath = path.join(path.dirname(batPath), baseName + '.js');

      // Analyser le contenu .bat
      const lines = batContent.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('REM') && !l.startsWith('@echo'));

      // Déterminer ce que fait le script
      const hasGitAdd = batContent.includes('git add');
      const hasGitCommit = batContent.includes('git commit');
      const hasGitPush = batContent.includes('git push');
      const hasDelete = batContent.includes('del "%~f0"');

      // Extraire message commit si présent
      let commitMessage = 'Update files';
      const commitMatch = batContent.match(/git commit -m ['"](.*?)['"]/);
      if (commitMatch) {
        commitMessage = commitMatch[1];
      }

      // Générer script Node.js équivalent
      let jsContent = `#!/usr/bin/env node
'use strict';

/**
 * ${baseName.toUpperCase().replace(/_/g, ' ')}
 * Auto-converted from .bat by CONVERT_BAT_TO_NODE
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

async function run() {
  try {
    console.log('🚀 ${baseName}...\\n');
`;

      if (hasGitAdd) {
        jsContent += `
    // Git add
    console.log('📝 Git add...');
    execSync('git add -A', { cwd: ROOT, stdio: 'inherit' });
`;
      }

      if (hasGitCommit) {
        jsContent += `
    // Git commit
    console.log('💾 Git commit...');
    try {
      execSync('git commit -m "${commitMessage}"', { 
        cwd: ROOT, 
        stdio: 'inherit' 
      });
    } catch (err) {
      console.log('Nothing to commit or already committed');
    }
`;
      }

      if (hasGitPush) {
        jsContent += `
    // Git push
    console.log('📤 Git push...');
    execSync('git push origin master', { cwd: ROOT, stdio: 'inherit' });
`;
      }

      jsContent += `
    console.log('\\n✅ ${baseName} completed!');
`;

      if (hasDelete) {
        jsContent += `
    // Auto-delete script
    fs.unlinkSync(__filename);
`;
      }

      jsContent += `
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
`;

      // Écrire le fichier .js
      fs.writeFileSync(jsPath, jsContent);
      this.log(`Converti: ${baseName}.bat → ${baseName}.js`, '  ✅');

      // Supprimer le .bat
      fs.unlinkSync(batPath);
      
      this.converted.push({ from: batPath, to: jsPath });
      this.deleted.push(batPath);

      return true;
    } catch (err) {
      this.log(`Erreur ${path.basename(batPath)}: ${err.message}`, '  ❌');
      return false;
    }
  }

  // Trouver et convertir tous les .bat
  async convertAllBatFiles() {
    this.log('Recherche fichiers .bat...', '🔍');
    console.log('═'.repeat(70));

    const batFiles = this.findBatFiles(ROOT);
    this.log(`${batFiles.length} fichiers .bat trouvés`);

    for (const batFile of batFiles) {
      this.convertBatFile(batFile);
    }

    this.log(`${this.converted.length} fichiers convertis`, '✅');
  }

  // Trouver récursivement les .bat
  findBatFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Ignorer certains dossiers
        if (!file.startsWith('.') && file !== 'node_modules' && file !== '.git') {
          this.findBatFiles(filePath, fileList);
        }
      } else if (file.endsWith('.bat')) {
        fileList.push(filePath);
      }
    }

    return fileList;
  }

  // Générer rapport
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      converted: this.converted.length,
      deleted: this.deleted.length,
      files: this.converted
    };

    const reportPath = path.join(ROOT, 'reports', 'BAT_TO_NODE_CONVERSION.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     CONVERT BAT TO NODE - CONVERSION SCRIPTS WINDOWS               ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    await this.convertAllBatFiles();
    const report = this.generateReport();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ CONVERSION');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`✅ Convertis: ${report.converted}`);
    console.log(`🗑️  Supprimés: ${report.deleted}`);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ CONVERSION TERMINÉE');
    console.log('═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const converter = new BatToNodeConverter();
  converter.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = BatToNodeConverter;
