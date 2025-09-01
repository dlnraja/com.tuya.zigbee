#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { minify } from 'terser';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '..');
const REPORT_FILE = path.join(process.cwd(), 'optimization-report.json');

// Configuration de l'optimisation
const OPTIMIZATION_CONFIG = {
  fileExtensions: ['.js'],
  excludeDirs: [
    'node_modules',
    '.homey*',
    'coverage',
    'dist',
    'build',
    'archive',
    'backup',
    'logs',
    'temp'
  ],
  minifyOptions: {
    compress: {
      drop_console: false,
      drop_debugger: true,
      ecma: 2020
    },
    mangle: {
      toplevel: true,
      properties: {
        regex: /^_/
      }
    },
    format: {
      comments: /@license|@preserve|@cc_on|@__PURE__|^!/,
      ecma: 2020
    }
  }
};

async function findJsFiles() {
  const files = await glob('**/*.js', {
    cwd: SRC_DIR,
    ignore: OPTIMIZATION_CONFIG.excludeDirs.map(dir => `**/${dir}/**`),
    nodir: true
  });
  return files.map(file => path.join(SRC_DIR, file));
}

async function analyzeFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const stats = {
    file: path.relative(SRC_DIR, filePath),
    size: {
      original: Buffer.byteLength(content, 'utf8'),
      minified: 0,
      gzipped: 0
    },
    issues: {
      deadCode: [],
      unusedVars: [],
      consoleLogs: []
    }
  };

  // Détection des console.log
  const logRegex = /console\.(log|warn|error|info|debug|trace)\(/g;
  let logMatch;
  while ((logMatch = logRegex.exec(content)) !== null) {
    stats.issues.consoleLogs.push({
      line: content.substring(0, logMatch.index).split('\n').length,
      code: content.substring(
        logMatch.index,
        Math.min(logMatch.index + 50, content.length)
      ).split('\n')[0] + '...'
    });
  }

  // Minification pour estimer la taille
  try {
    const result = await minify(content, OPTIMIZATION_CONFIG.minifyOptions);
    if (result.code) {
      stats.size.minified = Buffer.byteLength(result.code, 'utf8');
      stats.size.savings = stats.size.original - stats.size.minified;
      stats.size.savingsPercent = (stats.size.savings / stats.size.original * 100).toFixed(2);
    }
  } catch (error) {
    stats.error = `Erreur de minification: ${error.message}`;
  }

  return stats;
}

async function generateReport(filesStats) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: filesStats.length,
      totalSize: filesStats.reduce((sum, file) => sum + file.size.original, 0),
      totalMinifiedSize: filesStats.reduce((sum, file) => sum + (file.size.minified || 0), 0),
      totalSavings: filesStats.reduce((sum, file) => sum + (file.size.savings || 0), 0),
      filesWithIssues: filesStats.filter(f => 
        f.issues.consoleLogs.length > 0 || 
        f.issues.deadCode.length > 0 || 
        f.issues.unusedVars.length > 0
      ).length
    },
    files: filesStats
  };

  // Calculer les économies totales
  report.summary.savingsPercent = 
    (report.summary.totalSavings / report.summary.totalSize * 100).toFixed(2);

  return report;
}

async function main() {
  console.log(chalk.blue('🔍 Recherche des fichiers JavaScript...'));
  const files = await findJsFiles();
  console.log(chalk.green(`✅ ${files.length} fichiers trouvés`));

  console.log(chalk.blue('\n📊 Analyse des fichiers...'));
  const filesStats = [];
  
  for (const file of files) {
    process.stdout.write(`  ${path.relative(SRC_DIR, file)}... `);
    try {
      const stats = await analyzeFile(file);
      filesStats.push(stats);
      
      if (stats.size.savingsPercent > 0) {
        console.log(chalk.green(`${stats.size.savingsPercent}% d'économies`));
      } else if (stats.error) {
        console.log(chalk.red('❌ Erreur'));
      } else {
        console.log(chalk.yellow('Aucune optimisation possible'));
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Erreur lors de l'analyse de ${file}:`), error);
    }
  }

  // Générer le rapport
  const report = await generateReport(filesStats);
  await fs.writeJson(REPORT_FILE, report, { spaces: 2 });

  // Afficher le résumé
  console.log('\n' + '='.repeat(60));
  console.log(chalk.green.bold('\n✅ Analyse terminée avec succès !'));
  console.log(chalk.cyan(`📊 ${report.summary.totalFiles} fichiers analysés`));
  console.log(chalk.cyan(`💾 Taille totale: ${(report.summary.totalSize / 1024).toFixed(2)} KB`));
  console.log(chalk.green(`🔄 Économies potentielles: ${(report.summary.totalSavings / 1024).toFixed(2)} KB (${report.summary.savingsPercent}%)`));
  console.log(chalk.yellow(`⚠️  ${report.summary.filesWithIssues} fichiers avec des problèmes`));
  console.log(chalk.cyan(`📄 Rapport complet enregistré dans: ${path.relative(process.cwd(), REPORT_FILE)}`));
}

main().catch(error => {
  console.error(chalk.red('❌ Erreur dans optimizer.js:'), error);
  process.exit(1);
});
