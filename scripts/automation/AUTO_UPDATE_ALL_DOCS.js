#!/usr/bin/env node
/**
 * AUTO UPDATE ALL DOCS - v1.0
 * Automatically updates README.md, device-finder.html, and extracts changelog
 * Run: node scripts/automation/AUTO_UPDATE_ALL_DOCS.js
 */

const fs = require('fs');
const path = require('path');

class AutoUpdateAllDocs {
  constructor() {
    this.rootPath = path.join(__dirname, '../..');
    this.readmePath = path.join(this.rootPath, 'README.md');
    this.deviceFinderPath = path.join(this.rootPath, 'docs', 'device-finder.html');
    this.appJsonPath = path.join(this.rootPath, 'app.json');
    this.changelogPath = path.join(this.rootPath, '.homeychangelog.json');
    this.driversPath = path.join(this.rootPath, 'drivers');
  }

  log(msg, type = 'info') {
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
    console.log(`${icons[type] || '•'} ${msg}`);
  }

  // Get app.json data
  getAppInfo() {
    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    return {
      version: appJson.version,
      driverCount: appJson.drivers?.length || this.countDrivers(),
      manufacturerIds: this.countManufacturerIds(appJson)
    };
  }

  // Count drivers in folder
  countDrivers() {
    if (!fs.existsSync(this.driversPath)) return 0;
    return fs.readdirSync(this.driversPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.')).length;
  }

  // Count manufacturer IDs in app.json
  countManufacturerIds(appJson) {
    let count = 0;
    if (appJson.drivers) {
      appJson.drivers.forEach(driver => {
        if (driver.zigbee?.manufacturerName) {
          count += driver.zigbee.manufacturerName.length;
        }
      });
    }
    return count;
  }

  // Get latest changelog entries
  getLatestChangelog(limit = 10) {
    if (!fs.existsSync(this.changelogPath)) return [];
    const changelog = JSON.parse(fs.readFileSync(this.changelogPath, 'utf8'));
    const entries = Object.entries(changelog).slice(0, limit);
    return entries.map(([version, data]) => ({
      version,
      description: data.en || data
    }));
  }

  // Get current date
  getDate() {
    return new Date().toISOString().split('T')[0];
  }

  // Update README.md
  updateReadme() {
    this.log('Updating README.md...', 'info');

    if (!fs.existsSync(this.readmePath)) {
      this.log('README.md not found', 'error');
      return false;
    }

    let readme = fs.readFileSync(this.readmePath, 'utf8');
    const appInfo = this.getAppInfo();
    const changelog = this.getLatestChangelog(8);

    // Update version badge
    readme = readme.replace(
      /!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-[\d.]+-blue\)/,
      `![Version](https://img.shields.io/badge/version-${appInfo.version}-blue)`
    );

    // Update drivers badge
    readme = readme.replace(
      /!\[Drivers\]\(https:\/\/img\.shields\.io\/badge\/drivers-\d+-brightgreen\)/,
      `![Drivers](https://img.shields.io/badge/drivers-${appInfo.driverCount}-brightgreen)`
    );

    // Update stats table - Drivers count
    readme = readme.replace(
      /\| \*\*Drivers\*\* \| \d+ \|/,
      `| **Drivers** | ${appInfo.driverCount} |`
    );

    // Update stats table - SVG Icons count
    readme = readme.replace(
      /\| \*\*SVG Icons\*\* \| \d+ \|/,
      `| **SVG Icons** | ${appInfo.driverCount} |`
    );

    // Update Last Updated date
    readme = readme.replace(
      /\| \*\*Last Updated\*\* \| [\d-]+ \|/,
      `| **Last Updated** | ${this.getDate()} |`
    );

    // Update header title version
    readme = readme.replace(
      /## 🚀 Latest Updates - v[\d.]+/,
      `## 🚀 Latest Updates - v${appInfo.version}`
    );

    // Update description with driver count
    readme = readme.replace(
      /with \d+ drivers and [\d,]+\+ manufacturer IDs/,
      `with ${appInfo.driverCount} drivers and ${appInfo.manufacturerIds}+ manufacturer IDs`
    );

    // Update 📱 line
    readme = readme.replace(
      /📱 \*\*\d+ Drivers\*\*/,
      `📱 **${appInfo.driverCount} Drivers**`
    );

    // Generate changelog table
    if (changelog.length > 0) {
      const currentVersion = changelog[0].version;
      const changelogTable = changelog.map(entry => {
        const desc = entry.description.length > 60
          ? entry.description.substring(0, 60) + '...'
          : entry.description;
        return `| **v${entry.version}** | ${desc} |`;
      }).join('\n');

      // Replace changelog section
      const changelogRegex = /(\| Version \| Feature \|\n\|[-]+\|[-]+\|\n)([\s\S]*?)(\n\n### 🎯)/;
      if (changelogRegex.test(readme)) {
        readme = readme.replace(changelogRegex, `$1${changelogTable}$3`);
      }
    }

    fs.writeFileSync(this.readmePath, readme);
    this.log(`README.md updated to v${appInfo.version}`, 'success');
    return true;
  }

  // Update device-finder.html
  updateDeviceFinder() {
    this.log('Updating device-finder.html...', 'info');

    if (!fs.existsSync(this.deviceFinderPath)) {
      this.log('device-finder.html not found', 'warning');
      return false;
    }

    let html = fs.readFileSync(this.deviceFinderPath, 'utf8');
    const appInfo = this.getAppInfo();

    // Update header with version and stats
    html = html.replace(
      /<p>Find the perfect driver for your Zigbee device[^<]*<\/p>/,
      `<p>Find the perfect driver for your Zigbee device | v${appInfo.version} | ${appInfo.driverCount} Drivers | ${appInfo.manufacturerIds}+ Manufacturer IDs</p>`
    );

    fs.writeFileSync(this.deviceFinderPath, html);
    this.log(`device-finder.html updated to v${appInfo.version}`, 'success');
    return true;
  }

  // Run all updates
  run() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   AUTO UPDATE ALL DOCS - v1.0          ║');
    console.log('╚════════════════════════════════════════╝\n');

    const appInfo = this.getAppInfo();
    this.log(`App version: ${appInfo.version}`, 'info');
    this.log(`Drivers: ${appInfo.driverCount}`, 'info');
    this.log(`Manufacturer IDs: ${appInfo.manufacturerIds}`, 'info');
    console.log('');

    const results = {
      readme: this.updateReadme(),
      deviceFinder: this.updateDeviceFinder()
    };

    console.log('\n─────────────────────────────────────────');
    console.log('📊 Summary:');
    console.log(`   README.md:         ${results.readme ? '✅ Updated' : '❌ Failed'}`);
    console.log(`   device-finder.html: ${results.deviceFinder ? '✅ Updated' : '⚠️ Skipped'}`);
    console.log('─────────────────────────────────────────\n');

    return results.readme;
  }
}

// Run if called directly
if (require.main === module) {
  const updater = new AutoUpdateAllDocs();
  const success = updater.run();
  process.exit(success ? 0 : 1);
}

module.exports = AutoUpdateAllDocs;
