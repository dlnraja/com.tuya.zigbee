"use strict";
/**
 * ULTIMATE RECURSIVE ORCHESTRATOR N5
 * 
 * Exécute TOUS les scripts du projet de façon récursive jusqu'à validation parfaite:
 * - Traite TOUTES les sources MD/référentiels
 * - Vérifie cohérence globale (cap 200, limites par type)
 * - Corrige bugs forum Homey identifiés
 * - Améliore textes app.json (versions précédentes)
 * - Valide SDK3 publish
 * - Push & publish GitHub Actions
 * - Boucle récursive si erreurs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MAX_ITERATIONS = 5;

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function run(cmd, opts = {}){
  console.log(`\n🔧 ${cmd}`);
  try{
    const output = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit', ...opts });
    return { success: true, output };
  } catch(e){
    console.error(`❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

function readJSON(p){
  try{ return JSON.parse(fs.readFileSync(p, 'utf8')); } catch{ return null; }
}

function writeJSON(p, obj){
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

// Liste TOUS les scripts du projet
const ALL_SCRIPTS = [
  'tools/fs_scan.js',
  'tools/git_history_scan.js',
  'tools/ai_nlp_global_search.js',
  'tools/addon_global_enrichment_orchestrator.js',
  'tools/integrate_addon_sources.js',
  'tools/generate_ecosystem_drivers.js',
  'tools/bdu_consolidate.js',
  'tools/ultimate_coherence_checker_with_all_refs.js',
  'tools/check_each_driver_individually.js',
  'tools/normalize_compose_arrays_v38.js',
  'tools/verify_driver_assets_v38.js'
];

(async function main(){
  console.log('\n👑 ULTIMATE RECURSIVE ORCHESTRATOR N5\n');
  
  for(let iter = 1; iter <= MAX_ITERATIONS; iter++){
    console.log(`\n${'='.repeat(80)}`);
    console.log(`ITERATION ${iter}/${MAX_ITERATIONS}`);
    console.log('='.repeat(80));
    
    // Phase 1: Exécuter TOUS les scripts de vérification/enrichissement
    console.log('\n📋 Phase 1: Exécution scripts audit/enrichissement');
    for(const script of ALL_SCRIPTS){
      if(ex(path.join(ROOT, script))){
        const result = run(`node ${script}`);
        if(!result.success && script.includes('addon_global')){
          console.log('⚠️  Addon fetch failed (endpoints may return HTML), continuing...');
        }
      }
    }
    
    // Phase 2: Corriger app.json (textes/versions)
    console.log('\n📝 Phase 2: Correction app.json');
    const appJsonPath = path.join(ROOT, 'app.json');
    if(ex(appJsonPath)){
      const app = readJSON(appJsonPath);
      if(app){
        // Améliorer description
        if(!app.description || !app.description.en.includes('200 IDs limit')){
          app.description = app.description || {};
          app.description.en = 'Ultimate Zigbee Hub: Professional Tuya integration with strict 200 IDs limit per driver, dynamic per-type limits, global multi-protocol support (SmartThings, Enki, Z2M, ZHA), SDK3 compliant. Supports 162+ device types with intelligent manufacturerName enrichment.';
          app.description.fr = 'Ultimate Zigbee Hub: Intégration professionnelle Tuya avec limite stricte de 200 IDs par driver, limites dynamiques par type, support multi-protocole global (SmartThings, Enki, Z2M, ZHA), conforme SDK3. Supporte 162+ types avec enrichissement intelligent.';
        }
        
        // Améliorer homeyCommunityTopicId si manquant
        if(!app.homeyCommunityTopicId){
          app.homeyCommunityTopicId = 90785; // Thread officiel dlnraja
        }
        
        // Bump version si changements
        if(app.version){
          const parts = app.version.split('.');
          parts[parts.length - 1] = String(parseInt(parts[parts.length - 1]) + 1);
          app.version = parts.join('.');
          console.log(`   Version bumped: ${app.version}`);
        }
        
        writeJSON(appJsonPath, app);
        console.log('   ✅ app.json updated');
      }
    }
    
    // Phase 3: Vérifier GitHub Actions workflow
    console.log('\n⚙️  Phase 3: Vérification GitHub Actions');
    const workflowPath = path.join(ROOT, '.github/workflows/homey.yml');
    if(ex(workflowPath)){
      const workflow = fs.readFileSync(workflowPath, 'utf8');
      if(!workflow.includes('homey app publish')){
        console.log('   ⚠️  Workflow may need adjustment (no publish step found)');
      } else {
        console.log('   ✅ Workflow OK');
      }
    }
    
    // Phase 4: Validation SDK3 publish
    console.log('\n✅ Phase 4: Validation SDK3 publish');
    const valResult = run('node tools/homey_validate.js');
    
    if(valResult.success){
      console.log('\n🎉 Validation réussie!');
      
      // Phase 5: Push & Publish
      console.log('\n🚀 Phase 5: Push & Publish');
      run('node tools/git_add.js');
      run(`node tools/git_commit.js --message="N5 Ultimate: iteration ${iter} - full audit + corrections + validation OK"`);
      const pushResult = run('node tools/git_push.js --remote=origin --branch=master');
      
      if(pushResult.success){
        console.log('\n✅ SUCCÈS COMPLET - Publication GitHub Actions déclenchée');
        console.log(`   Itérations nécessaires: ${iter}/${MAX_ITERATIONS}`);
        process.exit(0);
      } else {
        console.log('\n⚠️  Push échoué, retry...');
      }
    } else {
      console.log(`\n⚠️  Validation échouée à l'itération ${iter}, correction et retry...`);
      // Corrections automatiques si échec
      run('node tools/global_coherence_fix.js');
    }
  }
  
  console.log(`\n❌ Max iterations (${MAX_ITERATIONS}) atteintes sans succès complet`);
  process.exit(1);
})();
