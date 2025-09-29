#!/usr/bin/env node
'use strict';

/**
 * 🔄 Module de Conversion des Scripts - Version 3.5.0
 * Conversion et optimisation de tous les scripts du projet
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ScriptConverter {
  constructor() {
    this.config = {
      version: '3.5.0',
      outputDir: 'script-conversion',
      supportedExtensions: ['.ps1', '.sh', '.bat', '.cmd'],
      targetExtension: '.js',
      conversionRules: {
        ps1: {
          patterns: [
            { from: 'Get-ChildItem', to: 'fs.readdirSync' },
            { from: 'Write-Host', to: 'console.log' },
            { from: 'Write-Error', to: 'console.error' },
            { from: 'Write-Warning', to: 'console.warn' },
            { from: 'New-Item', to: 'fs.mkdirSync' },
            { from: 'Remove-Item', to: 'fs.rmSync' },
            { from: 'Copy-Item', to: 'fs.copyFileSync' },
            { from: 'Move-Item', to: 'fs.renameSync' },
            { from: 'Test-Path', to: 'fs.existsSync' },
            { from: 'Get-Content', to: 'fs.readFileSync' },
            { from: 'Set-Content', to: 'fs.writeFileSync' },
            { from: 'Add-Content', to: 'fs.appendFileSync' },
            { from: 'Select-Object', to: '// Select-Object equivalent' },
            { from: 'Where-Object', to: '// Where-Object equivalent' },
            { from: 'ForEach-Object', to: '// ForEach-Object equivalent' },
            { from: 'Invoke-WebRequest', to: 'fetch' },
            { from: 'Start-Sleep', to: 'setTimeout' },
            { from: 'Get-Date', to: 'new Date()' },
            { from: 'Get-Random', to: 'Math.random()' }
          ],
          imports: [
            'const fs = require(\'fs\');',
            'const path = require(\'path\');',
            'const { execSync } = require(\'child_process\');'
          ]
        },
        sh: {
          patterns: [
            { from: '#!/bin/bash', to: '#!/usr/bin/env node' },
            { from: '#!/bin/sh', to: '#!/usr/bin/env node' },
            { from: 'echo', to: 'console.log' },
            { from: 'mkdir -p', to: 'fs.mkdirSync' },
            { from: 'rm -rf', to: 'fs.rmSync' },
            { from: 'cp -r', to: 'fs.cpSync' },
            { from: 'mv', to: 'fs.renameSync' },
            { from: 'ls', to: 'fs.readdirSync' },
            { from: 'cat', to: 'fs.readFileSync' },
            { from: 'grep', to: '// grep equivalent' },
            { from: 'sed', to: '// sed equivalent' },
            { from: 'awk', to: '// awk equivalent' },
            { from: 'curl', to: 'fetch' },
            { from: 'wget', to: 'fetch' },
            { from: 'sleep', to: 'setTimeout' }
          ],
          imports: [
            'const fs = require(\'fs\');',
            'const path = require(\'path\');',
            'const { execSync } = require(\'child_process\');'
          ]
        }
      }
    };
    
    this.stats = {
      totalScripts: 0,
      convertedScripts: 0,
      failedConversions: 0,
      warnings: 0,
      convertedFiles: []
    };
  }

  async run() {
    console.log('🔄 Conversion des scripts...');
    
    try {
      await this.ensureOutputDirectory();
      await this.scanForScripts();
      await this.convertScripts();
      await this.optimizeExistingScripts();
      await this.generateConversionReport();
      
      console.log('✅ Conversion des scripts terminée avec succès');
      console.log(`📊 Résumé: ${this.stats.convertedScripts}/${this.stats.totalScripts} scripts convertis`);
    } catch (error) {
      console.error('❌ Erreur lors de la conversion des scripts:', error.message);
      throw error;
    }
  }

  async ensureOutputDirectory() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  async scanForScripts() {
    console.log('  🔍 Recherche des scripts à convertir...');
    
    const scriptFiles = [];
    
    // Recherche récursive des scripts
    const scanDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(entry).toLowerCase();
          if (this.config.supportedExtensions.includes(ext)) {
            scriptFiles.push({
              path: fullPath,
              relativePath: path.relative(process.cwd(), fullPath),
              extension: ext,
              size: stat.size
            });
          }
        }
      }
    };
    
    scanDirectory(process.cwd());
    
    this.stats.totalScripts = scriptFiles.length;
    console.log(`    📁 ${scriptFiles.length} scripts trouvés`);
    
    return scriptFiles;
  }

  async convertScripts() {
    console.log('  🔄 Conversion des scripts...');
    
    const scriptFiles = await this.scanForScripts();
    
    for (const script of scriptFiles) {
      try {
        await this.convertScript(script);
      } catch (error) {
        console.warn(`    ⚠️ Erreur lors de la conversion de ${script.relativePath}:`, error.message);
        this.stats.failedConversions++;
      }
    }
  }

  async convertScript(script) {
    const content = fs.readFileSync(script.path, 'utf8');
    const scriptType = this.getScriptType(script.extension);
    
    if (!scriptType) {
      console.warn(`    ⚠️ Type de script non supporté: ${script.extension}`);
      return;
    }
    
    console.log(`    🔄 Conversion de ${script.relativePath}...`);
    
    let convertedContent = this.convertContent(content, scriptType);
    convertedContent = this.addJavaScriptHeader(convertedContent, scriptType);
    
    // Création du fichier JavaScript converti
    const jsPath = script.path.replace(script.extension, this.config.targetExtension);
    const backupPath = path.join(this.config.outputDir, `${path.basename(script.path)}.backup`);
    
    // Sauvegarde du fichier original
    fs.copyFileSync(script.path, backupPath);
    
    // Écriture du fichier converti
    fs.writeFileSync(jsPath, convertedContent);
    
    // Suppression du fichier original
    fs.unlinkSync(script.path);
    
    this.stats.convertedScripts++;
    this.stats.convertedFiles.push({
      original: script.relativePath,
      converted: path.relative(process.cwd(), jsPath),
      backup: path.relative(process.cwd(), backupPath)
    });
    
    console.log(`      ✅ Converti vers ${path.relative(process.cwd(), jsPath)}`);
  }

  getScriptType(extension) {
    switch (extension) {
      case '.ps1': return 'ps1';
      case '.sh': return 'sh';
      case '.bat': return 'bat';
      case '.cmd': return 'cmd';
      default: return null;
    }
  }

  convertContent(content, scriptType) {
    let converted = content;
    const rules = this.config.conversionRules[scriptType];
    
    if (!rules) return content;
    
    // Application des patterns de conversion
    for (const pattern of rules.patterns) {
      const regex = new RegExp(pattern.from, 'gi');
      converted = converted.replace(regex, pattern.to);
    }
    
    // Ajout des commentaires de conversion
    converted = `// 🔄 Script converti automatiquement de ${scriptType.toUpperCase()} vers JavaScript\n// ⚠️ Vérification manuelle recommandée\n\n${converted}`;
    
    return converted;
  }

  addJavaScriptHeader(content, scriptType) {
    const rules = this.config.conversionRules[scriptType];
    if (!rules) return content;
    
    const imports = rules.imports.join('\n');
    const header = `#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: ${scriptType.toUpperCase()}
 * Converti le: ${new Date().toISOString()}
 */

${imports}

`;

    return header + content;
  }

  async optimizeExistingScripts() {
    console.log('  ⚡ Optimisation des scripts JavaScript existants...');
    
    const jsFiles = this.findJavaScriptFiles();
    let optimizedCount = 0;
    
    for (const file of jsFiles) {
      try {
        if (await this.optimizeJavaScriptFile(file)) {
          optimizedCount++;
        }
      } catch (error) {
        console.warn(`    ⚠️ Erreur lors de l'optimisation de ${file}:`, error.message);
      }
    }
    
    console.log(`    ✅ ${optimizedCount} scripts JavaScript optimisés`);
  }

  findJavaScriptFiles() {
    const jsFiles = [];
    
    const scanDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile() && entry.endsWith('.js')) {
          jsFiles.push(fullPath);
        }
      }
    };
    
    scanDirectory(process.cwd());
    return jsFiles;
  }

  async optimizeJavaScriptFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let optimized = false;
    
    // Ajout de la directive 'use strict' si manquante
    if (!content.includes("'use strict'") && !content.includes('"use strict"')) {
      const newContent = `#!/usr/bin/env node
'use strict';

${content}`;
      fs.writeFileSync(filePath, newContent);
      optimized = true;
    }
    
    // Ajout du shebang si manquant
    if (!content.startsWith('#!/usr/bin/env node') && !content.startsWith('#!/usr/bin/env node')) {
      const newContent = `#!/usr/bin/env node
'use strict';

${content}`;
      fs.writeFileSync(filePath, newContent);
      optimized = true;
    }
    
    return optimized;
  }

  async generateConversionReport() {
    console.log('  📊 Génération du rapport de conversion...');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: this.config.version,
      summary: {
        totalScripts: this.stats.totalScripts,
        convertedScripts: this.stats.convertedScripts,
        failedConversions: this.stats.failedConversions,
        warnings: this.stats.warnings,
        successRate: this.stats.totalScripts > 0 ? 
          (this.stats.convertedScripts / this.stats.totalScripts * 100).toFixed(2) : 0
      },
      convertedFiles: this.stats.convertedFiles,
      recommendations: this.generateRecommendations()
    };
    
    const reportPath = path.join(this.config.outputDir, 'script_conversion_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`    📄 Rapport de conversion: ${reportPath}`);
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.stats.failedConversions > 0) {
      recommendations.push(`Vérifier manuellement ${this.stats.failedConversions} conversions échouées`);
    }
    
    if (this.stats.warnings > 0) {
      recommendations.push(`Traiter ${this.stats.warnings} avertissements de conversion`);
    }
    
    if (this.stats.convertedScripts > 0) {
      recommendations.push('Tester tous les scripts convertis pour vérifier leur bon fonctionnement');
    }
    
    recommendations.push('Mettre à jour la documentation pour refléter les nouveaux scripts JavaScript');
    recommendations.push('Ajouter les nouveaux scripts aux workflows MEGA orchestrator');
    
    return recommendations;
  }
}

// Point d'entrée
if (require.main === module) {
  const converter = new ScriptConverter();
  converter.run().catch(console.error);
}

module.exports = ScriptConverter;
