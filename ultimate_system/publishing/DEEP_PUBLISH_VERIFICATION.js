#!/usr/bin/env node
/**
 * DEEP_PUBLISH_VERIFICATION - Vérification approfondie statut publication
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 DEEP_PUBLISH_VERIFICATION - Analyse complète statut publication');
console.log('=' .repeat(70));

const rootDir = path.resolve(__dirname, '..', '..');

class DeepVerifier {
  constructor() {
    this.results = {
      appStatus: {},
      gitAnalysis: {},
      workflowAnalysis: {},
      publicationIndicators: [],
      confidence: 0
    };
  }

  analyzeApp() {
    console.log('\n📱 ANALYSE DÉTAILLÉE APPLICATION:');
    try {
      const appJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8'));
      
      this.results.appStatus = {
        id: appJson.id,
        version: appJson.version,
        name: appJson.name.en,
        sdk: appJson.sdk,
        category: appJson.category,
        compatibility: appJson.compatibility
      };
      
      console.log(`✅ ID: ${appJson.id}`);
      console.log(`✅ Version: ${appJson.version}`);
      console.log(`✅ SDK: ${appJson.sdk}`);
      
      // Vérifier validation
      execSync('homey app validate', { cwd: rootDir, stdio: 'ignore' });
      console.log('✅ Validation SDK3: RÉUSSIE');
      this.results.appStatus.validation = 'SUCCESS';
      
    } catch (error) {
      console.error('❌ Erreur analyse app:', error.message);
      this.results.appStatus.validation = 'FAILED';
    }
  }

  analyzeGitHistory() {
    console.log('\n📂 ANALYSE HISTORIQUE GIT:');
    try {
      // Analyse des 20 derniers commits
      const commits = execSync('git log --oneline -20', {
        encoding: 'utf8',
        cwd: rootDir
      }).split('\n').filter(Boolean);
      
      console.log(`📊 Analysant ${commits.length} commits récents...`);
      
      const publishKeywords = [
        'publish', 'publication', 'app store', 'homey store',
        'orchestration', 'retry', 'auto-publish', 'version bump'
      ];
      
      const publishCommits = commits.filter(commit => 
        publishKeywords.some(keyword => 
          commit.toLowerCase().includes(keyword)
        )
      );
      
      console.log(`🎯 Commits de publication trouvés: ${publishCommits.length}`);
      publishCommits.slice(0, 5).forEach((commit, i) => {
        console.log(`   ${i + 1}. ${commit}`);
      });
      
      this.results.gitAnalysis = {
        totalCommits: commits.length,
        publishCommits: publishCommits.length,
        latestPublishCommit: publishCommits[0] || null,
        recentActivity: commits.slice(0, 5)
      };
      
      if (publishCommits.length > 0) {
        this.results.publicationIndicators.push('GIT_PUBLISH_COMMITS_FOUND');
        this.results.confidence += 25;
      }
      
    } catch (error) {
      console.error('❌ Erreur analyse Git:', error.message);
    }
  }

  analyzeWorkflowFiles() {
    console.log('\n⚙️ ANALYSE WORKFLOWS GITHUB:');
    try {
      const workflowsDir = path.join(rootDir, '.github', 'workflows');
      const workflows = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml'));
      
      console.log(`📋 Workflows trouvés: ${workflows.length}`);
      
      const publishWorkflows = workflows.filter(w => 
        w.includes('publish') || w.includes('homey') || w.includes('app-store')
      );
      
      console.log(`🚀 Workflows de publication: ${publishWorkflows.length}`);
      publishWorkflows.forEach(workflow => {
        console.log(`   • ${workflow}`);
        
        try {
          const content = fs.readFileSync(path.join(workflowsDir, workflow), 'utf8');
          
          // Analyser le contenu pour les triggers
          if (content.includes('push:') && content.includes('master')) {
            console.log(`     ✅ Auto-trigger sur master: OUI`);
            this.results.publicationIndicators.push('AUTO_TRIGGER_CONFIGURED');
          }
          
          if (content.includes('homey app publish')) {
            console.log(`     ✅ Commande publication: OUI`);
            this.results.publicationIndicators.push('PUBLISH_COMMAND_FOUND');
          }
          
        } catch (e) {
          console.log(`     ⚠️ Erreur lecture: ${workflow}`);
        }
      });
      
      this.results.workflowAnalysis = {
        totalWorkflows: workflows.length,
        publishWorkflows: publishWorkflows.length,
        workflows: publishWorkflows
      };
      
      if (publishWorkflows.length > 0) {
        this.results.confidence += 20;
      }
      
    } catch (error) {
      console.error('❌ Erreur analyse workflows:', error.message);
    }
  }

  checkRecentActivity() {
    console.log('\n⏰ ANALYSE ACTIVITÉ RÉCENTE:');
    try {
      // Vérifier les commits des dernières 24h
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const recentCommits = execSync(
        `git log --since="${since24h}" --oneline`, 
        { encoding: 'utf8', cwd: rootDir }
      ).split('\n').filter(Boolean);
      
      console.log(`📅 Commits dernières 24h: ${recentCommits.length}`);
      
      if (recentCommits.length > 0) {
        console.log('📋 Activité récente:');
        recentCommits.forEach((commit, i) => {
          console.log(`   ${i + 1}. ${commit}`);
        });
        
        this.results.publicationIndicators.push('RECENT_ACTIVITY');
        this.results.confidence += 15;
      }
      
      // Vérifier les tags récents
      try {
        const recentTags = execSync('git tag -l --sort=-creatordate', {
          encoding: 'utf8', cwd: rootDir
        }).split('\n').filter(Boolean).slice(0, 5);
        
        if (recentTags.length > 0) {
          console.log(`🏷️ Tags récents: ${recentTags.slice(0, 3).join(', ')}`);
          this.results.publicationIndicators.push('RECENT_TAGS');
        }
      } catch (e) {
        console.log('ℹ️ Pas de tags récents');
      }
      
    } catch (error) {
      console.log('⚠️ Pas d\'activité récente détectée');
    }
  }

  analyzeReports() {
    console.log('\n📊 ANALYSE RAPPORTS SYSTÈME:');
    try {
      const reportsDir = path.join(__dirname, '..', 'reports');
      
      if (fs.existsSync(reportsDir)) {
        const reports = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
        console.log(`📋 Rapports trouvés: ${reports.length}`);
        
        const publishReports = reports.filter(r => 
          r.includes('publish') || r.includes('orchestration') || r.includes('retry')
        );
        
        console.log(`🎯 Rapports de publication: ${publishReports.length}`);
        
        publishReports.forEach(report => {
          try {
            const content = JSON.parse(fs.readFileSync(path.join(reportsDir, report), 'utf8'));
            const status = content.status || content.orchestration?.finalStatus || 'UNKNOWN';
            console.log(`   • ${report}: ${status}`);
            
            if (status.includes('SUCCESS') || status.includes('COMPLETE')) {
              this.results.publicationIndicators.push('SUCCESS_REPORT_FOUND');
              this.results.confidence += 20;
            }
          } catch (e) {
            console.log(`   • ${report}: ERREUR LECTURE`);
          }
        });
      } else {
        console.log('ℹ️ Aucun répertoire reports trouvé');
      }
    } catch (error) {
      console.log('⚠️ Erreur analyse rapports');
    }
  }

  calculateFinalAssessment() {
    console.log('\n🎯 ÉVALUATION FINALE:');
    console.log('=' .repeat(50));
    
    console.log(`📊 Indicateurs trouvés: ${this.results.publicationIndicators.length}`);
    this.results.publicationIndicators.forEach((indicator, i) => {
      console.log(`   ${i + 1}. ${indicator}`);
    });
    
    console.log(`🎲 Score de confiance: ${this.results.confidence}/100`);
    
    let assessment = 'INCONNU';
    let recommendation = '';
    
    if (this.results.confidence >= 70) {
      assessment = '🎉 TRÈS PROBABLEMENT PUBLIÉ';
      recommendation = 'Vérifiez le Dashboard Homey pour confirmation définitive';
    } else if (this.results.confidence >= 40) {
      assessment = '🔄 PROBABLEMENT EN COURS/RÉCENT';
      recommendation = 'Surveillez les GitHub Actions et le Dashboard';
    } else if (this.results.confidence >= 20) {
      assessment = '⚠️ PUBLICATION TENTÉE MAIS INCERTAINE';
      recommendation = 'Vérification manuelle requise';
    } else {
      assessment = '❌ PAS DE SIGNES CLAIRS DE PUBLICATION';
      recommendation = 'Relancer le processus de publication';
    }
    
    console.log(`\n🏆 VERDICT: ${assessment}`);
    console.log(`💡 RECOMMANDATION: ${recommendation}`);
    
    return { assessment, recommendation, confidence: this.results.confidence };
  }

  generateDetailedReport() {
    const finalAssessment = this.calculateFinalAssessment();
    
    const report = {
      timestamp: new Date().toISOString(),
      verification: 'DEEP_ANALYSIS',
      app: this.results.appStatus,
      git: this.results.gitAnalysis,
      workflows: this.results.workflowAnalysis,
      indicators: this.results.publicationIndicators,
      confidence: this.results.confidence,
      assessment: finalAssessment.assessment,
      recommendation: finalAssessment.recommendation,
      monitoringLinks: {
        githubActions: 'https://github.com/dlnraja/com.tuya.zigbee/actions',
        homeyDashboard: 'https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub',
        repository: 'https://github.com/dlnraja/com.tuya.zigbee'
      }
    };
    
    const reportPath = path.join(__dirname, '..', 'reports', 'deep_verification_report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n💾 Rapport détaillé: ${reportPath}`);
    
    return report;
  }

  async run() {
    console.log('🚀 Début vérification approfondie...\n');
    
    this.analyzeApp();
    this.analyzeGitHistory();
    this.analyzeWorkflowFiles();
    this.checkRecentActivity();
    this.analyzeReports();
    
    const report = this.generateDetailedReport();
    
    console.log('\n🌐 LIENS DE VÉRIFICATION DÉFINITIVE:');
    console.log('📊 https://github.com/dlnraja/com.tuya.zigbee/actions');
    console.log('📱 https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
    
    console.log('\n🏁 VÉRIFICATION APPROFONDIE TERMINÉE');
    
    return report;
  }
}

// Exécution
const verifier = new DeepVerifier();
verifier.run().catch(error => {
  console.error('💥 Erreur vérification:', error.message);
});
