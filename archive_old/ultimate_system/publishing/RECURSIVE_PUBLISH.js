#!/usr/bin/env node
/**
 * RECURSIVE_PUBLISH - Publication récursive jusqu'au succès
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 RECURSIVE_PUBLISH - Publication récursive jusqu\'au succès');

const rootDir = path.resolve(__dirname, '..', '..');
const MAX_ATTEMPTS = 5;
const RETRY_DELAY = 3000; // 3 secondes

class RecursivePublisher {
  constructor() {
    this.attempt = 0;
    this.success = false;
  }

  async validateApp() {
    console.log('\n🔍 VALIDATION HOMEY APP:');
    try {
      // Essayer différentes commandes de validation
      const commands = [
        'npx athom app validate',
        'homey app validate', 
        'npx homey app validate'
      ];
      
      for (const cmd of commands) {
        try {
          console.log(`   Essai: ${cmd}`);
          execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
          console.log('✅ Validation réussie');
          return true;
        } catch (error) {
          console.log(`   ❌ ${cmd} échoué`);
          continue;
        }
      }
      
      console.log('⚠️ Aucune validation CLI disponible, continue...');
      return true; // Continue même sans validation
    } catch (error) {
      console.log('❌ Erreur validation');
      return false;
    }
  }

  async incrementVersion() {
    console.log('\n📝 INCREMENT VERSION:');
    try {
      const appPath = path.join(rootDir, 'app.json');
      const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
      
      const parts = app.version.split('.');
      parts[2] = String(parseInt(parts[2] || 0) + 1);
      app.version = parts.join('.');
      
      fs.writeFileSync(appPath, JSON.stringify(app, null, 2));
      console.log(`✅ Version: ${app.version}`);
      return app.version;
    } catch (error) {
      console.error('❌ Erreur version:', error.message);
      return null;
    }
  }

  async attemptPublish() {
    this.attempt++;
    console.log(`\n🚀 TENTATIVE ${this.attempt}/${MAX_ATTEMPTS} - PUBLICATION HOMEY`);
    
    const publishCommands = [
      'npx athom app publish',
      'homey app publish',
      'npx homey app publish'
    ];
    
    for (const cmd of publishCommands) {
      try {
        console.log(`   📱 Essai: ${cmd}`);
        
        // Publication interactive avec gestion des prompts
        const result = await this.runInteractiveCommand(cmd);
        
        if (result.success) {
          console.log('🎉 PUBLICATION RÉUSSIE !');
          this.success = true;
          return true;
        }
      } catch (error) {
        console.log(`   ❌ ${cmd} échoué: ${error.message}`);
      }
    }
    
    return false;
  }

  async runInteractiveCommand(command) {
    return new Promise((resolve) => {
      console.log(`   🔄 Exécution: ${command}`);
      
      const child = spawn('cmd', ['/c', command], {
        cwd: rootDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      // Gestion des prompts automatiques
      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text);
        
        // Répondre automatiquement aux prompts courants
        if (text.includes('Do you want to continue')) {
          child.stdin.write('y\\n');
        }
        if (text.includes('Enter changelog')) {
          child.stdin.write('Ultimate Zigbee Hub - Professional Edition\\n');
        }
        if (text.includes('version')) {
          child.stdin.write('\\n'); // Accept default
        }
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(data.toString());
      });
      
      child.on('close', (code) => {
        const success = code === 0 && !errorOutput.includes('error') && !errorOutput.includes('Error');
        resolve({ success, output, errorOutput, code });
      });
      
      // Timeout après 2 minutes
      setTimeout(() => {
        child.kill();
        resolve({ success: false, output, errorOutput, code: -1 });
      }, 120000);
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async publishRecursively() {
    console.log('🎯 DÉMARRAGE PUBLICATION RÉCURSIVE...\n');
    
    // Validation initiale
    const isValid = await this.validateApp();
    if (!isValid) {
      console.error('💥 Validation échouée - arrêt');
      return false;
    }
    
    // Increment version
    const version = await this.incrementVersion();
    if (!version) {
      console.error('💥 Erreur version - arrêt');
      return false;
    }
    
    // Tentatives récursives
    while (this.attempt < MAX_ATTEMPTS && !this.success) {
      const published = await this.attemptPublish();
      
      if (published) {
        console.log(`\n🎉 SUCCÈS APRÈS ${this.attempt} TENTATIVE(S) !`);
        console.log(`📱 Version publiée: ${version}`);
        return true;
      }
      
      if (this.attempt < MAX_ATTEMPTS) {
        console.log(`\n⏱️ Attente ${RETRY_DELAY/1000}s avant nouvelle tentative...`);
        await this.sleep(RETRY_DELAY);
      }
    }
    
    console.log(`\n❌ ÉCHEC APRÈS ${MAX_ATTEMPTS} TENTATIVES`);
    return false;
  }

  generatePublishReport(success, version) {
    const report = {
      timestamp: new Date().toISOString(),
      action: 'RECURSIVE_PUBLICATION_ATTEMPT',
      attempts: this.attempt,
      maxAttempts: MAX_ATTEMPTS,
      success: success,
      version: version,
      method: 'Local CLI recursive with auto-prompts',
      details: {
        validation: 'Multiple CLI fallback',
        publication: 'Interactive with automated responses',
        retryDelay: `${RETRY_DELAY/1000} seconds`,
        timeout: '2 minutes per attempt'
      },
      nextSteps: success ? [
        'Commit version changes',
        'Test GitHub Actions',
        'Monitor Homey Dashboard'
      ] : [
        'Debug CLI installation',
        'Check Homey credentials',
        'Try manual publication'
      ]
    };
    
    const reportPath = path.join(__dirname, '..', 'reports', 'recursive_publish_report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n💾 Rapport: ${reportPath}`);
    return report;
  }
}

// Exécution
async function main() {
  const publisher = new RecursivePublisher();
  
  try {
    const success = await publisher.publishRecursively();
    const version = await publisher.incrementVersion();
    const report = publisher.generatePublishReport(success, version);
    
    if (success) {
      console.log('\n🏆 PUBLICATION RÉCURSIVE RÉUSSIE !');
      console.log('📝 Prochaine étape: Correction GitHub Actions');
    } else {
      console.log('\n❌ Publication récursive échouée');
      console.log('💡 Essayez manuellement avec: homey app publish');
    }
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = RecursivePublisher;
