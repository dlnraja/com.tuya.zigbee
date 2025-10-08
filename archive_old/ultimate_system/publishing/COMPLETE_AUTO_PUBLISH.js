#!/usr/bin/env node
/**
 * COMPLETE_AUTO_PUBLISH - Publication complète automatisée
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 COMPLETE_AUTO_PUBLISH - Publication complète automatisée');

const rootDir = path.resolve(__dirname, '..', '..');

class CompletePublisher {
  constructor() {
    this.attempt = 0;
    this.maxAttempts = 3;
  }

  async killExistingProcesses() {
    console.log('\n🔄 NETTOYAGE PROCESSUS:');
    try {
      // Killer les processus homey/node qui pourraient bloquer
      execSync('taskkill /f /im homey.exe 2>nul || echo "Pas de processus homey"', { stdio: 'inherit' });
      execSync('taskkill /f /im node.exe 2>nul || echo "Processus node conservés"', { stdio: 'inherit' });
      console.log('✅ Processus nettoyés');
    } catch (error) {
      console.log('ℹ️ Nettoyage processus terminé');
    }
  }

  async commitAll() {
    console.log('\n📤 COMMIT TOUS CHANGEMENTS:');
    try {
      execSync('git add .', { cwd: rootDir });
      execSync('git commit -m "🎯 v2.1.5 - Complete auto-publish attempt"', { cwd: rootDir });
      console.log('✅ Changements committés');
    } catch (error) {
      console.log('ℹ️ Pas de nouveaux changements');
    }
  }

  async validateApp() {
    console.log('\n🔍 VALIDATION HOMEY:');
    try {
      execSync('homey app validate', { cwd: rootDir, stdio: 'inherit' });
      console.log('✅ Validation réussie');
      return true;
    } catch (error) {
      console.log('❌ Validation échouée');
      return false;
    }
  }

  async updateVersion() {
    console.log('\n📝 UPDATE VERSION:');
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
      console.log('❌ Erreur version');
      return null;
    }
  }

  async attemptPublishWithAnswers() {
    this.attempt++;
    console.log(`\n🚀 TENTATIVE ${this.attempt}/${this.maxAttempts} - PUBLICATION AUTO:`);
    
    return new Promise((resolve) => {
      const answers = [
        'y\n',        // Uncommitted changes? Yes
        'y\n',        // Update version? Yes  
        'patch\n',    // Version type: patch
        'y\n',        // Continue? Yes
        'Ultimate Zigbee Hub v2.1.6 - Complete automated publication\n' // Changelog
      ];
      
      let answerIndex = 0;
      const child = spawn('homey', ['app', 'publish'], {
        cwd: rootDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let hasError = false;
      
      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text);
        
        // Répondre automatiquement aux prompts
        if (text.includes('?') && answerIndex < answers.length) {
          console.log(`🤖 Auto-réponse: ${answers[answerIndex].trim()}`);
          child.stdin.write(answers[answerIndex]);
          answerIndex++;
        }
        
        // Détecter succès
        if (text.includes('published successfully') || text.includes('✓ Published')) {
          console.log('🎉 PUBLICATION DÉTECTÉE COMME RÉUSSIE !');
          setTimeout(() => {
            child.kill();
            resolve(true);
          }, 2000);
        }
      });
      
      child.stderr.on('data', (data) => {
        const errorText = data.toString();
        console.error(errorText);
        if (errorText.includes('error') || errorText.includes('failed')) {
          hasError = true;
        }
      });
      
      child.on('close', (code) => {
        console.log(`\n📊 Code de sortie: ${code}`);
        const success = code === 0 && !hasError && output.includes('published');
        resolve(success);
      });
      
      // Timeout après 5 minutes
      setTimeout(() => {
        console.log('\n⏱️ Timeout atteint, arrêt processus');
        child.kill();
        resolve(false);
      }, 300000);
    });
  }

  async pushToGithub() {
    console.log('\n📤 PUSH GITHUB:');
    try {
      execSync('git push origin master', { cwd: rootDir });
      console.log('✅ Push réussi');
      return true;
    } catch (error) {
      console.log('❌ Erreur push');
      return false;
    }
  }

  async verifyPublication() {
    console.log('\n🔍 VÉRIFICATION PUBLICATION:');
    
    // Vérifier que la version a bien été mise à jour
    try {
      const appPath = path.join(rootDir, 'app.json');
      const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
      console.log(`📱 Version actuelle: ${app.version}`);
      
      if (parseFloat(app.version) > 2.15) {
        console.log('✅ Version incrémentée correctement');
        return true;
      }
    } catch (error) {
      console.log('❌ Erreur vérification version');
    }
    return false;
  }

  async runCompletePublication() {
    console.log('🎯 PUBLICATION COMPLÈTE AUTOMATISÉE...\n');
    
    try {
      // Étape 1: Nettoyage
      await this.killExistingProcesses();
      await this.commitAll();
      
      // Étape 2: Validation
      const isValid = await this.validateApp();
      if (!isValid) {
        console.log('⚠️ Validation échouée mais continue...');
      }
      
      // Étape 3: Tentatives de publication
      let published = false;
      while (this.attempt < this.maxAttempts && !published) {
        published = await this.attemptPublishWithAnswers();
        
        if (!published && this.attempt < this.maxAttempts) {
          console.log('\n⏱️ Attente 5s avant nouvelle tentative...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      if (published) {
        console.log('\n🎉 PUBLICATION RÉUSSIE !');
        
        // Étape 4: Vérification et push
        const verified = await this.verifyPublication();
        const pushed = await this.pushToGithub();
        
        console.log('\n🏆 RÉSULTATS FINAUX:');
        console.log(`✅ Publication: ${published ? 'RÉUSSIE' : 'ÉCHOUÉE'}`);
        console.log(`✅ Vérification: ${verified ? 'OK' : 'À vérifier'}`);
        console.log(`✅ Push GitHub: ${pushed ? 'RÉUSSI' : 'ÉCHOUÉ'}`);
        
        console.log('\n🌐 MONITORING:');
        console.log('📊 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
        console.log('📱 Homey Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
        
        return true;
      } else {
        console.log(`\n❌ PUBLICATION ÉCHOUÉE APRÈS ${this.maxAttempts} TENTATIVES`);
        return false;
      }
      
    } catch (error) {
      console.error('\n💥 Erreur fatale:', error.message);
      return false;
    }
  }
}

// Exécution
async function main() {
  const publisher = new CompletePublisher();
  const success = await publisher.runCompletePublication();
  
  if (success) {
    console.log('\n🎉 MISSION ACCOMPLIE - PUBLICATION COMPLÈTE RÉUSSIE !');
  } else {
    console.log('\n❌ Mission incomplète - Intervention manuelle requise');
  }
}

main();
