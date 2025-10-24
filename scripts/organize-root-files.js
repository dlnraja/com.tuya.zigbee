#!/usr/bin/env node
/**
 * 🗂️ ORGANIZATION ROOT FILES
 * 
 * Range intelligemment les fichiers à la racine
 * Garde seulement les essentiels
 */

const fs = require('fs');
const path = require('path');

const ORGANIZATION_RULES = {
  // Fichiers ESSENTIELS à garder à la racine
  keep_root: [
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'package.json',
    'package-lock.json',
    'app.json',
    'app.js',
    '.gitignore',
    '.gitattributes',
    '.env',
    '.env.example',
    '.eslintrc.json',
    '.prettierrc',
    '.prettierignore',
    '.homeyignore',
    '.homeychangelog.json',
    'jest.config.js'
  ],
  
  // Fichiers de commit → docs/commits/
  commits: /^commit[_-]/i,
  
  // Rapports/Status de session → docs/sessions/
  sessions: [
    /SESSION.*\.md$/i,
    /COMPLETE.*SESSION/i,
    /FINALE.*OCT/i,
    /SUMMARY.*OCT/i
  ],
  
  // Rapports finaux → docs/reports/
  reports: [
    /REPORT.*\.json$/i,
    /REPORT.*\.md$/i,
    /ANALYSIS.*\.json$/i,
    /STATUS.*FINAL/i,
    /FINAL.*STATUS/i
  ],
  
  // Documentation technique → docs/technical/
  technical: [
    /CLUSTER/i,
    /ZIGBEE.*COOKBOOK/i,
    /SDK.*COMPLIANCE/i,
    /LOGGING.*GUIDE/i,
    /DEVICE.*MATRIX/i
  ],
  
  // Guides/Windsurf → docs/guides/
  guides: [
    /WINDSURF/i,
    /START.*HERE/i,
    /GUIDE/i,
    /ROADMAP/i
  ],
  
  // Accomplissements/Success → docs/achievements/
  achievements: [
    /ACCOMPLISHMENT/i,
    /SUCCESS/i,
    /MISSION.*COMPLETE/i,
    /DEPLOYMENT.*READY/i
  ],
  
  // Fixes/Improvements → docs/fixes/ (déjà existant)
  fixes: [
    /FIX.*APPLIED/i,
    /FIXES.*COMPLETE/i,
    /HOTFIX/i,
    /VALIDATION.*FIXES/i
  ],
  
  // Diagnostics → diagnostics/ (déjà existant)
  diagnostics_files: [
    /DIAGNOSTIC/i,
    /PETER.*DIAGNOSTIC/i,
    /FORENSIC/i
  ],
  
  // Enrichment → docs/enrichment/
  enrichment: [
    /ENRICHMENT/i,
    /ENRICHISSEMENT/i,
    /MEGA.*ENRICHMENT/i
  ],
  
  // Versions/Releases → docs/releases/ (déjà existant)
  releases: [
    /RELEASE/i,
    /VERSION.*3\./i,
    /RÉSUMÉ.*VERSION/i,
    /INTEGRATION.*COMPLETE/i
  ],
  
  // Organisation/Structure → docs/organization/
  organization: [
    /ORGANISATION/i,
    /MIGRATION/i,
    /AUTOMATISATION/i
  ],
  
  // Messages commit temporaires → .archive/commit-messages/
  temp_commits: [
    /-msg\.txt$/,
    /temp-commit/i,
    /ci-fix-msg/i,
    /readme-msg/i
  ]
};

class RootOrganizer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.stats = {
      kept: 0,
      moved: 0,
      errors: 0
    };
  }

  log(msg, color = 'reset') {
    const COLORS = { reset: '\x1b[0m', green: '\x1b[32m', cyan: '\x1b[36m', yellow: '\x1b[33m', magenta: '\x1b[35m', red: '\x1b[31m' };
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  moveFile(file, targetDir) {
    const sourcePath = path.join(this.rootDir, file);
    const targetPath = path.join(this.rootDir, targetDir, file);
    
    try {
      // Créer dossier si nécessaire
      fs.mkdirSync(path.join(this.rootDir, targetDir), { recursive: true });
      
      // Déplacer fichier
      fs.renameSync(sourcePath, targetPath);
      this.stats.moved++;
      return true;
    } catch (err) {
      this.log(`  ❌ Erreur ${file}: ${err.message}`, 'red');
      this.stats.errors++;
      return false;
    }
  }

  categorizeFile(file) {
    // Garder à la racine
    if (ORGANIZATION_RULES.keep_root.includes(file)) {
      return 'root';
    }
    
    // Commits
    if (ORGANIZATION_RULES.commits.test(file)) {
      return 'docs/commits';
    }
    
    // Sessions
    if (ORGANIZATION_RULES.sessions.some(regex => regex.test(file))) {
      return 'docs/sessions';
    }
    
    // Reports
    if (ORGANIZATION_RULES.reports.some(regex => regex.test(file))) {
      return 'docs/reports';
    }
    
    // Technical
    if (ORGANIZATION_RULES.technical.some(regex => regex.test(file))) {
      return 'docs/technical';
    }
    
    // Guides
    if (ORGANIZATION_RULES.guides.some(regex => regex.test(file))) {
      return 'docs/guides';
    }
    
    // Achievements
    if (ORGANIZATION_RULES.achievements.some(regex => regex.test(file))) {
      return 'docs/achievements';
    }
    
    // Fixes
    if (ORGANIZATION_RULES.fixes.some(regex => regex.test(file))) {
      return 'docs/fixes';
    }
    
    // Diagnostics
    if (ORGANIZATION_RULES.diagnostics_files.some(regex => regex.test(file))) {
      return 'diagnostics';
    }
    
    // Enrichment
    if (ORGANIZATION_RULES.enrichment.some(regex => regex.test(file))) {
      return 'docs/enrichment';
    }
    
    // Releases
    if (ORGANIZATION_RULES.releases.some(regex => regex.test(file))) {
      return 'docs/releases';
    }
    
    // Organization
    if (ORGANIZATION_RULES.organization.some(regex => regex.test(file))) {
      return 'docs/organization';
    }
    
    // Temp commits
    if (ORGANIZATION_RULES.temp_commits.some(regex => regex.test(file))) {
      return '.archive/commit-messages';
    }
    
    return null;
  }

  async run() {
    this.log('\n╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🗂️  ORGANISATION INTELLIGENTE - FICHIERS RACINE                ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝\n', 'magenta');
    
    const files = fs.readdirSync(this.rootDir);
    const toProcess = files.filter(f => {
      const stat = fs.statSync(path.join(this.rootDir, f));
      return stat.isFile() && !f.startsWith('.');
    });
    
    this.log(`📁 ${toProcess.length} fichiers à analyser\n`, 'cyan');
    
    const categories = {};
    
    for (const file of toProcess) {
      const category = this.categorizeFile(file);
      
      if (category === 'root') {
        this.stats.kept++;
        continue;
      }
      
      if (category) {
        if (!categories[category]) categories[category] = [];
        categories[category].push(file);
      }
    }
    
    // Déplacer par catégorie
    for (const [category, files] of Object.entries(categories)) {
      this.log(`\n📦 ${category} (${files.length} fichiers)`, 'cyan');
      
      for (const file of files) {
        if (this.moveFile(file, category)) {
          this.log(`  ✅ ${file}`, 'green');
        }
      }
    }
    
    this.log('\n═══════════════════════════════════════════════════════════════════════', 'magenta');
    this.log(`  ✅ Fichiers gardés racine: ${this.stats.kept}`, 'green');
    this.log(`  📦 Fichiers déplacés: ${this.stats.moved}`, 'green');
    this.log(`  ❌ Erreurs: ${this.stats.errors}`, this.stats.errors > 0 ? 'red' : 'green');
    this.log('═══════════════════════════════════════════════════════════════════════\n', 'magenta');
    
    this.log('✅ ORGANISATION TERMINÉE!', 'green');
    this.log('ℹ️  Racine maintenant propre avec seulement fichiers essentiels\n', 'cyan');
  }
}

if (require.main === module) {
  const organizer = new RootOrganizer();
  organizer.run().catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
}

module.exports = RootOrganizer;
