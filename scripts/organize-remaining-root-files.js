#!/usr/bin/env node
/**
 * 🗂️ ORGANIZE REMAINING ROOT FILES
 * 
 * Organise les 46 fichiers restants à la racine
 */

const fs = require('fs');
const path = require('path');

const REMAINING_FILES = {
  // Audits → docs/audits/
  audits: [
    'AUDIT_COMPLET_FINAL_v3.1.0.md',
    'AUDIT_IMPLEMENTATION_v3.1.3.md'
  ],
  
  // Bugs fixes → docs/fixes/
  fixes: [
    'BUGS_PETER_CORRIGES_RESUME.md',
    'FIX_ENOSPC_BUILD_ERROR.md',
    'FINAL_FIX_OCT18_2025.md'
  ],
  
  // Deployments → docs/deployments/
  deployments: [
    'DEPLOYMENT_v3.1.0_SUMMARY.md',
    'GITHUB_ACTIONS_PUBLISH.md',
    'GITHUB_ACTIONS_STATUS.md',
    'PUBLICATION_v3.1.1_FINAL.md',
    'PUBLISH_v3.0.60.md'
  ],
  
  // Emails → docs/communication/
  communication: [
    'EMAIL_RESPONSE_PETER_V3.1.8.txt',
    'EMAIL_TO_PETER_VERSION_CHECK.txt',
    'EMAIL_TO_USER_bf38b171.txt'
  ],
  
  // Finalisation → docs/finalization/
  finalization: [
    'FINALISATION_COMPLETE_v3.1.0.md',
    'FINALISATION_COMPLETE_v3.1.3.md',
    'FINAL_GITHUB_ACTIONS_v3.1.1.md',
    'FINAL_IMPLEMENTATION_SUMMARY.md',
    'FINAL_PERFECT_VALIDATION.md',
    'FINAL_ULTIMATE_RESTORATION_OCT19.md',
    'FINAL_VALIDATION_COMPLETE_v3.1.3.md'
  ],
  
  // Forum → docs/forum/
  forum: [
    'FORUM_407_ANALYSIS_COMPLETE.md',
    'FORUM_QUICK_REPLY.txt',
    'FORUM_RESPONSE_UGRBNK.txt',
    'FORUM_RESPONSE_UGRBNK_SHORT.txt'
  ],
  
  // Implementation → docs/implementation/
  implementation: [
    'IMPLEMENTATION_COMPLETE.md',
    'IMPROVEMENTS_COMPLETE.md',
    'IMPROVEMENT_PLAN.md',
    'MASSIVE_DRIVER_FIXES_v3.1.2.md'
  ],
  
  // Peter specific → docs/users/peter/
  peter: [
    'PETER_RESPONSE_COMPLETE.md',
    'PETER_SITUATION_SUMMARY.txt'
  ],
  
  // Summaries → docs/summaries/
  summaries: [
    'COMPLETE_PACKAGE_SUMMARY.md',
    'RECAPITULATIF_COMPLET_FINAL.md',
    'RÉSUMÉ_FINAL_ULTIME_v3.1.0.md',
    'SYNTHESE_COMPLETE_v3.1.3.md'
  ],
  
  // README variants → docs/readme-variants/
  readme_variants: [
    'README.txt',
    'README_SESSION_OCT19.txt'
  ],
  
  // Technical → docs/technical/
  technical: [
    'ZIGBEE_LOCAL_ONLY_CLARIFICATION.md',
    'TUYA_CLOUD_DEVICES_ADDED_OCT19.md'
  ],
  
  // Misc → docs/misc/
  misc: [
    'PROJECT_UPDATE_OCT18_2025.md',
    'FORCE_PUBLISH.ps1',
    'fix-images.js',
    'publish-trigger.txt',
    'validation.log',
    'app.json.backup-titleformatted'
  ]
};

class RemainingOrganizer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.stats = { moved: 0, kept: 0, errors: 0 };
  }

  log(msg, color = 'reset') {
    const COLORS = { reset: '\x1b[0m', green: '\x1b[32m', cyan: '\x1b[36m', magenta: '\x1b[35m', red: '\x1b[31m' };
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  moveFile(file, targetDir) {
    const sourcePath = path.join(this.rootDir, file);
    
    if (!fs.existsSync(sourcePath)) {
      this.log(`  ⏭️  ${file}: n'existe pas`, 'cyan');
      return false;
    }
    
    const targetPath = path.join(this.rootDir, targetDir, file);
    
    try {
      fs.mkdirSync(path.join(this.rootDir, targetDir), { recursive: true });
      fs.renameSync(sourcePath, targetPath);
      this.stats.moved++;
      return true;
    } catch (err) {
      this.log(`  ❌ Erreur ${file}: ${err.message}`, 'red');
      this.stats.errors++;
      return false;
    }
  }

  async run() {
    this.log('\n╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🗂️  ORGANISATION FICHIERS RESTANTS                             ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝\n', 'magenta');
    
    for (const [category, files] of Object.entries(REMAINING_FILES)) {
      const targetDir = category === 'peter' ? 'docs/users/peter' : `docs/${String(category).replace('_', '-')}`;
      
      this.log(`\n📦 ${targetDir} (${files.length} fichiers)`, 'cyan');
      
      for (const file of files) {
        if (this.moveFile(file, targetDir)) {
          this.log(`  ✅ ${file}`, 'green');
        }
      }
    }
    
    this.log('\n═══════════════════════════════════════════════════════════════════════', 'magenta');
    this.log(`  📦 Fichiers déplacés: ${this.stats.moved}`, 'green');
    this.log(`  ❌ Erreurs: ${this.stats.errors}`, this.stats.errors > 0 ? 'red' : 'green');
    this.log('═══════════════════════════════════════════════════════════════════════\n', 'magenta');
    
    this.log('✅ ORGANISATION TERMINÉE!', 'green');
    this.log('ℹ️  Racine maintenant vraiment propre!\n', 'cyan');
  }
}

if (require.main === module) {
  const organizer = new RemainingOrganizer();
  organizer.run().catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
}

module.exports = RemainingOrganizer;
