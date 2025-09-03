#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

class JSONParsingFixer {
  constructor() {
    this.fixedFiles = [];
    this.errors = [];
    this.stats = { total: 0, fixed: 0, errors: 0 };
  }

  async fixAllDrivers() {
    console.log("🔧 CORRECTION DES ERREURS DE PARSING JSON...");
    
    const driversDir = path.join(__dirname, "drivers");
    if (!fs.existsSync(driversDir)) {
      console.log("❌ Dossier drivers non trouvé");
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
    const driverPath = path.join(__dirname, "drivers", driverName);
    const composePath = path.join(driverPath, "driver.compose.json");

    if (!fs.existsSync(composePath)) {
      console.log(`⚠️  ${driverName}: driver.compose.json manquant`);
      return;
    }

    try {
      console.log(`\n🔧 Traitement de ${driverName}...`);
      
      const content = fs.readFileSync(composePath, "utf8");
      
      try {
        JSON.parse(content);
        console.log(`✅ ${driverName}: JSON déjà valide`);
        return;
      } catch (parseError) {
        console.log(`❌ ${driverName}: Erreur de parsing détectée`);
      }

      let fixedContent = this.fixCommonIssues(content);
      
      try {
        JSON.parse(fixedContent);
        console.log(`✅ ${driverName}: JSON corrigé avec succès`);
        
        fs.writeFileSync(composePath, fixedContent, "utf8");
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

    // Supprimer les clés dupliquées
    const duplicatePattern = /("productId":\s*\[[^\]]+\],\s*)+/g;
    if (duplicatePattern.test(content)) {
      console.log("  🔧 Suppression des clés productId dupliquées");
      content = content.replace(duplicatePattern, (match) => {
        const firstMatch = match.match(/"productId":\s*\[[^\]]+\]/)[0];
        return firstMatch + ",";
      });
    }

    // Corriger les virgules trailing
    fixed = content.replace(/,(\s*[}\]])/g, "$1");
    
    // Nettoyer les caractères invisibles
    fixed = fixed.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

    return fixed;
  }

  generateReport() {
    console.log("\n📊 RAPPORT DE CORRECTION JSON");
    console.log(`Total drivers: ${this.stats.total}`);
    console.log(`Fichiers corrigés: ${this.stats.fixed}`);
    console.log(`Erreurs persistantes: ${this.stats.errors}`);
    console.log(`Taux de succès: ${((this.stats.fixed / this.stats.total) * 100).toFixed(1)}%`);

    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      fixedFiles: this.fixedFiles,
      errors: this.errors
    };

    const reportPath = path.join(__dirname, "JSON_PARSING_FIX_REPORT.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);
  }
}

async function main() {
  try {
    const fixer = new JSONParsingFixer();
    await fixer.fixAllDrivers();
    console.log("\n🎉 CORRECTION TERMINÉE !");
  } catch (error) {
    console.error("❌ ERREUR CRITIQUE:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = JSONParsingFixer;
