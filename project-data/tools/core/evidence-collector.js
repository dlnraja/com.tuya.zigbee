#!/usr/bin/env node
'use strict';

/**
 * 🔍 Module de Collecte d'Evidence - Version 3.5.0
 * Collecte automatique d'informations et de preuves
 */

const fs = require('fs');
const path = require('path');

class EvidenceCollector {
  constructor() {
    this.config = {
      version: '3.5.0',
      outputDir: 'evidence',
      maxFileSize: 1024 * 1024 // 1MB
    };
    
    this.stats = {
      filesCollected: 0,
      directoriesScanned: 0,
      errors: 0
    };
  }

  async run() {
    console.log('🔍 Collecte d\'evidence...');
    
    try {
      await this.ensureOutputDirectory();
      await this.collectProjectEvidence();
      await this.collectDriverEvidence();
      await this.generateEvidenceReport();
      
      console.log('✅ Collecte d\'evidence terminée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la collecte:', error.message);
      throw error;
    }
  }

  async ensureOutputDirectory() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  async collectProjectEvidence() {
    console.log('  📁 Collecte des preuves du projet...');
    
    const evidence = {
      timestamp: new Date().toISOString(),
      project: {
        name: 'tuya_repair',
        version: this.getPackageVersion(),
        structure: this.analyzeProjectStructure(),
        git: this.getGitInfo()
      }
    };
    
    const outputPath = path.join(this.config.outputDir, 'project_evidence.json');
    fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2));
    
    this.stats.filesCollected++;
    console.log(`    📄 Evidence du projet: ${outputPath}`);
  }

  async collectDriverEvidence() {
    console.log('  🚗 Collecte des preuves des drivers...');
    
    const driversDir = path.join(process.cwd(), 'drivers');
    const evidence = this.scanDriversForEvidence(driversDir);
    
    const outputPath = path.join(this.config.outputDir, 'drivers_evidence.json');
    fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2));
    
    this.stats.filesCollected++;
    console.log(`    📄 Evidence des drivers: ${outputPath}`);
  }

  scanDriversForEvidence(driversDir) {
    const evidence = {
      timestamp: new Date().toISOString(),
      drivers: [],
      summary: {
        total: 0,
        withIcons: 0,
        withSettings: 0,
        withReadme: 0
      }
    };

    const walkDir = (currentDir) => {
      const entries = fs.readdirSync(currentDir);
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (fs.existsSync(path.join(fullPath, 'driver.compose.json'))) {
            const driverEvidence = this.collectDriverEvidence(fullPath);
            evidence.drivers.push(driverEvidence);
            evidence.summary.total++;
          }
          walkDir(fullPath);
        }
      }
    };

    walkDir(driversDir);
    
    // Mise à jour des statistiques
    evidence.summary.withIcons = evidence.drivers.filter(d => d.hasIcon).length;
    evidence.summary.withSettings = evidence.drivers.filter(d => d.hasSettings).length;
    evidence.summary.withReadme = evidence.drivers.filter(d => d.hasReadme).length;
    
    return evidence;
  }

  collectDriverEvidence(driverPath) {
    const relativePath = path.relative(process.cwd(), driverPath);
    const driverId = path.basename(driverPath);
    
    return {
      id: driverId,
      path: relativePath,
      hasIcon: fs.existsSync(path.join(driverPath, 'assets/icon.svg')),
      hasSettings: fs.existsSync(path.join(driverPath, 'settings.json')),
      hasReadme: fs.existsSync(path.join(driverPath, 'README.md')),
      hasChangelog: fs.existsSync(path.join(driverPath, 'CHANGELOG.md')),
      files: this.listDriverFiles(driverPath)
    };
  }

  listDriverFiles(driverPath) {
    const files = [];
    const entries = fs.readdirSync(driverPath);
    
    for (const entry of entries) {
      const fullPath = path.join(driverPath, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isFile()) {
        files.push({
          name: entry,
          size: stat.size,
          modified: stat.mtime.toISOString()
        });
      }
    }
    
    return files;
  }

  getPackageVersion() {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return packageJson.version || 'unknown';
      }
    } catch (error) {
      console.warn('    ⚠️ Impossible de lire package.json');
    }
    return 'unknown';
  }

  analyzeProjectStructure() {
    const structure = {};
    const currentDir = process.cwd();
    const entries = fs.readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        structure[entry] = this.countFilesInDirectory(fullPath);
      }
    }
    
    return structure;
  }

  countFilesInDirectory(dirPath) {
    let count = 0;
    const walkDir = (currentDir) => {
      const entries = fs.readdirSync(currentDir);
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          walkDir(fullPath);
        } else if (stat.isFile()) {
          count++;
        }
      }
    };
    
    walkDir(dirPath);
    return count;
  }

  getGitInfo() {
    try {
      const gitPath = path.join(process.cwd(), '.git');
      if (fs.existsSync(gitPath)) {
        return {
          exists: true,
          lastCommit: this.getLastCommitInfo()
        };
      }
    } catch (error) {
      console.warn('    ⚠️ Impossible de lire les informations Git');
    }
    
    return { exists: false };
  }

  getLastCommitInfo() {
    try {
      const { execSync } = require('child_process');
      const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      const commitDate = execSync('git log -1 --format=%cd', { encoding: 'utf8' }).trim();
      
      return {
        hash: commitHash,
        date: commitDate
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async generateEvidenceReport() {
    console.log('  📊 Génération du rapport d\'evidence...');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: this.config.version,
      stats: this.stats,
      summary: {
        totalEvidenceFiles: this.stats.filesCollected,
        directoriesScanned: this.stats.directoriesScanned,
        errors: this.stats.errors
      }
    };
    
    const reportPath = path.join(this.config.outputDir, 'evidence_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`    📄 Rapport d'evidence: ${reportPath}`);
  }
}

// Point d'entrée
if (require.main === module) {
  const collector = new EvidenceCollector();
  collector.run().catch(console.error);
}

module.exports = EvidenceCollector;
