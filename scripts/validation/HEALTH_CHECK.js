#!/usr/bin/env node

/**
 * 🏥 HEALTH CHECK SYSTEM
 * 
 * Vérifie l'état de santé du projet:
 * - app.json validité
 * - Drivers présence
 * - Images conformité
 * - Workflows configuration
 * - Dependencies à jour
 * 
 * Usage: node scripts/monitoring/HEALTH_CHECK.js
 */

const fs = require('fs');
const path = require('path');

class HealthChecker {
  constructor() {
    this.root = path.resolve(__dirname, '../..');
    this.results = {
      status: 'unknown',
      checks: [],
      timestamp: new Date().toISOString(),
      version: 'v2.15.33'
    };
  }

  async runAll() {
    console.log('🏥 HEALTH CHECK SYSTEM v2.15.33');
    console.log('=' .repeat(70));
    console.log('');

    try {
      // Run all checks
      await this.checkAppJson();
      await this.checkDrivers();
      await this.checkImages();
      await this.checkWorkflows();
      await this.checkDependencies();
      await this.checkDocumentation();
      await this.checkGitStatus();

      // Determine overall status
      const failed = this.results.checks.filter(c => !c.passed).length;
      this.results.status = failed === 0 ? 'healthy' : 'unhealthy';

      // Print summary
      this.printSummary();

      // Save results
      this.saveResults();

      // Exit with appropriate code
      process.exit(failed === 0 ? 0 : 1);

    } catch (error) {
      console.error('❌ CRITICAL ERROR:', error.message);
      process.exit(1);
    }
  }

  async checkAppJson() {
    console.log('📄 Checking app.json...');
    const check = {
      name: 'app.json',
      passed: false,
      details: {}
    };

    try {
      const appJsonPath = path.join(this.root, 'app.json');
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

      check.details = {
        version: appJson.version,
        drivers: appJson.drivers?.length || 0,
        hasCompatibility: !!appJson.compatibility,
        sdk3Compliant: !JSON.stringify(appJson).includes('alarm_temperature'),
        hasFlowCards: !!(appJson.flow?.triggers || appJson.flow?.actions)
      };

      check.passed = check.details.sdk3Compliant && 
                     check.details.hasCompatibility &&
                     check.details.drivers > 0;

      console.log(`  ${check.passed ? '✅' : '❌'} Version: ${check.details.version}`);
      console.log(`  ${check.details.drivers > 0 ? '✅' : '❌'} Drivers: ${check.details.drivers}`);
      console.log(`  ${check.details.sdk3Compliant ? '✅' : '❌'} SDK3 Compliant`);

    } catch (error) {
      check.details.error = error.message;
      console.log(`  ❌ Error: ${error.message}`);
    }

    this.results.checks.push(check);
    console.log('');
  }

  async checkDrivers() {
    console.log('🔧 Checking drivers...');
    const check = {
      name: 'drivers',
      passed: false,
      details: {}
    };

    try {
      const driversDir = path.join(this.root, 'drivers');
      const drivers = fs.readdirSync(driversDir).filter(d =>
        fs.statSync(path.join(driversDir, d)).isDirectory()
      );

      check.details.total = drivers.length;
      check.details.issues = [];

      // Check sample of drivers (first 20)
      const sample = drivers.slice(0, 20);
      let validCount = 0;

      for (const driver of sample) {
        const driverPath = path.join(driversDir, driver);
        const hasDeviceJs = fs.existsSync(path.join(driverPath, 'device.js'));
        const hasCompose = fs.existsSync(path.join(driverPath, 'driver.compose.json'));
        const hasAssets = fs.existsSync(path.join(driverPath, 'assets'));

        if (hasDeviceJs && hasCompose && hasAssets) {
          validCount++;
        } else {
          check.details.issues.push({
            driver,
            missingDeviceJs: !hasDeviceJs,
            missingCompose: !hasCompose,
            missingAssets: !hasAssets
          });
        }
      }

      check.details.validSample = `${validCount}/${sample.length}`;
      check.passed = check.details.issues.length === 0;

      console.log(`  ${check.passed ? '✅' : '⚠️ '} Total drivers: ${check.details.total}`);
      console.log(`  ${check.passed ? '✅' : '⚠️ '} Valid sample: ${check.details.validSample}`);
      
      if (check.details.issues.length > 0) {
        console.log(`  ⚠️  Issues found: ${check.details.issues.length}`);
      }

    } catch (error) {
      check.details.error = error.message;
      console.log(`  ❌ Error: ${error.message}`);
    }

    this.results.checks.push(check);
    console.log('');
  }

  async checkImages() {
    console.log('🖼️  Checking images...');
    const check = {
      name: 'images',
      passed: false,
      details: {}
    };

    try {
      // Check app images
      const appImagesDir = path.join(this.root, 'assets', 'images');
      const requiredAppImages = ['small.png', 'large.png', 'xlarge.png'];
      
      check.details.appImages = requiredAppImages.map(img => ({
        file: img,
        exists: fs.existsSync(path.join(appImagesDir, img))
      }));

      // Check temp_alarm icon
      check.details.tempAlarmIcon = fs.existsSync(
        path.join(this.root, 'assets', 'temp_alarm.svg')
      );

      // Check sample driver images
      const driversDir = path.join(this.root, 'drivers');
      const drivers = fs.readdirSync(driversDir)
        .filter(d => fs.statSync(path.join(driversDir, d)).isDirectory())
        .slice(0, 5);

      check.details.sampleDriverImages = drivers.map(driver => {
        const assetsDir = path.join(driversDir, driver, 'assets');
        return {
          driver,
          hasSmall: fs.existsSync(path.join(assetsDir, 'small.png')),
          hasLarge: fs.existsSync(path.join(assetsDir, 'large.png'))
        };
      });

      check.passed = check.details.appImages.every(img => img.exists) &&
                     check.details.tempAlarmIcon;

      console.log(`  ${check.details.appImages.every(img => img.exists) ? '✅' : '❌'} App images`);
      console.log(`  ${check.details.tempAlarmIcon ? '✅' : '❌'} temp_alarm.svg`);
      console.log(`  📊 Sample drivers checked: ${drivers.length}`);

    } catch (error) {
      check.details.error = error.message;
      console.log(`  ❌ Error: ${error.message}`);
    }

    this.results.checks.push(check);
    console.log('');
  }

  async checkWorkflows() {
    console.log('🔄 Checking workflows...');
    const check = {
      name: 'workflows',
      passed: false,
      details: {}
    };

    try {
      const workflowsDir = path.join(this.root, '.github', 'workflows');
      const allFiles = fs.readdirSync(workflowsDir);

      check.details.active = allFiles.filter(f => 
        f.endsWith('.yml') && !f.endsWith('.disabled')
      ).length;

      check.details.disabled = allFiles.filter(f => 
        f.endsWith('.disabled')
      ).length;

      check.details.autoFixDisabled = fs.existsSync(
        path.join(workflowsDir, 'auto-fix-images.yml.disabled')
      );

      check.details.hasPublishWorkflow = fs.existsSync(
        path.join(workflowsDir, 'auto-publish-complete.yml')
      );

      check.passed = check.details.autoFixDisabled && 
                     check.details.hasPublishWorkflow &&
                     check.details.active > 0;

      console.log(`  ${check.details.active > 0 ? '✅' : '❌'} Active workflows: ${check.details.active}`);
      console.log(`  ${check.details.disabled > 0 ? '✅' : '⚠️ '} Disabled workflows: ${check.details.disabled}`);
      console.log(`  ${check.details.autoFixDisabled ? '✅' : '❌'} Auto-fix images disabled`);
      console.log(`  ${check.details.hasPublishWorkflow ? '✅' : '❌'} Publish workflow exists`);

    } catch (error) {
      check.details.error = error.message;
      console.log(`  ❌ Error: ${error.message}`);
    }

    this.results.checks.push(check);
    console.log('');
  }

  async checkDependencies() {
    console.log('📦 Checking dependencies...');
    const check = {
      name: 'dependencies',
      passed: false,
      details: {}
    };

    try {
      const packageJsonPath = path.join(this.root, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      check.details = {
        hasHomey: !!packageJson.devDependencies?.homey,
        nodeVersion: packageJson.engines?.node || 'not specified',
        totalDeps: Object.keys(packageJson.dependencies || {}).length,
        totalDevDeps: Object.keys(packageJson.devDependencies || {}).length
      };

      check.passed = check.details.hasHomey;

      console.log(`  ${check.details.hasHomey ? '✅' : '❌'} Homey SDK`);
      console.log(`  ${check.details.nodeVersion !== 'not specified' ? '✅' : '⚠️ '} Node version: ${check.details.nodeVersion}`);
      console.log(`  📊 Dependencies: ${check.details.totalDeps}`);
      console.log(`  📊 Dev dependencies: ${check.details.totalDevDeps}`);

    } catch (error) {
      check.details.error = error.message;
      console.log(`  ❌ Error: ${error.message}`);
    }

    this.results.checks.push(check);
    console.log('');
  }

  async checkDocumentation() {
    console.log('📚 Checking documentation...');
    const check = {
      name: 'documentation',
      passed: false,
      details: {}
    };

    try {
      const docsDir = path.join(this.root, 'docs');
      
      const requiredDocs = [
        'ACCOMPLISHMENTS_COMPLETE_v2.15.33.md',
        'PROJECT_OPTIMIZATION_DEBUG_GUIDE.md',
        'FINAL_PROJECT_AUDIT_2025-10-12.md',
        'GITHUB_ACTIONS_PUBLISHING_STATUS.md'
      ];

      check.details.required = requiredDocs.map(doc => ({
        file: doc,
        exists: fs.existsSync(path.join(docsDir, doc))
      }));

      // Count all documentation files
      const countDocs = (dir) => {
        let count = 0;
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            count += countDocs(filePath);
          } else if (file.endsWith('.md')) {
            count++;
          }
        }
        
        return count;
      };

      check.details.totalDocs = countDocs(docsDir);
      check.passed = check.details.required.every(doc => doc.exists);

      const presentCount = check.details.required.filter(doc => doc.exists).length;
      console.log(`  ${check.passed ? '✅' : '⚠️ '} Required docs: ${presentCount}/${requiredDocs.length}`);
      console.log(`  📊 Total documentation files: ${check.details.totalDocs}`);

    } catch (error) {
      check.details.error = error.message;
      console.log(`  ❌ Error: ${error.message}`);
    }

    this.results.checks.push(check);
    console.log('');
  }

  async checkGitStatus() {
    console.log('🔀 Checking git status...');
    const check = {
      name: 'git',
      passed: true,
      details: {}
    };

    try {
      const { execSync } = require('child_process');

      // Check if git repo
      try {
        const status = execSync('git status --porcelain', { 
          cwd: this.root, 
          encoding: 'utf8' 
        });
        
        check.details.uncommittedChanges = status.split('\n').filter(Boolean).length;
        check.details.isClean = check.details.uncommittedChanges === 0;

        // Get current branch
        const branch = execSync('git branch --show-current', {
          cwd: this.root,
          encoding: 'utf8'
        }).trim();
        
        check.details.branch = branch;

        // Get last commit
        const lastCommit = execSync('git log -1 --oneline', {
          cwd: this.root,
          encoding: 'utf8'
        }).trim();
        
        check.details.lastCommit = lastCommit;

        console.log(`  ✅ Branch: ${check.details.branch}`);
        console.log(`  ${check.details.isClean ? '✅' : '⚠️ '} Uncommitted changes: ${check.details.uncommittedChanges}`);
        console.log(`  📝 Last commit: ${lastCommit.substring(0, 50)}...`);

      } catch (gitError) {
        check.details.error = 'Not a git repository or git not installed';
        check.passed = false;
        console.log(`  ⚠️  ${check.details.error}`);
      }

    } catch (error) {
      check.details.error = error.message;
      console.log(`  ❌ Error: ${error.message}`);
    }

    this.results.checks.push(check);
    console.log('');
  }

  printSummary() {
    console.log('=' .repeat(70));
    console.log('📊 HEALTH CHECK SUMMARY');
    console.log('=' .repeat(70));
    console.log('');

    const passed = this.results.checks.filter(c => c.passed).length;
    const total = this.results.checks.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`Status: ${this.results.status === 'healthy' ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    console.log(`Checks: ${passed}/${total} passed (${percentage}%)`);
    console.log('');

    console.log('Detailed Results:');
    for (const check of this.results.checks) {
      console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}`);
    }
    console.log('');
  }

  saveResults() {
    const reportsDir = path.join(this.root, 'docs', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `health-check-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`💾 Results saved: docs/reports/${filename}`);
    console.log('');
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new HealthChecker();
  checker.runAll().catch(error => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  });
}

module.exports = HealthChecker;
