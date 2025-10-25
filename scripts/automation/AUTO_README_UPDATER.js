#!/usr/bin/env node
/**
 * AUTO README UPDATER - Autonomous & Automatic
 * Updates README.md with latest stats, links, and info
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AutoReadmeUpdater {
  constructor() {
    this.rootPath = path.join(__dirname, '../..');
    this.readmePath = path.join(this.rootPath, 'README.md');
    this.appJsonPath = path.join(this.rootPath, 'app.json');
    this.driversPath = path.join(this.rootPath, 'drivers');
  }

  log(msg, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${msg}${colors.reset}`);
  }

  /**
   * Get app info
   */
  getAppInfo() {
    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    return {
      name: appJson.name?.en || appJson.name,
      version: appJson.version,
      description: appJson.description?.en || appJson.description,
      sdk: appJson.sdk,
      compatibility: appJson.compatibility,
      driverCount: appJson.drivers?.length || 0
    };
  }

  /**
   * Get latest git commits
   */
  getLatestCommits(count = 5) {
    try {
      const log = execSync(`git log -${count} --pretty=format:"%h|%s|%an|%ar"`, {
        cwd: this.rootPath,
        encoding: 'utf8'
      });
      
      return log.split('\n').map(line => {
        const [hash, message, author, date] = line.split('|');
        return { hash, message, author, date };
      });
    } catch (err) {
      return [];
    }
  }

  /**
   * Get driver stats
   */
  getDriverStats() {
    const stats = {
      total: 0,
      byCategory: {},
      byPowerSource: {}
    };

    if (!fs.existsSync(this.driversPath)) return stats;

    const drivers = fs.readdirSync(this.driversPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.'));

    stats.total = drivers.length;

    // Categorize
    drivers.forEach(driver => {
      const name = driver.name;
      
      // By category
      let category = 'other';
      if (name.includes('switch')) category = 'switches';
      else if (name.includes('sensor')) category = 'sensors';
      else if (name.includes('button')) category = 'buttons';
      else if (name.includes('light') || name.includes('bulb')) category = 'lighting';
      else if (name.includes('plug') || name.includes('outlet')) category = 'power';
      else if (name.includes('climate') || name.includes('temp')) category = 'climate';
      
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      // By power source
      let power = 'unknown';
      if (name.includes('battery')) power = 'battery';
      else if (name.includes('ac')) power = 'ac';
      else if (name.includes('wireless')) power = 'battery';
      
      stats.byPowerSource[power] = (stats.byPowerSource[power] || 0) + 1;
    });

    return stats;
  }

  /**
   * Generate README content
   */
  generateReadme() {
    const appInfo = this.getAppInfo();
    const commits = this.getLatestCommits();
    const driverStats = this.getDriverStats();
    const now = new Date().toISOString().split('T')[0];

    return `# ${appInfo.name}

![Version](https://img.shields.io/badge/version-${appInfo.version}-blue)
![Drivers](https://img.shields.io/badge/drivers-${appInfo.driverCount}-green)
![SDK](https://img.shields.io/badge/SDK-${appInfo.sdk}-orange)
![License](https://img.shields.io/badge/license-GPL--3.0-red)

${appInfo.description || 'Universal Tuya Zigbee Device Support for Homey'}

## 📊 Statistics

- **Total Drivers:** ${appInfo.driverCount}
- **SDK Version:** ${appInfo.sdk}
- **Homey Compatibility:** ${appInfo.compatibility || '>=12.0.0'}
- **Last Updated:** ${now}

### Drivers by Category

${Object.entries(driverStats.byCategory)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, count]) => `- **${cat.charAt(0).toUpperCase() + cat.slice(1)}:** ${count} drivers`)
  .join('\n')}

## 🚀 Latest Updates

${commits.map(c => `- [\`${c.hash}\`] ${c.message} *(${c.date})*`).join('\n')}

## 📦 Installation

### From Homey App Store
1. Open Homey app
2. Go to "More" → "Apps"
3. Search for "${appInfo.name}"
4. Click "Install"

### Manual Installation (Development)
\`\`\`bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
homey app run
\`\`\`

## 🔧 Development

### Prerequisites
- Node.js 18+
- Homey CLI: \`npm install -g homey\`

### Build & Validate
\`\`\`bash
# Build app
homey app build

# Validate (publish level)
homey app validate --level publish

# Run locally
homey app run
\`\`\`

### Scripts Available
\`\`\`bash
# Deep coherence check
node scripts/validation/DEEP_COHERENCE_CHECKER.js

# Auto-fix issues
node scripts/validation/DEEP_COHERENCE_FIXER.js

# Update README (automatic)
node scripts/automation/AUTO_README_UPDATER.js

# Safe push & publish
node scripts/deployment/SAFE_PUSH_AND_PUBLISH.js
\`\`\`

## 📁 Project Structure

\`\`\`
tuya_repair/
├── drivers/           # ${appInfo.driverCount} Zigbee device drivers
├── lib/              # Shared libraries
├── scripts/          # Automation & validation scripts
│   ├── automation/   # Auto-update & organization
│   ├── validation/   # Coherence checking & fixing
│   └── deployment/   # Safe push & publish
├── diagnostics/      # Issue tracking & reports
├── flow/             # Flow cards (triggers, actions, conditions)
├── locales/          # Translations (en, fr, de, nl)
└── app.json          # App manifest
\`\`\`

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Run validation: \`homey app validate\`
4. Submit a pull request

## 📝 License

GPL-3.0 - See LICENSE file

## 🔗 Links

- **Homey App Store:** https://homey.app/a/com.dlnraja.tuya.zigbee/
- **GitHub Repository:** https://github.com/dlnraja/com.tuya.zigbee
- **GitHub Actions:** https://github.com/dlnraja/com.tuya.zigbee/actions
- **Issues & Support:** https://github.com/dlnraja/com.tuya.zigbee/issues

## 📞 Support

For issues and questions:
- Check existing issues: [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- Homey Community Forum: [Universal TUYA Zigbee](https://community.homey.app/)
- Diagnostic reports: Submit via Homey app settings

---

*This README is automatically updated on each commit by AUTO_README_UPDATER.js*

*Last auto-update: ${now}*
`;
  }

  /**
   * Update README
   */
  async run() {
    this.log('\n📝 AUTO README UPDATER - Starting...', 'info');
    this.log('='.repeat(80), 'info');

    try {
      // Generate new README
      const newContent = this.generateReadme();
      
      // Write README.md
      fs.writeFileSync(this.readmePath, newContent, 'utf8');
      this.log('✅ README.md updated successfully', 'success');

      // Also create README.txt for compatibility
      const txtPath = path.join(this.rootPath, 'README.txt');
      fs.writeFileSync(txtPath, newContent, 'utf8');
      this.log('✅ README.txt created for compatibility', 'success');

      this.log('\n📊 Updated Info:', 'info');
      const appInfo = this.getAppInfo();
      console.log(`   Version: ${appInfo.version}`);
      console.log(`   Drivers: ${appInfo.driverCount}`);
      console.log(`   SDK: ${appInfo.sdk}`);

      this.log('\n='.repeat(80), 'info');
      this.log('✅ Auto-update completed!', 'success');

    } catch (err) {
      this.log(`\n❌ Error: ${err.message}`, 'error');
      throw err;
    }
  }
}

// Run
if (require.main === module) {
  const updater = new AutoReadmeUpdater();
  updater.run().catch(console.error);
}

module.exports = AutoReadmeUpdater;
