#!/usr/bin/env node
/**
 * AUTO PUBLISH 10X - Publication automatique GitHub Actions
 * Relance jusqu'à 10 fois sans intervention manuelle
 */

const { execSync, spawn } = require('child_process');
const https = require('https');

const MAX_ITERATIONS = 10;
const WAIT_BETWEEN = 180000; // 3 minutes entre chaque itération

console.log('🚀 AUTO PUBLISH 10X - Publication Automatique GitHub Actions');
console.log('='.repeat(80));
console.log(`Iterations max: ${MAX_ITERATIONS}`);
console.log(`Attente entre itérations: ${WAIT_BETWEEN / 1000}s (3 min)`);
console.log('');

// API GitHub
function getLatestRun() {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.github.com',
      path: '/repos/dlnraja/com.tuya.zigbee/actions/runs?per_page=1',
      headers: { 'User-Agent': 'Auto-Publisher' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.workflow_runs?.[0] || null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function waitAndCheck(runId, maxWait = 180) {
  console.log(`⏳ Surveillance workflow ${runId}...`);
  
  for (let i = 0; i < maxWait; i += 10) {
    await new Promise(r => setTimeout(r, 10000));
    
    const run = await getLatestRun();
    if (run && run.id === runId) {
      process.stdout.write(`\r   [${Math.floor(i/10) + 1}] ${i + 10}s - ${run.status} | ${run.conclusion || 'N/A'}   `);
      
      if (run.status === 'completed') {
        console.log('');
        return run;
      }
    }
  }
  
  console.log('');
  return null;
}

async function runIteration(num) {
  console.log('');
  console.log('='.repeat(80));
  console.log(`🔄 ITÉRATION ${num}/${MAX_ITERATIONS}`);
  console.log('='.repeat(80));
  
  try {
    // Trigger workflow
    console.log(`\n📝 Création commit trigger...`);
    execSync(`git commit --allow-empty -m "trigger: Auto-publish iteration ${num}/${MAX_ITERATIONS}"`, { 
      stdio: 'inherit' 
    });
    
    console.log(`\n📤 Push vers GitHub...`);
    execSync('git push origin master', { stdio: 'inherit' });
    
    console.log(`\n✅ Push réussi - Workflow devrait démarrer`);
    
    // Attente démarrage
    console.log(`\n⏳ Attente démarrage workflow (20s)...`);
    await new Promise(r => setTimeout(r, 20000));
    
    const run = await getLatestRun();
    if (!run) {
      console.log(`\n❌ Aucun workflow détecté`);
      return false;
    }
    
    console.log(`\n✅ Workflow détecté: ${run.id}`);
    console.log(`   URL: ${run.html_url}`);
    
    // Surveillance
    const completed = await waitAndCheck(run.id);
    
    if (!completed) {
      console.log(`\n⚠️  Timeout - Workflow trop long`);
      return false;
    }
    
    console.log(`\n🎯 Workflow terminé: ${completed.conclusion}`);
    
    if (completed.conclusion === 'success') {
      console.log('');
      console.log('='.repeat(80));
      console.log('🎉 SUCCÈS ! PUBLICATION RÉUSSIE !');
      console.log('='.repeat(80));
      console.log(`   Itération: ${num}/${MAX_ITERATIONS}`);
      console.log(`   Run ID: ${completed.id}`);
      console.log(`   URL: ${completed.html_url}`);
      console.log('');
      console.log('✅ App publiée sur Homey App Store !');
      console.log('🔗 https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee');
      console.log('');
      return true;
    } else {
      console.log(`\n❌ Workflow échoué: ${completed.conclusion}`);
      console.log(`   URL logs: ${completed.html_url}`);
      
      if (num < MAX_ITERATIONS) {
        console.log(`\n🔄 Relance dans ${WAIT_BETWEEN / 1000}s...`);
        await new Promise(r => setTimeout(r, WAIT_BETWEEN));
      }
      
      return false;
    }
    
  } catch (error) {
    console.error(`\n❌ Erreur:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Démarrage...\n');
  
  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    const success = await runIteration(i);
    
    if (success) {
      console.log('='.repeat(80));
      console.log('📊 MISSION ACCOMPLIE');
      console.log('='.repeat(80));
      process.exit(0);
    }
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('❌ ÉCHEC APRÈS 10 ITÉRATIONS');
  console.log('='.repeat(80));
  console.log('');
  console.log('⚠️  Recommandations:');
  console.log('   1. Vérifier HOMEY_TOKEN: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions');
  console.log('   2. Vérifier logs: https://github.com/dlnraja/com.tuya.zigbee/actions');
  console.log('   3. Ou publication locale: .\\PUBLISH_NOW.ps1');
  console.log('');
  process.exit(1);
}

main().catch(err => {
  console.error('\n❌ Erreur fatale:', err);
  process.exit(1);
});
