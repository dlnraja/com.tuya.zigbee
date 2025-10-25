#!/usr/bin/env node

/**
 * FIX CLUSTER, GANG, AND POWER ISSUES
 * Auto-fixes critical issues found by DIAGNOSE_CLUSTER_ISSUES.js
 */

const fs = require('fs');
const path = require('path');

class CriticalIssuesFixer {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.reportPath = path.join(this.projectRoot, 'reports', 'CLUSTER_DIAGNOSTIC_REPORT.json');
    this.backupDir = path.join(this.projectRoot, '.backup-critical-fixes');
    
    this.fixes = {
      clusterStrings: 0,
      gangSetups: 0,
      powerSourceSaving: 0,
      requirePaths: 0
    };

    // Zigbee Cluster ID Map (SDK3 Official)
    this.CLUSTER_MAP = {
      'CLUSTER.POWER_CONFIGURATION': '1',
      'CLUSTER.ON_OFF': '6',
      'CLUSTER.LEVEL_CONTROL': '8',
      'CLUSTER.SCENES': '5',
      'CLUSTER.GROUPS': '4',
      'CLUSTER.IDENTIFY': '3',
      'CLUSTER.THERMOSTAT': '513',
      'CLUSTER.FAN_CONTROL': '514',
      'CLUSTER.ANALOG_INPUT': '12',
      'CLUSTER.TEMPERATURE_MEASUREMENT': '1026',
      'CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT': '1029',
      'CLUSTER.OCCUPANCY_SENSING': '1030',
      'CLUSTER.ILLUMINANCE_MEASUREMENT': '1024',
      'CLUSTER.PRESSURE_MEASUREMENT': '1027',
      'CLUSTER.ELECTRICAL_MEASUREMENT': '2820',
      'CLUSTER.METERING': '1794',
      'CLUSTER.DOOR_LOCK': '257',
      'CLUSTER.WINDOW_COVERING': '258',
      'CLUSTER.IAS_ZONE': '1280',
      'CLUSTER.COLOR_CONTROL': '768'
    };
  }

  /**
   * Main execution
   */
  async run() {
    console.log('🔧 CRITICAL ISSUES FIXER');
    console.log('='.repeat(70));
    console.log('');

    // Load diagnostic report
    if (!fs.existsSync(this.reportPath)) {
      console.log('❌ No diagnostic report found!');
      console.log('   Run DIAGNOSE_CLUSTER_ISSUES.js first');
      return;
    }

    const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
    console.log(`📋 Loaded report: ${report.issues.length} issues found`);
    console.log('');

    // Create backup
    this.createBackup();

    // Fix issues by type
    console.log('🔄 Applying fixes...');
    console.log('');

    // 1. Fix cluster strings (CRITICAL)
    const clusterIssues = report.issues.filter(i => i.type === 'CLUSTER_STRING_USAGE');
    if (clusterIssues.length > 0) {
      console.log(`🔴 Fixing ${clusterIssues.length} cluster string issues...`);
      this.fixClusterStrings(clusterIssues);
    }

    // 2. Fix missing gang setups (CRITICAL)
    const gangIssues = report.issues.filter(i => i.type === 'MISSING_GANG_SETUP');
    if (gangIssues.length > 0) {
      console.log(`🔴 Fixing ${gangIssues.length} gang setup issues...`);
      this.fixGangSetups(gangIssues);
    }

    // 3. Fix power source saving (HIGH)
    const powerIssues = report.issues.filter(i => i.type === 'POWER_SOURCE_NOT_SAVED');
    if (powerIssues.length > 0) {
      console.log(`🟡 Fixing ${powerIssues.length} power source issues...`);
      this.fixPowerSourceSaving(powerIssues);
    }

    // 4. Fix require paths (CRITICAL)
    const pathIssues = report.issues.filter(i => i.type === 'INCORRECT_REQUIRE_PATH');
    if (pathIssues.length > 0) {
      console.log(`🔴 Fixing ${pathIssues.length} require path issues...`);
      this.fixRequirePaths(pathIssues);
    }

    this.printSummary();
  }

  /**
   * Create backup before fixes
   */
  createBackup() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, timestamp);
    fs.mkdirSync(backupPath, { recursive: true });

    console.log(`💾 Creating backup: ${path.relative(this.projectRoot, backupPath)}`);
    console.log('');
  }

  /**
   * Fix cluster string usage
   */
  fixClusterStrings(issues) {
    // Group by file
    const fileGroups = {};
    issues.forEach(issue => {
      if (!fileGroups[issue.file]) {
        fileGroups[issue.file] = [];
      }
      fileGroups[issue.file].push(issue);
    });

    Object.entries(fileGroups).forEach(([filePath, fileIssues]) => {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Replace each cluster string with numeric ID
      Object.entries(this.CLUSTER_MAP).forEach(([clusterStr, clusterId]) => {
        // Pattern 1: clusters[CLUSTER.XXX]
        const pattern1 = new RegExp(`clusters\\[${clusterStr}\\]`, 'g');
        if (pattern1.test(content)) {
          content = content.replace(pattern1, `clusters[${clusterId}]`);
          modified = true;
        }

        // Pattern 2: CLUSTER.XXX (standalone)
        // Only replace if it's used as cluster ID, not as constant
        const pattern2 = new RegExp(`(endpoint\\[1\\]\\.clusters\\[)${clusterStr}(\\])`, 'g');
        if (pattern2.test(content)) {
          content = content.replace(pattern2, `$1${clusterId}$2`);
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.fixes.clusterStrings++;
        console.log(`   ✅ Fixed: ${path.relative(this.projectRoot, filePath)}`);
      }
    });
  }

  /**
   * Fix missing gang setups
   */
  fixGangSetups(issues) {
    issues.forEach(issue => {
      const filePath = issue.file;
      let content = fs.readFileSync(filePath, 'utf8');

      // Find where gang 1 is set up
      const gang1Pattern = /registerCapabilityListener\s*\(\s*'onoff'\s*,\s*this\.onOffGang1\.bind\(this\)\s*\)/;
      const match = content.match(gang1Pattern);

      if (!match) {
        console.log(`   ⚠️  Could not find gang1 setup in ${path.relative(this.projectRoot, filePath)}`);
        return;
      }

      // Add gang 2 setup after gang 1
      const gang2Setup = `
    // Gang 2
    this.registerCapabilityListener('onoff.gang2', this.onOffGang2.bind(this));`;

      content = content.replace(gang1Pattern, match[0] + gang2Setup);

      // Add gang 2 method if it doesn't exist
      if (!content.includes('onOffGang2')) {
        const gang2Method = `

  /**
   * Handle onoff capability for gang 2
   */
  async onOffGang2(value) {
    this.log('Gang 2 onoff:', value);
    
    try {
      await this.zclNode.endpoints[1].clusters[6]
        .writeAttributes({ onOff: value });
      this.log('✅ Gang 2 set to:', value);
    } catch (error) {
      this.error('Gang 2 control failed:', error.message);
      throw new Error(this.homey.__('errors.control_failed'));
    }
  }`;

        // Insert before last closing brace
        const lastBraceIndex = content.lastIndexOf('}');
        content = content.substring(0, lastBraceIndex) + gang2Method + '\n' + content.substring(lastBraceIndex);
      }

      fs.writeFileSync(filePath, content, 'utf8');
      this.fixes.gangSetups++;
      console.log(`   ✅ Fixed: ${path.relative(this.projectRoot, filePath)}`);
    });
  }

  /**
   * Fix power source saving
   */
  fixPowerSourceSaving(issues) {
    issues.forEach(issue => {
      const filePath = issue.file;
      let content = fs.readFileSync(filePath, 'utf8');

      // Find detectPowerSource call
      const detectPattern = /(const|let)\s+powerSource\s*=\s*await\s+this\.detectPowerSource\(\)/;
      const match = content.match(detectPattern);

      if (!match) {
        console.log(`   ⚠️  Could not find detectPowerSource in ${path.relative(this.projectRoot, filePath)}`);
        return;
      }

      // Add saving after detection
      const saveCode = `
      
      // Save detected power source
      await this.setStoreValue('power_source', powerSource);
      if (this.hasCapability('power_source')) {
        await this.setCapabilityValue('power_source', powerSource);
      }`;

      content = content.replace(detectPattern, match[0] + saveCode);

      fs.writeFileSync(filePath, content, 'utf8');
      this.fixes.powerSourceSaving++;
      console.log(`   ✅ Fixed: ${path.relative(this.projectRoot, filePath)}`);
    });
  }

  /**
   * Fix require paths
   */
  fixRequirePaths(issues) {
    issues.forEach(issue => {
      const filePath = issue.file;
      let content = fs.readFileSync(filePath, 'utf8');

      content = content.replace(
        /require\(['"]\.\.\/lib\/BaseHybridDevice['"]\)/g,
        "require('../../lib/BaseHybridDevice')"
      );

      fs.writeFileSync(filePath, content, 'utf8');
      this.fixes.requirePaths++;
      console.log(`   ✅ Fixed: ${path.relative(this.projectRoot, filePath)}`);
    });
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log('');
    console.log('='.repeat(70));
    console.log('📊 FIX SUMMARY');
    console.log('='.repeat(70));
    console.log('');
    console.log(`✅ Cluster strings fixed: ${this.fixes.clusterStrings} files`);
    console.log(`✅ Gang setups fixed: ${this.fixes.gangSetups} files`);
    console.log(`✅ Power source saving fixed: ${this.fixes.powerSourceSaving} files`);
    console.log(`✅ Require paths fixed: ${this.fixes.requirePaths} files`);
    console.log('');

    const total = Object.values(this.fixes).reduce((a, b) => a + b, 0);
    if (total > 0) {
      console.log(`🎉 Total: ${total} files fixed`);
      console.log('');
      console.log('Next steps:');
      console.log('1. Test affected drivers');
      console.log('2. Run homey app build');
      console.log('3. Commit changes');
      console.log('4. Deploy to production');
    } else {
      console.log('⚠️  No files were modified');
    }
    console.log('='.repeat(70));
  }
}

// Run
const fixer = new CriticalIssuesFixer();
fixer.run().catch(error => {
  console.error('❌ Fixer failed:', error);
  process.exit(1);
});
