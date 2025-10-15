#!/usr/bin/env node
'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════
 *  MASTER AUTO-FIX SYSTEM v1.0
 *  Système autonome qui diagnostique ET corrige automatiquement
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Reprend TOUTES les découvertes et applique les fixes:
 * 1. Diagnostic complet
 * 2. Application des fixes automatiques
 * 3. Validation
 * 4. Génération rapport
 * 5. Commit automatique (optionnel)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

class MasterAutoFix {
  constructor() {
    this.fixesApplied = [];
    this.errors = [];
  }

  log(message) {
    console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${message}`);
  }

  async run() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║          🤖 MASTER AUTO-FIX SYSTEM v1.0                      ║');
    console.log('║       Diagnostic → Fix → Validate → Report                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    try {
      // Phase 1: Diagnostic
      this.log('📊 Phase 1: Running diagnostic...');
      await this.runDiagnostic();

      // Phase 2: Apply fixes
      this.log('🔧 Phase 2: Applying automatic fixes...');
      await this.applyFixes();

      // Phase 3: Re-validate
      this.log('✅ Phase 3: Re-validating...');
      await this.runDiagnostic();

      // Phase 4: Generate final report
      this.log('📄 Phase 4: Generating final report...');
      await this.generateFinalReport();

      // Phase 5: Commit (optional)
      if (this.fixesApplied.length > 0) {
        this.log('💾 Phase 5: Ready to commit...');
        await this.proposeCommit();
      }

      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log('║                    ✅ AUTO-FIX COMPLETE                       ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    } catch (error) {
      console.error('\n❌ Error in auto-fix system:', error);
      throw error;
    }
  }

  async runDiagnostic() {
    try {
      execSync('node scripts/diagnostics/AUTO_DIAGNOSTIC_SYSTEM.js', {
        cwd: PROJECT_ROOT,
        stdio: 'inherit'
      });
      this.log('   ✅ Diagnostic complete');
    } catch (err) {
      this.errors.push({ phase: 'diagnostic', error: err.message });
      throw err;
    }
  }

  async applyFixes() {
    const fixes = [
      {
        name: 'Smart Battery Calculation',
        script: 'scripts/fixes/AUTO_UPGRADE_BATTERY_CALC.js',
        priority: 'HIGH'
      },
      {
        name: 'Driver Images',
        script: 'scripts/generation/GENERATE_UNIQUE_DRIVER_IMAGES.js',
        priority: 'MEDIUM'
      },
      {
        name: 'App Images',
        script: 'scripts/generation/GENERATE_APP_IMAGES.js',
        priority: 'HIGH'
      }
    ];

    for (const fix of fixes) {
      try {
        if (fs.existsSync(path.join(PROJECT_ROOT, fix.script))) {
          this.log(`   🔧 Applying: ${fix.name}...`);
          execSync(`node ${fix.script}`, {
            cwd: PROJECT_ROOT,
            stdio: 'pipe'
          });
          this.fixesApplied.push(fix.name);
          this.log(`   ✅ ${fix.name} applied`);
        }
      } catch (err) {
        this.log(`   ⚠️  ${fix.name} failed: ${err.message}`);
        this.errors.push({ fix: fix.name, error: err.message });
      }
    }

    this.log(`   📊 Fixes applied: ${this.fixesApplied.length}`);
  }

  async generateFinalReport() {
    const reportPath = path.join(PROJECT_ROOT, 'reports/diagnostics/AUTO_FIX_REPORT.md');
    
    const report = `# 🤖 MASTER AUTO-FIX REPORT

**Generated:** ${new Date().toISOString()}  
**System:** Master Auto-Fix v1.0

---

## ✅ FIXES APPLIED (${this.fixesApplied.length})

${this.fixesApplied.map((fix, i) => `${i + 1}. **${fix}** ✅`).join('\n')}

---

## ❌ ERRORS (${this.errors.length})

${this.errors.length > 0 ? this.errors.map((err, i) => `${i + 1}. **[${err.phase || err.fix}]** ${err.error}`).join('\n') : 'No errors! 🎉'}

---

## 📊 SUMMARY

- Fixes applied: ${this.fixesApplied.length}
- Errors: ${this.errors.length}
- Status: ${this.fixesApplied.length > 0 && this.errors.length === 0 ? '✅ SUCCESS' : this.errors.length > 0 ? '⚠️ PARTIAL' : '✅ COMPLETE'}

---

## 🎯 NEXT STEPS

${this.fixesApplied.length > 0 ? `
1. Review changes in drivers
2. Test locally with \`npx homey app install\`
3. Commit changes
4. Push to GitHub
5. GitHub Actions will auto-publish
` : 'No changes needed - project is in perfect state! ✅'}

---

**Generated by Master Auto-Fix System v1.0**
`;

    fs.writeFileSync(reportPath, report);
    this.log(`   📄 Report saved: ${path.relative(PROJECT_ROOT, reportPath)}`);
  }

  async proposeCommit() {
    console.log('\n📦 Changes ready to commit:');
    console.log(`   ✅ ${this.fixesApplied.length} fixes applied`);
    
    const commitMessage = `chore: auto-fix system improvements

🤖 MASTER AUTO-FIX APPLIED

Fixes:
${this.fixesApplied.map(f => `- ${f}`).join('\n')}

Generated by Master Auto-Fix System v1.0

[auto-fix-${Date.now()}]`;

    const commitFile = path.join(PROJECT_ROOT, 'AUTO_FIX_COMMIT_MESSAGE.txt');
    fs.writeFileSync(commitFile, commitMessage);
    
    console.log('\n📝 Commit message saved to: AUTO_FIX_COMMIT_MESSAGE.txt');
    console.log('\nTo commit, run:');
    console.log('   git add .');
    console.log('   git commit -F AUTO_FIX_COMMIT_MESSAGE.txt');
    console.log('   git push');
  }
}

// Main execution
async function main() {
  const system = new MasterAutoFix();
  await system.run();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
