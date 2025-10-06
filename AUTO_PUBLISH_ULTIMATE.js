#!/usr/bin/env node
/**
 * AUTO PUBLISH ULTIMATE - Publication automatique 100% autonome
 * Déclenche réellement les workflows GitHub Actions en modifiant un fichier
 */

const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const MAX_ITERATIONS = 10;
const POLL_INTERVAL = 15000; // 15 secondes
const MAX_WAIT = 300000; // 5 minutes max par workflow
const TRIGGER_FILE = path.join(__dirname, '.github', 'WORKFLOW_TRIGGER.txt');

console.log('🚀 AUTO PUBLISH ULTIMATE - 100% Automatique');
console.log('='.repeat(80));
console.log(`Max iterations: ${MAX_ITERATIONS}`);
console.log(`Poll interval: ${POLL_INTERVAL / 1000}s`);
console.log(`Max wait: ${MAX_WAIT / 1000}s`);
console.log('');

// Créer le fichier trigger s'il n'existe pas
const triggerDir = path.dirname(TRIGGER_FILE);
if (!fs.existsSync(triggerDir)) {
  fs.mkdirSync(triggerDir, { recursive: true });
}

function apiRequest(endpoint) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.github.com',
      path: endpoint,
      headers: {
        'User-Agent': 'Auto-Publisher',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function getLatestRun() {
  const data = await apiRequest('/repos/dlnraja/com.tuya.zigbee/actions/runs?per_page=1');
  return data?.workflow_runs?.[0] || null;
}

async function getRun(runId) {
  return await apiRequest(`/repos/dlnraja/com.tuya.zigbee/actions/runs/${runId}`);
}

async function waitForCompletion(runId) {
  const startTime = Date.now();
  let lastStatus = '';
  
  console.log(`⏳ Surveillance workflow ${runId}...`);
  
  while (Date.now() - startTime < MAX_WAIT) {
    const run = await getRun(runId);
    
    if (!run) {
      console.log(`   ⚠️  Run ${runId} non trouvé`);
      break;
    }
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const status = `${run.status}${run.conclusion ? ' → ' + run.conclusion : ''}`;
    
    if (status !== lastStatus) {
      console.log(`   [${elapsed}s] ${status}`);
      lastStatus = status;
    }
    
    if (run.status === 'completed') {
      console.log(`\n✅ Workflow terminé (${elapsed}s)`);
      return run;
    }
    
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
  
  console.log(`\n⏰ Timeout (${MAX_WAIT / 1000}s)`);
  return null;
}

function triggerWorkflow(iteration) {
  console.log(`\n🔄 Déclenchement workflow ${iteration}/${MAX_ITERATIONS}...`);
  
  try {
    // Modifier le fichier trigger pour déclencher le workflow
    const content = `Workflow trigger iteration ${iteration}/${MAX_ITERATIONS}\nTimestamp: ${new Date().toISOString()}\n`;
    fs.writeFileSync(TRIGGER_FILE, content);
    
    console.log(`   ✅ Fichier trigger mis à jour`);
    
    // Git add + commit + push
    execSync('git add .github/WORKFLOW_TRIGGER.txt', { stdio: 'pipe' });
    execSync(`git commit -m "trigger: Workflow iteration ${iteration}/${MAX_ITERATIONS}"`, { stdio: 'pipe' });
    
    console.log(`   ✅ Commit créé`);
    
    execSync('git push origin master', { stdio: 'pipe' });
    
    console.log(`   ✅ Push réussi`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Erreur: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🎯 Démarrage publication automatique...\n');
  
  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    console.log('='.repeat(80));
    console.log(`🔄 ITÉRATION ${i}/${MAX_ITERATIONS}`);
    console.log('='.repeat(80));
    
    try {
      // Déclencher le workflow
      const triggered = triggerWorkflow(i);
      
      if (!triggered) {
        console.log(`\n❌ Échec déclenchement - passage itération suivante\n`);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      
      // Attendre que le workflow démarre
      console.log(`\n⏳ Attente démarrage workflow (30s)...`);
      await new Promise(r => setTimeout(r, 30000));
      
      // Récupérer le workflow
      const run = await getLatestRun();
      
      if (!run) {
        console.log(`\n❌ Workflow non détecté\n`);
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
      
      console.log(`\n✅ Workflow détecté: ${run.id}`);
      console.log(`   Name: ${run.name}`);
      console.log(`   URL: ${run.html_url}`);
      
      // Attendre la complétion
      const completed = await waitForCompletion(run.id);
      
      if (!completed) {
        console.log(`\n⚠️  Workflow timeout - relance\n`);
        continue;
      }
      
      // Vérifier le résultat
      if (completed.conclusion === 'success') {
        console.log('\n' + '='.repeat(80));
        console.log('🎉 SUCCÈS ! PUBLICATION RÉUSSIE !');
        console.log('='.repeat(80));
        console.log(`\n   Itération réussie: ${i}/${MAX_ITERATIONS}`);
        console.log(`   Workflow ID: ${completed.id}`);
        console.log(`   URL: ${completed.html_url}`);
        console.log('\n✅ App publiée sur Homey App Store !');
        console.log('🔗 https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee\n');
        
        process.exit(0);
      } else {
        console.log(`\n❌ Workflow échoué: ${completed.conclusion}`);
        console.log(`   URL logs: ${completed.html_url}`);
        
        if (i < MAX_ITERATIONS) {
          console.log(`\n🔄 Relance automatique dans 30s...\n`);
          await new Promise(r => setTimeout(r, 30000));
        }
      }
      
    } catch (error) {
      console.error(`\n❌ Erreur itération ${i}:`, error.message);
      
      if (i < MAX_ITERATIONS) {
        console.log(`\n🔄 Tentative suivante dans 10s...\n`);
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  }
  
  // Échec après toutes les itérations
  console.log('\n' + '='.repeat(80));
  console.log('❌ ÉCHEC APRÈS 10 ITÉRATIONS');
  console.log('='.repeat(80));
  console.log('\n⚠️  Le workflow n\'a pas réussi après 10 tentatives.\n');
  console.log('📋 Vérifications recommandées:');
  console.log('   1. HOMEY_TOKEN configuré: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions');
  console.log('   2. Logs workflows: https://github.com/dlnraja/com.tuya.zigbee/actions');
  console.log('   3. Publication locale: .\\PUBLISH_NOW.ps1\n');
  
  process.exit(1);
}

// Lancer
main().catch(err => {
  console.error('\n💥 Erreur fatale:', err);
  process.exit(1);
});
