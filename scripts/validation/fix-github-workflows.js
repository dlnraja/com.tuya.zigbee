#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 🔧 CORRECTEUR AUTOMATIQUE GITHUB WORKFLOWS
 * Corrige tous les problèmes de sécurité, performance et CI/CD
 */
class GitHubWorkflowFixer {
  constructor() {
    this.workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    this.fixes = [];
    this.backupDir = path.join(process.cwd(), '.github', 'workflows-backup');
  }

  log(message, type = 'info') {
    const icons = { info: '📝', success: '✅', error: '❌', warning: '⚠️', fix: '🔧' };
    console.log(`${icons[type]} ${message}`);
  }

  /**
   * Créer backup des workflows avant modification
   */
  createBackup() {
    this.log('💾 Création backup des workflows...', 'info');

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const workflowFiles = fs.readdirSync(this.workflowsDir)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

    for (const file of workflowFiles) {
      const source = path.join(this.workflowsDir, file);
      const backup = path.join(this.backupDir, `${file}.backup`);
      fs.copyFileSync(source, backup);
    }

    this.log(`💾 Backup créé: ${workflowFiles.length} fichiers`, 'success');
  }

  /**
   * Corriger les problèmes de sécurité
   */
  fixSecurityIssues(content, fileName) {
    let modified = false;
    const fixes = [];

    try {
      const workflow = yaml.load(content);

      // 1. Corriger permissions trop larges
      if (workflow.permissions) {
        if (workflow.permissions === 'write-all') {
          workflow.permissions = {
            contents: 'read',
            actions: 'read',
            packages: 'read'
          };
          fixes.push('Limité permissions globales');
          modified = true;
        } else if (typeof workflow.permissions === 'object' && workflow.permissions.contents === 'write') {
          // Garder write seulement si nécessaire pour les workflows de publication
          if (fileName.includes('publish') || fileName.includes('version') || fileName.includes('automation')) {
            workflow.permissions = {
              contents: 'write',
              actions: 'read',
              packages: 'write'
            };
            fixes.push('Limité permissions write aux opérations essentielles');
          } else {
            workflow.permissions = {
              contents: 'read',
              actions: 'read'
            };
            fixes.push('Réduit permissions à read-only');
          }
          modified = true;
        }
      }

      // 2. Sécuriser l'usage de github.event
      if (workflow.jobs) {
        for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
          if (jobConfig.steps) {
            for (let i = 0; i < jobConfig.steps.length; i++) {
              const step = jobConfig.steps[i];
              if (step.run && step.run.includes('${{ github.event')) {
                // Remplacer les références directes à github.event par des variables sécurisées
                step.run = step.run.replace(
                  /\$\{\{\s*github\.event\.([^}]+)\s*\}\}/g,
                  (match, eventPath) => {
                    // Ajouter validation pour les inputs utilisateur
                    if (eventPath.includes('inputs.')) {
                      return `\${{ inputs.${eventPath.split('.')[1]} }}`;
                    }
                    return match; // Garder autres événements
                  }
                );
                fixes.push(`Job ${jobName}: Sécurisé usage github.event`);
                modified = true;
              }
            }
          }
        }
      }

      // 3. Ajouter validation des secrets optionnels
      if (workflow.jobs) {
        for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
          if (jobConfig.steps) {
            for (let i = 0; i < jobConfig.steps.length; i++) {
              const step = jobConfig.steps[i];

              // Ajouter conditions pour secrets optionnels (IA)
              if (step.env && (step.env.GEMINI_API_KEY || step.env.OPENAI_API_KEY)) {
                if (!step.if) {
                  step.if = "env.GEMINI_API_KEY != '' || env.OPENAI_API_KEY != ''";
                  fixes.push(`Job ${jobName}: Ajouté validation secrets IA`);
                  modified = true;
                }
              }
            }
          }
        }
      }

      if (modified) {
        return { content: yaml.dump(workflow, { lineWidth: 120, noRefs: true }), fixes };
      }

    } catch (error) {
      this.log(`❌ Erreur parsing YAML ${fileName}: ${error.message}`, 'error');
    }

    return { content, fixes };
  }

  /**
   * Corriger les problèmes de performance
   */
  fixPerformanceIssues(content, fileName) {
    let modified = false;
    const fixes = [];

    try {
      const workflow = yaml.load(content);

      // 1. Optimiser les schedules trop fréquents
      if (workflow.on && workflow.on.schedule) {
        let schedules = Array.isArray(workflow.on.schedule) ? workflow.on.schedule : [workflow.on.schedule];

        for (let i = 0; i < schedules.length; i++) {
          const schedule = schedules[i];
          if (schedule.cron) {
            // Corriger schedules toutes les minutes
            if (schedule.cron === '* * * * *') {
              schedule.cron = '*/5 * * * *'; // Toutes les 5 minutes minimum
              fixes.push('Schedule: * * * * * → */5 * * * * (minimum 5min)');
              modified = true;
            }
            // Corriger schedules toutes les heures
            else if (schedule.cron === '0 * * * *') {
              schedule.cron = '0 */2 * * *'; // Toutes les 2 heures minimum
              fixes.push('Schedule: 0 * * * * → 0 */2 * * * (minimum 2h)');
              modified = true;
            }
          }
        }

        workflow.on.schedule = schedules.length === 1 ? schedules[0] : schedules;
      }

      // 2. Ajouter cache pour tous les setup-node
      if (workflow.jobs) {
        for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
          if (jobConfig.steps) {
            for (let i = 0; i < jobConfig.steps.length; i++) {
              const step = jobConfig.steps[i];

              if (step.uses && step.uses.includes('setup-node')) {
                if (!step.with) {
                  step.with = {};
                }
                if (!step.with.cache) {
                  step.with.cache = 'npm';
                  fixes.push(`Job ${jobName}: Ajouté cache npm`);
                  modified = true;
                }
              }
            }
          }
        }
      }

      // 3. Ajouter timeout raisonnables
      if (workflow.jobs) {
        for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
          if (!jobConfig['timeout-minutes']) {
            // Timeout par défaut selon le type de job
            let timeout = 30; // défaut
            if (fileName.includes('automation') || fileName.includes('enrichment')) {
              timeout = 60; // Plus long pour automation
            } else if (fileName.includes('publish')) {
              timeout = 20; // Court pour publish
            } else if (fileName.includes('validate')) {
              timeout = 15; // Très court pour validation
            }

            jobConfig['timeout-minutes'] = timeout;
            fixes.push(`Job ${jobName}: Ajouté timeout ${timeout}min`);
            modified = true;
          }
        }
      }

      // 4. Optimiser les actions vers les dernières versions
      if (workflow.jobs) {
        for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
          if (jobConfig.steps) {
            for (let i = 0; i < jobConfig.steps.length; i++) {
              const step = jobConfig.steps[i];

              if (step.uses) {
                const updates = {
                  'actions/checkout@v3': 'actions/checkout@v4',
                  'actions/setup-node@v3': 'actions/setup-node@v4',
                  'actions/upload-artifact@v3': 'actions/upload-artifact@v4'
                };

                for (const [old, newVersion] of Object.entries(updates)) {
                  if (step.uses === old) {
                    step.uses = newVersion;
                    fixes.push(`Job ${jobName}: ${old} → ${newVersion}`);
                    modified = true;
                  }
                }
              }
            }
          }
        }
      }

      if (modified) {
        return { content: yaml.dump(workflow, { lineWidth: 120, noRefs: true }), fixes };
      }

    } catch (error) {
      this.log(`❌ Erreur parsing YAML ${fileName}: ${error.message}`, 'error');
    }

    return { content, fixes };
  }

  /**
   * Corrections spécifiques aux workflows problématiques
   */
  fixSpecificWorkflows(content, fileName) {
    let modified = false;
    const fixes = [];

    // Corrections spécifiques pour intelligent-weekly-automation.yml
    if (fileName === 'intelligent-weekly-automation.yml') {
      try {
        const workflow = yaml.load(content);

        // Ajouter conditions pour les jobs selon le schedule
        if (workflow.jobs) {
          for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
            // Améliorer les conditions if pour éviter exécutions inutiles
            if (jobName === 'critical-components' && !jobConfig.if.includes('github.event_name')) {
              jobConfig.if = `github.event_name == 'schedule' && (github.event.schedule == '0 */2 * * *' || github.event.inputs.component_type == 'critical' || github.event.inputs.component_type == 'all')`;
              fixes.push('Amélioré conditions critical-components');
              modified = true;
            }
          }
        }

        // Optimiser les timeouts
        if (workflow.jobs && workflow.jobs['weekly-intelligent-orchestration']) {
          if (workflow.jobs['weekly-intelligent-orchestration']['timeout-minutes'] > 180) {
            workflow.jobs['weekly-intelligent-orchestration']['timeout-minutes'] = 120;
            fixes.push('Réduit timeout orchestration: 180min → 120min');
            modified = true;
          }
        }

        if (modified) {
          return { content: yaml.dump(workflow, { lineWidth: 120, noRefs: true }), fixes };
        }
      } catch (error) {
        this.log(`❌ Erreur parsing ${fileName}: ${error.message}`, 'error');
      }
    }

    return { content, fixes };
  }

  /**
   * Traiter un workflow individuel
   */
  fixWorkflow(fileName) {
    const filePath = path.join(this.workflowsDir, fileName);
    this.log(`🔧 Correction: ${fileName}`, 'fix');

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let allFixes = [];

      // 1. Corrections sécurité
      const securityResult = this.fixSecurityIssues(content, fileName);
      content = securityResult.content;
      allFixes.push(...securityResult.fixes);

      // 2. Corrections performance
      const performanceResult = this.fixPerformanceIssues(content, fileName);
      content = performanceResult.content;
      allFixes.push(...performanceResult.fixes);

      // 3. Corrections spécifiques
      const specificResult = this.fixSpecificWorkflows(content, fileName);
      content = specificResult.content;
      allFixes.push(...specificResult.fixes);

      // Écrire le fichier modifié
      if (allFixes.length > 0) {
        fs.writeFileSync(filePath, content);
        this.log(`✅ ${fileName}: ${allFixes.length} corrections appliquées`, 'success');
        allFixes.forEach(fix => this.log(`  - ${fix}`, 'fix'));
        this.fixes.push({ file: fileName, fixes: allFixes });
      } else {
        this.log(`ℹ️ ${fileName}: Aucune correction nécessaire`, 'info');
      }

    } catch (error) {
      this.log(`❌ Erreur correction ${fileName}: ${error.message}`, 'error');
    }
  }

  /**
   * Générer rapport de corrections
   */
  generateFixReport() {
    const timestamp = new Date().toISOString();
    let report = `# 🔧 RAPPORT CORRECTIONS GITHUB WORKFLOWS

**Généré**: ${timestamp}
**Fichiers traités**: ${this.fixes.length}

## 📊 RÉSUMÉ DES CORRECTIONS

`;

    let totalFixes = 0;
    this.fixes.forEach(({ file, fixes }) => {
      totalFixes += fixes.length;
    });

    report += `**TOTAL CORRECTIONS APPLIQUÉES**: ${totalFixes}\n\n`;

    // Détail par fichier
    this.fixes.forEach(({ file, fixes }) => {
      report += `## 🔧 ${file}\n\n`;
      fixes.forEach(fix => {
        report += `- ✅ ${fix}\n`;
      });
      report += '\n';
    });

    // Instructions post-correction
    report += `## 🚀 ÉTAPES SUIVANTES

### 1. Validation
\`\`\`bash
# Tester les workflows localement
node scripts/validation/validate-github-workflows.js
\`\`\`

### 2. Déploiement
\`\`\`bash
# Commiter les corrections
git add .github/workflows/
git commit -m "🔧 Fix: Correction automatique workflows GitHub Actions (${totalFixes} fixes)"
git push origin master
\`\`\`

### 3. Vérification
- Aller sur GitHub Actions et vérifier que les workflows sont valides
- Tester un déclenchement manuel pour validation
- Surveiller les prochaines exécutions automatiques

### 4. Restoration (si nécessaire)
\`\`\`bash
# En cas de problème, restaurer depuis backup
cp .github/workflows-backup/*.backup .github/workflows/
\`\`\`

---
*Corrections appliquées automatiquement par GitHub Workflow Fixer v1.0*
`;

    return report;
  }

  /**
   * Exécution complète des corrections
   */
  run() {
    this.log('🚀 CORRECTION COMPLÈTE WORKFLOWS GITHUB ACTIONS', 'info');

    // 1. Créer backup
    this.createBackup();

    // 2. Lister tous les workflows
    if (!fs.existsSync(this.workflowsDir)) {
      this.log('❌ Directory .github/workflows non trouvé', 'error');
      return false;
    }

    const workflowFiles = fs.readdirSync(this.workflowsDir)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

    this.log(`📂 Traitement de ${workflowFiles.length} workflows...`, 'info');

    // 3. Corriger chaque workflow
    workflowFiles.forEach(file => {
      this.fixWorkflow(file);
    });

    // 4. Générer rapport
    const report = this.generateFixReport();
    const reportPath = path.join(process.cwd(), 'GITHUB-WORKFLOWS-FIX-REPORT.md');
    fs.writeFileSync(reportPath, report);
    this.log(`📄 Rapport généré: ${reportPath}`, 'success');

    // 5. Résumé
    const totalFixes = this.fixes.reduce((sum, { fixes }) => sum + fixes.length, 0);

    if (totalFixes > 0) {
      this.log(`🎉 CORRECTIONS TERMINÉES: ${totalFixes} fixes appliqués sur ${this.fixes.length} fichiers`, 'success');
      return true;
    } else {
      this.log('ℹ️ Aucune correction nécessaire', 'info');
      return true;
    }
  }
}

// Exécution directe
if (require.main === module) {
  const fixer = new GitHubWorkflowFixer();
  const success = fixer.run();
  process.exit(success ? 0 : 1);
}

module.exports = GitHubWorkflowFixer;
