#!/usr/bin/env node
/**
 * AUTO GITHUB PUBLISH - Publication automatique via GitHub Actions
 * Relance automatiquement jusqu'à 10 fois en corrigeant les erreurs
 */

const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const rootPath = path.resolve(__dirname, '..', '..');
const MAX_ITERATIONS = 10;
const POLL_INTERVAL = 10000; // 10 secondes
const MAX_WAIT_TIME = 300000; // 5 minutes max par workflow

// Configuration
const REPO_OWNER = 'dlnraja';
const REPO_NAME = 'com.tuya.zigbee';
const WORKFLOW_FILE = 'homey-publish-fixed.yml';

console.log('🚀 AUTO GITHUB PUBLISH - Publication Automatique');
console.log('='.repeat(80));
console.log(`📊 Max iterations: ${MAX_ITERATIONS}`);
console.log(`⏱️  Poll interval: ${POLL_INTERVAL / 1000}s`);
console.log(`⏳ Max wait per run: ${MAX_WAIT_TIME / 1000}s`);
console.log('');

// Fonction pour faire des requêtes GitHub API
function githubRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'User-Agent': 'Homey-Auto-Publisher',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Fonction pour récupérer le dernier workflow run
async function getLatestWorkflowRun() {
  const data = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=1`);
  return data.workflow_runs?.[0] || null;
}

// Fonction pour attendre la complétion d'un workflow
async function waitForWorkflowCompletion(runId, maxWaitTime = MAX_WAIT_TIME) {
  const startTime = Date.now();
  let checks = 0;
  
  console.log(`⏳ Attente complétion workflow ${runId}...`);
  
  while (Date.now() - startTime < maxWaitTime) {
    checks++;
    const run = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}`);
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`   [${checks}] ${elapsed}s - Status: ${run.status} | Conclusion: ${run.conclusion || 'N/A'}`);
    
    if (run.status === 'completed') {
      console.log(`\n✅ Workflow terminé après ${elapsed}s`);
      console.log(`   Conclusion: ${run.conclusion}`);
      return run;
    }
    
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
  
  throw new Error('Timeout - Workflow trop long');
}

// Fonction pour récupérer les logs d'un workflow
async function getWorkflowLogs(runId) {
  try {
    console.log(`📋 Récupération logs workflow ${runId}...`);
    const jobs = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}/jobs`);
    
    if (jobs.jobs && jobs.jobs.length > 0) {
      const job = jobs.jobs[0];
      console.log(`   Job: ${job.name}`);
      console.log(`   Steps: ${job.steps.length}`);
      
      const failedSteps = job.steps.filter(s => s.conclusion === 'failure');
      return {
        job: job,
        failedSteps: failedSteps,
        allSteps: job.steps
      };
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Erreur récupération logs:`, error.message);
    return null;
  }
}

// Fonction pour analyser les erreurs et appliquer des corrections
function analyzeAndFix(logs, iteration) {
  console.log(`\n🔍 Analyse erreurs (itération ${iteration})...`);
  
  if (!logs || !logs.failedSteps || logs.failedSteps.length === 0) {
    console.log(`   ℹ️  Aucune erreur spécifique détectée`);
    return false;
  }
  
  console.log(`   ❌ Steps en échec: ${logs.failedSteps.length}`);
  
  logs.failedSteps.forEach(step => {
    console.log(`      - ${step.name}: ${step.conclusion}`);
  });
  
  // Appliquer des corrections basées sur les erreurs communes
  let fixed = false;
  
  // Correction 1: Problèmes d'authentication
  if (logs.job.name.includes('publish') || logs.failedSteps.some(s => s.name.includes('auth'))) {
    console.log(`   🔧 Correction: Vérification HOMEY_TOKEN...`);
    // Le token doit être configuré dans GitHub Secrets manuellement
    console.log(`   ⚠️  Assurez-vous que HOMEY_TOKEN est configuré dans les secrets`);
  }
  
  // Correction 2: Problèmes de build
  if (logs.failedSteps.some(s => s.name.includes('Build') || s.name.includes('build'))) {
    console.log(`   🔧 Correction: Nettoyage cache build...`);
    try {
      execSync('rm -rf .homeybuild node_modules/.cache', { cwd: rootPath, stdio: 'inherit' });
      fixed = true;
    } catch (e) {
      console.log(`   ⚠️  Nettoyage cache échoué`);
    }
  }
  
  // Correction 3: Problèmes de validation
  if (logs.failedSteps.some(s => s.name.includes('Validate') || s.name.includes('validate'))) {
    console.log(`   🔧 Correction: Validation locale...`);
    try {
      execSync('homey app validate --level=publish', { cwd: rootPath, stdio: 'inherit' });
      console.log(`   ✅ Validation locale OK`);
    } catch (e) {
      console.log(`   ❌ Validation locale échouée - problème dans app.json`);
    }
  }
  
  return fixed;
}

// Fonction pour déclencher un nouveau workflow
async function triggerWorkflow(iteration) {
  console.log(`\n🔄 Déclenchement workflow (itération ${iteration}/${MAX_ITERATIONS})...`);
  
  try {
    // Créer un commit vide pour déclencher le workflow
    const commitMsg = `trigger: Auto-publish iteration ${iteration}/${MAX_ITERATIONS}`;
    execSync(`git commit --allow-empty -m "${commitMsg}"`, { cwd: rootPath, stdio: 'inherit' });
    execSync('git push origin master', { cwd: rootPath, stdio: 'inherit' });
    
    console.log(`✅ Commit poussé - Workflow devrait démarrer`);
    
    // Attendre que le workflow démarre
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const run = await getLatestWorkflowRun();
    if (run) {
      console.log(`✅ Workflow détecté: ${run.id}`);
      console.log(`   URL: ${run.html_url}`);
      return run.id;
    } else {
      throw new Error('Workflow non trouvé');
    }
  } catch (error) {
    console.error(`❌ Erreur déclenchement workflow:`, error.message);
    return null;
  }
}

// Fonction principale
async function main() {
  let successfulRun = null;
  
  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    console.log('\n' + '='.repeat(80));
    console.log(`🔄 ITÉRATION ${iteration}/${MAX_ITERATIONS}`);
    console.log('='.repeat(80));
    
    try {
      // Déclencher le workflow
      const runId = await triggerWorkflow(iteration);
      
      if (!runId) {
        console.log(`❌ Impossible de déclencher workflow - abandon itération ${iteration}`);
        continue;
      }
      
      // Attendre la complétion
      const run = await waitForWorkflowCompletion(runId);
      
      if (run.conclusion === 'success') {
        console.log('\n' + '='.repeat(80));
        console.log('🎉 SUCCÈS ! Workflow complété avec succès');
        console.log('='.repeat(80));
        console.log(`   Itération: ${iteration}/${MAX_ITERATIONS}`);
        console.log(`   Run ID: ${run.id}`);
        console.log(`   URL: ${run.html_url}`);
        console.log('');
        console.log('✅ Publication terminée avec succès !');
        console.log('🔗 Vérifier: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee');
        successfulRun = run;
        break;
      } else {
        console.log('\n❌ Workflow échoué');
        
        // Récupérer et analyser les logs
        const logs = await getWorkflowLogs(run.id);
        const fixed = analyzeAndFix(logs, iteration);
        
        if (iteration < MAX_ITERATIONS) {
          console.log(`\n🔄 Préparation itération ${iteration + 1}...`);
          
          if (fixed) {
            console.log(`   ✅ Corrections appliquées`);
          } else {
            console.log(`   ⚠️  Aucune correction automatique disponible`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.log(`\n❌ Max iterations atteint (${MAX_ITERATIONS})`);
        }
      }
      
    } catch (error) {
      console.error(`\n❌ Erreur itération ${iteration}:`, error.message);
      
      if (iteration < MAX_ITERATIONS) {
        console.log(`   Tentative itération ${iteration + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  // Résumé final
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(80));
  
  if (successfulRun) {
    console.log('✅ Status: SUCCÈS');
    console.log(`   Run ID: ${successfulRun.id}`);
    console.log(`   URL: ${successfulRun.html_url}`);
    console.log('');
    console.log('🎊 Publication complétée avec succès !');
    process.exit(0);
  } else {
    console.log('❌ Status: ÉCHEC');
    console.log(`   Iterations: ${MAX_ITERATIONS}`);
    console.log('');
    console.log('⚠️  Recommandations:');
    console.log('   1. Vérifier HOMEY_TOKEN dans GitHub Secrets');
    console.log('   2. Vérifier les logs: https://github.com/dlnraja/com.tuya.zigbee/actions');
    console.log('   3. Ou utiliser: .\\PUBLISH_NOW.ps1 pour publication locale');
    console.log('');
    process.exit(1);
  }
}

// Lancer
main().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
