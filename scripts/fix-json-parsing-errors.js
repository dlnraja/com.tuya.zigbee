#!/usr/bin/env node

/**
 * Script de correction des erreurs de parsing JSON dans les drivers
 * Corrige les problèmes de duplication de clés et de syntaxe JSON
 * 
 * @author Dylan Rajasekaram (dlrnaja)
 * @version 3.5.1
 * @date 2025-08-16
 */

const fs = require('fs');
const path = require('path');

class JSONParsingFixer {
  constructor() {
    this.fixedFiles = [];
    this.errors = [];
    this.stats = {
      total: 0,
      fixed: 0,
      errors: 0
    };
  }

  async fixAllDrivers() {
    console.log('🔧 CORRECTION DES ERREURS DE PARSING JSON...');
    console.log('==========================================');
    
    const driversDir = path.join(__dirname, 'drivers');
    if (!fs.existsSync(driversDir)) {
      console.log('❌ Dossier drivers non trouvé');
      return;
    }

    const drivers = fs.readdirSync(driversDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    this.stats.total = drivers.length;
    console.log(`📁 ${this.stats.total} drivers à traiter`);

    for (const driver of drivers) {
      await this.fixDriver(driver);
    }

    this.generateReport();
  }

  async fixDriver(driverName) {
    const driverPath = path.join(__dirname, 'drivers', driverName);
    const composePath = path.join(driverPath, 'driver.compose.json');

    if (!fs.existsSync(composePath)) {
      console.log(`⚠️  ${driverName}: driver.compose.json manquant`);
      return;
    }

    try {
      console.log(`\n🔧 Traitement de ${driverName}...`);
      
      // Lire le fichier
      const content = fs.readFileSync(composePath, 'utf8');
      
      // Vérifier si c'est du JSON valide
      try {
        JSON.parse(content);
        console.log(`✅ ${driverName}: JSON déjà valide`);
        return;
      } catch (parseError) {
        console.log(`❌ ${driverName}: Erreur de parsing détectée`);
      }

      // Corriger les problèmes courants
      let fixedContent = this.fixCommonIssues(content);
      
      // Vérifier à nouveau
      try {
        JSON.parse(fixedContent);
        console.log(`✅ ${driverName}: JSON corrigé avec succès`);
        
        // Sauvegarder
        fs.writeFileSync(composePath, fixedContent, 'utf8');
        this.fixedFiles.push({
          driver: driverName,
          path: composePath,
          originalSize: content.length,
          fixedSize: fixedContent.length
        });
        this.stats.fixed++;
        
      } catch (finalError) {
        console.log(`❌ ${driverName}: Impossible de corriger - ${finalError.message}`);
        this.errors.push({
          driver: driverName,
          error: finalError.message,
          path: composePath
        });
        this.stats.errors++;
      }

    } catch (error) {
      console.log(`❌ ${driverName}: Erreur lors du traitement - ${error.message}`);
      this.errors.push({
        driver: driverName,
        error: error.message,
        path: composePath
      });
      this.stats.errors++;
    }
  }

  fixCommonIssues(content) {
    let fixed = content;

    // 1. Supprimer les clés dupliquées (garder la première)
    fixed = this.removeDuplicateKeys(fixed);
    
    // 2. Corriger les virgules trailing
    fixed = this.fixTrailingCommas(fixed);
    
    // 3. Corriger les guillemets mal fermés
    fixed = this.fixUnclosedQuotes(fixed);
    
    // 4. Corriger les crochets/braces mal fermés
    fixed = this.fixUnclosedBrackets(fixed);
    
    // 5. Nettoyer les caractères invisibles
    fixed = this.cleanInvisibleChars(fixed);

    return fixed;
  }

  removeDuplicateKeys(content) {
    // Pattern pour détecter les clés dupliquées
    const duplicatePattern = /("productId":\s*\[[^\]]+\],\s*)+/g;
    
    if (duplicatePattern.test(content)) {
      console.log('  🔧 Suppression des clés productId dupliquées');
      // Garder seulement la première occurrence
      content = content.replace(duplicatePattern, (match) => {
        const firstMatch = match.match(/"productId":\s*\[[^\]]+\]/)[0];
        return firstMatch + ',';
      });
    }

    return content;
  }

  fixTrailingCommas(content) {
    // Supprimer les virgules trailing avant les crochets/braces fermants
    content = content.replace(/,(\s*[}\]])/g, '$1');
    return content;
  }

  fixUnclosedQuotes(content) {
    // Compter les guillemets et s'assurer qu'ils sont pairs
    const quoteCount = (content.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      console.log('  🔧 Correction des guillemets mal fermés');
      // Ajouter un guillemet fermant à la fin si nécessaire
      if (!content.endsWith('"')) {
        content += '"';
      }
    }
    return content;
  }

  fixUnclosedBrackets(content) {
    // Compter les crochets et braces
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;

    if (openBraces > closeBraces) {
      console.log('  🔧 Ajout de braces fermants manquants');
      content += '}'.repeat(openBraces - closeBraces);
    }

    if (openBrackets > closeBrackets) {
      console.log('  🔧 Ajout de crochets fermants manquants');
      content += ']'.repeat(openBrackets - closeBrackets);
    }

    return content;
  }

  cleanInvisibleChars(content) {
    // Supprimer les caractères de contrôle invisibles
    content = content.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    return content;
  }

  generateReport() {
    console.log('\n📊 RAPPORT DE CORRECTION JSON');
    console.log('==============================');
    console.log(`Total drivers: ${this.stats.total}`);
    console.log(`Fichiers corrigés: ${this.stats.fixed}`);
    console.log(`Erreurs persistantes: ${this.stats.errors}`);
    console.log(`Taux de succès: ${((this.stats.fixed / this.stats.total) * 100).toFixed(1)}%`);

    if (this.fixedFiles.length > 0) {
      console.log('\n✅ FICHIERS CORRIGÉS:');
      this.fixedFiles.forEach(file => {
        console.log(`  - ${file.driver}: ${file.originalSize} → ${file.fixedSize} bytes`);
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ ERREURS PERSISTANTES:');
      this.errors.forEach(error => {
        console.log(`  - ${error.driver}: ${error.error}`);
      });
    }

    // Sauvegarder le rapport
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      fixedFiles: this.fixedFiles,
      errors: this.errors
    };

    const reportPath = path.join(__dirname, 'JSON_PARSING_FIX_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);
  }
}

// Exécution principale
async function main() {
  try {
    const fixer = new JSONParsingFixer();
    await fixer.fixAllDrivers();
    
    console.log('\n🎉 CORRECTION TERMINÉE !');
    console.log('Prochaine étape: validation avec homey app validate');
    
  } catch (error) {
    console.error('❌ ERREUR CRITIQUE:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = JSONParsingFixer;
