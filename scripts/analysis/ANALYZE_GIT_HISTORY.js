#!/usr/bin/env node
'use strict';

/**
 * ANALYSE HISTORIQUE GIT
 * 
 * Analyse les commits passés pour trouver:
 * 1. Quand les images fonctionnaient correctement
 * 2. Quand la batterie était bien configurée
 * 3. Différences entre versions qui marchaient vs cassées
 * 4. Extraction de configurations fonctionnelles
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class GitHistoryAnalyzer {
  
  constructor() {
    this.projectRoot = path.join(__dirname, '..', '..');
    this.results = {
      commits: [],
      workingVersions: [],
      brokenVersions: [],
      batteryChanges: [],
      imageChanges: [],
      recommendations: []
    };
  }

  /**
   * Execute une commande Git
   */
  execGit(command) {
    try {
      return execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024
      }).trim();
    } catch (err) {
      return null;
    }
  }

  /**
   * Récupère la liste des commits
   */
  getCommits(limit = 100) {
    console.log(`\n📚 Récupération des ${limit} derniers commits...`);
    
    const output = this.execGit(`git log -${limit} --pretty=format:"%H|%h|%an|%ae|%ad|%s" --date=iso`);
    if (!output) return [];
    
    const commits = output.split('\n').map(line => {
      const [hash, shortHash, author, email, date, message] = line.split('|');
      return { hash, shortHash, author, email, date, message };
    });
    
    console.log(`   ✅ ${commits.length} commits récupérés`);
    return commits;
  }

  /**
   * Analyse un commit spécifique
   */
  analyzeCommit(commit) {
    console.log(`\n🔍 Analyse commit ${commit.shortHash}: ${commit.message.substring(0, 50)}...`);
    
    // Fichiers modifiés
    const filesOutput = this.execGit(`git show --name-status --pretty=format:"" ${commit.hash}`);
    if (!filesOutput) return null;
    
    const files = filesOutput.split('\n').filter(Boolean).map(line => {
      const [status, ...pathParts] = line.split('\t');
      return {
        status,
        path: pathParts.join('\t')
      };
    });
    
    const analysis = {
      commit,
      files: files.length,
      batteryRelated: false,
      imageRelated: false,
      driverChanges: [],
      assetChanges: [],
      configChanges: []
    };
    
    // Analyser les fichiers
    files.forEach(file => {
      const filePath = file.path.toLowerCase();
      
      // Changements de batterie
      if (filePath.includes('battery') || filePath.includes('measure_battery')) {
        analysis.batteryRelated = true;
      }
      
      // Changements d'images
      if (filePath.includes('.png') || filePath.includes('.svg') || 
          filePath.includes('assets') || filePath.includes('image')) {
        analysis.imageRelated = true;
        analysis.assetChanges.push(file.path);
      }
      
      // Changements de drivers
      if (filePath.includes('drivers/') && filePath.endsWith('device.js')) {
        analysis.driverChanges.push(file.path);
      }
      
      // Changements de config
      if (filePath.includes('driver.compose.json') || filePath.includes('app.json')) {
        analysis.configChanges.push(file.path);
      }
    });
    
    return analysis;
  }

  /**
   * Compare deux commits
   */
  diffCommits(commit1Hash, commit2Hash, filePath) {
    console.log(`\n📊 Diff ${commit1Hash.substring(0, 7)}...${commit2Hash.substring(0, 7)} pour ${filePath}`);
    
    const diff = this.execGit(`git diff ${commit1Hash} ${commit2Hash} -- "${filePath}"`);
    if (!diff) return null;
    
    return this.parseDiff(diff);
  }

  /**
   * Parse un diff Git
   */
  parseDiff(diff) {
    const lines = diff.split('\n');
    const changes = {
      additions: [],
      deletions: [],
      batteryChanges: [],
      imagePathChanges: []
    };
    
    lines.forEach(line => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        changes.additions.push(line.substring(1).trim());
        
        // Détecter changements de batterie
        if (line.includes('battery') || line.includes('measure_battery')) {
          changes.batteryChanges.push({
            type: 'addition',
            content: line.substring(1).trim()
          });
        }
        
        // Détecter changements de chemins d'images
        if (line.includes('.png') || line.includes('.svg') || line.includes('assets')) {
          changes.imagePathChanges.push({
            type: 'addition',
            content: line.substring(1).trim()
          });
        }
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        changes.deletions.push(line.substring(1).trim());
        
        if (line.includes('battery') || line.includes('measure_battery')) {
          changes.batteryChanges.push({
            type: 'deletion',
            content: line.substring(1).trim()
          });
        }
        
        if (line.includes('.png') || line.includes('.svg') || line.includes('assets')) {
          changes.imagePathChanges.push({
            type: 'deletion',
            content: line.substring(1).trim()
          });
        }
      }
    });
    
    return changes;
  }

  /**
   * Extrait la configuration de batterie d'un commit
   */
  async extractBatteryConfig(commitHash, driverPath) {
    const deviceJsPath = path.join(driverPath, 'device.js');
    const composeJsonPath = path.join(driverPath, 'driver.compose.json');
    
    const deviceJs = this.execGit(`git show ${commitHash}:"${deviceJsPath}"`);
    const composeJson = this.execGit(`git show ${commitHash}:"${composeJsonPath}"`);
    
    if (!deviceJs && !composeJson) return null;
    
    const config = {
      commitHash,
      driver: path.basename(driverPath),
      batteryHandling: null,
      energyConfig: null
    };
    
    // Analyser device.js
    if (deviceJs) {
      // Chercher le parser de batterie
      const batteryMatch = deviceJs.match(/reportParser:\s*value\s*=>\s*{([^}]+)}/s);
      if (batteryMatch) {
        config.batteryHandling = batteryMatch[1].trim();
      }
    }
    
    // Analyser compose.json
    if (composeJson) {
      try {
        const compose = JSON.parse(composeJson);
        if (compose.energy && compose.energy.batteries) {
          config.energyConfig = compose.energy.batteries;
        }
      } catch (err) {
        // JSON invalide
      }
    }
    
    return config;
  }

  /**
   * Trouve les commits où la validation passait
   */
  async findWorkingCommits() {
    console.log('\n🔍 Recherche des commits fonctionnels...');
    
    const commits = this.getCommits(50);
    const workingCommits = [];
    
    for (const commit of commits) {
      // Chercher des messages de succès
      if (commit.message.match(/success|published|validated|fix|✅/i)) {
        workingCommits.push(commit);
      }
    }
    
    console.log(`   ✅ Trouvé ${workingCommits.length} commits potentiellement fonctionnels`);
    return workingCommits;
  }

  /**
   * Analyse complète
   */
  async analyze() {
    console.log('\n🔬 ANALYSE HISTORIQUE GIT - DÉBUT\n');
    console.log('='.repeat(60));
    
    // 1. Récupérer les commits
    const commits = this.getCommits(100);
    this.results.commits = commits;
    
    // 2. Analyser chaque commit
    console.log('\n📊 Analyse détaillée des commits...');
    const analyses = [];
    for (let i = 0; i < Math.min(commits.length, 30); i++) {
      const analysis = this.analyzeCommit(commits[i]);
      if (analysis) {
        analyses.push(analysis);
      }
    }
    
    // 3. Identifier les commits liés à la batterie
    const batteryCommits = analyses.filter(a => a.batteryRelated);
    console.log(`\n🔋 ${batteryCommits.length} commits liés à la batterie trouvés`);
    batteryCommits.slice(0, 5).forEach(c => {
      console.log(`   - ${c.commit.shortHash}: ${c.commit.message.substring(0, 60)}`);
    });
    
    // 4. Identifier les commits liés aux images
    const imageCommits = analyses.filter(a => a.imageRelated);
    console.log(`\n🖼️  ${imageCommits.length} commits liés aux images trouvés`);
    imageCommits.slice(0, 5).forEach(c => {
      console.log(`   - ${c.commit.shortHash}: ${c.commit.message.substring(0, 60)}`);
    });
    
    // 5. Trouver les versions fonctionnelles
    const workingCommits = await this.findWorkingCommits();
    this.results.workingVersions = workingCommits;
    
    // 6. Comparer les versions
    if (workingCommits.length >= 2) {
      console.log('\n🔄 Comparaison des versions fonctionnelles...');
      const latest = commits[0];
      const lastWorking = workingCommits[0];
      
      // Comparer un driver spécifique
      const testDriver = 'drivers/pir_radar_illumination_sensor_battery/device.js';
      const diff = this.diffCommits(lastWorking.hash, latest.hash, testDriver);
      
      if (diff && diff.batteryChanges.length > 0) {
        console.log('\n   📝 Changements de batterie détectés:');
        diff.batteryChanges.forEach(change => {
          console.log(`      ${change.type}: ${change.content.substring(0, 80)}`);
        });
      }
    }
    
    // 7. Générer les recommandations
    this.generateRecommendations(analyses, batteryCommits, imageCommits);
    
    return this.results;
  }

  /**
   * Génère les recommandations
   */
  generateRecommendations(analyses, batteryCommits, imageCommits) {
    console.log('\n💡 RECOMMANDATIONS BASÉES SUR L\'HISTORIQUE\n');
    
    // Recommandation 1: Revenir à une config fonctionnelle
    if (this.results.workingVersions.length > 0) {
      const lastWorking = this.results.workingVersions[0];
      this.results.recommendations.push({
        priority: 'high',
        type: 'rollback',
        title: 'Revenir à une version fonctionnelle',
        commit: lastWorking.shortHash,
        message: lastWorking.message,
        command: `git checkout ${lastWorking.hash} -- drivers/ assets/`,
        reason: 'Cette version était fonctionnelle'
      });
      console.log(`   ✅ Version fonctionnelle identifiée: ${lastWorking.shortHash}`);
    }
    
    // Recommandation 2: Patterns de batterie qui marchaient
    if (batteryCommits.length > 0) {
      this.results.recommendations.push({
        priority: 'high',
        type: 'battery_config',
        title: 'Utiliser les patterns de batterie éprouvés',
        commits: batteryCommits.slice(0, 3).map(c => c.commit.shortHash),
        reason: 'Ces commits contenaient des configurations de batterie'
      });
    }
    
    // Recommandation 3: Chemins d'images qui marchaient
    if (imageCommits.length > 0) {
      this.results.recommendations.push({
        priority: 'high',
        type: 'image_paths',
        title: 'Vérifier les chemins d\'images historiques',
        commits: imageCommits.slice(0, 3).map(c => c.commit.shortHash),
        reason: 'Ces commits modifiaient les chemins d\'images'
      });
    }
    
    this.results.recommendations.forEach(r => {
      console.log(`   [${r.priority.toUpperCase()}] ${r.title}`);
      if (r.command) console.log(`      Command: ${r.command}`);
    });
  }

  /**
   * Sauvegarde le rapport
   */
  async saveReport() {
    const reportPath = path.join(this.projectRoot, 'reports', 'GIT_HISTORY_ANALYSIS.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n✅ Rapport sauvegardé: ${reportPath}`);
  }
}

// Exécution
if (require.main === module) {
  (async () => {
    try {
      const analyzer = new GitHistoryAnalyzer();
      await analyzer.analyze();
      await analyzer.saveReport();
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 RÉSUMÉ');
      console.log('='.repeat(60));
      console.log(`Commits analysés: ${analyzer.results.commits.length}`);
      console.log(`Versions fonctionnelles: ${analyzer.results.workingVersions.length}`);
      console.log(`Recommandations: ${analyzer.results.recommendations.length}`);
      console.log('='.repeat(60) + '\n');
      
    } catch (err) {
      console.error('❌ ERREUR:', err);
      process.exit(1);
    }
  })();
}

module.exports = GitHistoryAnalyzer;
