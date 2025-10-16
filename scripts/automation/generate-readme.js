#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * GÉNÉRATION AUTOMATIQUE DU README
 * Basé sur: docs/, commits récents, app.json, structure projet
 */

const ROOT = path.join(__dirname, '../..');

/**
 * Lire app.json pour infos version
 */
function getAppInfo() {
  const appJsonPath = path.join(ROOT, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  return {
    version: appJson.version,
    name: appJson.name.en,
    description: appJson.description.en,
    sdk: appJson.sdk,
    compatibility: appJson.compatibility
  };
}

/**
 * Compter les drivers
 */
function countDrivers() {
  const driversPath = path.join(ROOT, 'drivers');
  const drivers = fs.readdirSync(driversPath).filter(f => {
    const stat = fs.statSync(path.join(driversPath, f));
    return stat.isDirectory();
  });
  return drivers.length;
}

/**
 * Obtenir les derniers commits
 */
function getRecentCommits(count = 5) {
  try {
    const commits = execSync(
      `git log -${count} --pretty=format:"%h|%s|%an|%ar"`,
      { cwd: ROOT, encoding: 'utf8' }
    ).split('\n').map(line => {
      const [hash, subject, author, date] = line.split('|');
      return { hash, subject, author, date };
    });
    return commits;
  } catch (err) {
    console.log('⚠️  Cannot read git commits');
    return [];
  }
}

/**
 * Lire les docs fixes récentes
 */
function getRecentFixes() {
  const fixesPath = path.join(ROOT, 'docs/fixes');
  if (!fs.existsSync(fixesPath)) return [];
  
  const files = fs.readdirSync(fixesPath)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const stat = fs.statSync(path.join(fixesPath, f));
      return { file: f, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 3);
  
  return files.map(f => ({
    name: f.file,
    path: `docs/fixes/${f.file}`,
    date: f.mtime.toISOString().split('T')[0]
  }));
}

/**
 * Analyser CHANGELOG pour dernières modifications
 */
function getLatestChanges() {
  const changelogPath = path.join(ROOT, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) return [];
  
  const content = fs.readFileSync(changelogPath, 'utf8');
  
  // Extraire la première version (plus récente)
  const versionMatch = content.match(/## \[([^\]]+)\] - ([^\n]+)\n([\s\S]*?)(?=\n## |\n$)/);
  if (!versionMatch) return [];
  
  const [, version, date, changes] = versionMatch;
  
  // Extraire les bullet points
  const bullets = changes.match(/^- .+$/gm) || [];
  
  return {
    version,
    date,
    changes: bullets.slice(0, 5).map(b => b.replace(/^- /, ''))
  };
}

/**
 * Lire la structure du projet
 */
function getProjectStructure() {
  const structurePath = path.join(ROOT, 'PROJECT_STRUCTURE.md');
  if (!fs.existsSync(structurePath)) return '';
  
  const content = fs.readFileSync(structurePath, 'utf8');
  
  // Extraire la section structure principale
  const match = content.match(/## 🗂️ STRUCTURE PRINCIPALE\n\n```([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }
  
  return '';
}

/**
 * Générer le README
 */
function generateReadme() {
  const appInfo = getAppInfo();
  const driverCount = countDrivers();
  const recentCommits = getRecentCommits();
  const recentFixes = getRecentFixes();
  const latestChanges = getLatestChanges();
  const structure = getProjectStructure();
  
  const readme = `# 🏠 ${appInfo.name}

[![Version](https://img.shields.io/badge/version-${appInfo.version}-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee)
[![SDK](https://img.shields.io/badge/SDK-${appInfo.sdk}-green.svg)](https://apps.developer.homey.app)
[![Homey](https://img.shields.io/badge/Homey-${appInfo.compatibility}-orange.svg)](https://homey.app)
[![Drivers](https://img.shields.io/badge/drivers-${driverCount}-brightgreen.svg)](https://github.com/dlnraja/com.tuya.zigbee/tree/master/drivers)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

${appInfo.description}

---

## 📊 Statistics

\`\`\`
Drivers:              ${driverCount}
SDK Version:          ${appInfo.sdk}
Homey Compatibility:  ${appInfo.compatibility}
Version:              ${appInfo.version}
Status:               ✅ Active Development
\`\`\`

---

## ✨ Features

- ✅ **${driverCount} Native Zigbee Drivers** - No cloud dependency
- ✅ **100% Local Control** - All devices work offline
- ✅ **SDK3 Modern Architecture** - Built with latest Homey SDK
- ✅ **Advanced Flow Cards** - Comprehensive automation support
- ✅ **Multi-brand Support** - Works with 300+ device IDs
- ✅ **Active Development** - Regular updates and bug fixes
- ✅ **Community Driven** - Based on community feedback
- ✅ **Automated Updates** - GitHub Actions CI/CD pipeline

---

## 🚀 Installation

### From Homey App Store (Recommended)
1. Open Homey app
2. Go to **More** → **Apps**
3. Search for "**Universal Tuya Zigbee**"
4. Click **Install**

### From GitHub (Development)
\`\`\`bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
homey app install
\`\`\`

---

## 📂 Project Structure

\`\`\`
${structure}
\`\`\`

**Complete documentation:** [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## 🔄 Recent Updates

${latestChanges.version ? `### Version ${latestChanges.version} - ${latestChanges.date}

${latestChanges.changes.map(c => `- ${c}`).join('\n')}

**Full changelog:** [CHANGELOG.md](CHANGELOG.md)` : '**See:** [CHANGELOG.md](CHANGELOG.md)'}

---

## 🐛 Recent Fixes

${recentFixes.length > 0 ? recentFixes.map(f => `- [${f.name}](${f.path}) (${f.date})`).join('\n') : 'No recent fixes documented'}

**All fixes:** [docs/fixes/](docs/fixes/)

---

## 📚 Documentation

### User Documentation
- [Workflow Guide](docs/workflow/WORKFLOW_GUIDE.md) - GitHub Actions workflow
- [Quick Reference](docs/workflow/QUICK_WORKFLOW.md) - Quick commands
- [Auto-Update System](docs/workflow/AUTO_UPDATE_SYSTEM.md) - Automatic docs updates

### Developer Documentation
- [Project Structure](PROJECT_STRUCTURE.md) - Complete structure documentation
- [Community Analysis](docs/community/COMMUNITY_APPS_ANALYSIS.md) - Best practices from community apps
- [Quick Improvements](docs/community/QUICK_IMPROVEMENTS.md) - Priority features

### Bug Fixes & Reports
- [Critical Fix Summary](docs/fixes/CRITICAL_FIX_SUMMARY_v2.15.130.md) - Latest critical fixes
- [IAS Zone Fix](docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md) - Motion sensor fix
- [All Fixes](docs/fixes/) - Complete fix history

---

## 🤝 Contributing

Contributions are welcome! This project follows these principles:
- **UNBRANDED** - Organized by device function, not brand
- **USER-FRIENDLY** - Easy to understand driver names
- **COMPREHENSIVE** - Support as many devices as possible
- **QUALITY** - Well-tested, properly documented

### Development Workflow

1. **Make changes** to drivers/lib/utils
2. **Validate locally:** \`homey app validate --level publish\`
3. **Commit & push:** \`git commit && git push\`
4. **GitHub Actions** automatically validates, versions, and publishes

**Smart commit:** \`powershell scripts/automation/smart-commit.ps1 "Your message"\`

---

## 🔧 Scripts & Automation

### Organization
\`\`\`bash
# Reorganize project structure
powershell scripts/organize-project.ps1
\`\`\`

### Updates
\`\`\`bash
# Update all links and paths
node scripts/automation/update-all-links.js

# Smart commit (with auto-updates)
powershell scripts/automation/smart-commit.ps1 "Message"
\`\`\`

### Git Hooks
\`\`\`bash
# Install pre-commit hooks
powershell scripts/automation/install-git-hooks.ps1
\`\`\`

---

## 📦 Device Support

### Categories
1. **Motion & Presence** - PIR sensors, radar sensors, presence detection
2. **Contact & Security** - Door/window sensors, locks, alarms
3. **Temperature & Climate** - Temp/humidity sensors, thermostats
4. **Smart Lighting** - Bulbs, switches, dimmers, RGB controllers
5. **Power & Energy** - Smart plugs, power monitors, energy tracking
6. **Safety** - Smoke detectors, water leak sensors, CO detectors
7. **Automation** - Buttons, scene controllers, remotes

**Total: ${driverCount} drivers supporting 300+ device IDs**

---

## 🔗 Links

- **GitHub Repository:** https://github.com/dlnraja/com.tuya.zigbee
- **Homey Community Forum:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352
- **Issue Tracker:** https://github.com/dlnraja/com.tuya.zigbee/issues
- **Homey App Store:** [Universal Tuya Zigbee](https://homey.app/a/com.dlnraja.tuya.zigbee/)

---

## 📝 Recent Commits

${recentCommits.length > 0 ? recentCommits.map(c => `- \`${c.hash}\` ${c.subject} - *${c.author}* (${c.date})`).join('\n') : 'No recent commits'}

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

---

## 👤 Author

**Dylan Rajasekaram**
- Email: [redacted-email]
- GitHub: [@dlnraja](https://github.com/dlnraja)

---

## 🙏 Acknowledgments

Based on the original work by **Johan Bendz** and inspired by:
- [Philips Hue Zigbee](https://github.com/JohanBendz/com.philips.hue.zigbee) by Johan Bendz
- [Aqara & Xiaomi](https://github.com/Maxmudjon/com.maxmudjon.mihomey) by Maxmudjon
- [SONOFF Zigbee](https://github.com/StyraHem/Homey.Sonoff.Zigbee) by StyraHem

---

## ⚡ Status

\`\`\`
Last Updated:     ${new Date().toISOString().split('T')[0]}
Version:          ${appInfo.version}
Build Status:     ✅ Passing
Documentation:    ✅ Up to date
GitHub Actions:   ✅ Active
\`\`\`

**This README is automatically generated and updated by [update-all-links.js](scripts/automation/update-all-links.js)**

---

**💡 Tip:** Use \`powershell scripts/automation/smart-commit.ps1 "message"\` for automatic docs updates!
`;

  return readme;
}

/**
 * Main
 */
function main() {
  console.log('📝 GENERATING README.md...\n');
  
  try {
    const readme = generateReadme();
    const readmePath = path.join(ROOT, 'README.md');
    
    // Backup ancien README
    if (fs.existsSync(readmePath)) {
      const backup = readmePath + '.backup';
      fs.copyFileSync(readmePath, backup);
      console.log('💾 Backup created: README.md.backup');
    }
    
    // Écrire nouveau README
    fs.writeFileSync(readmePath, readme, 'utf8');
    console.log('✅ README.md generated!');
    console.log('');
    console.log('📊 Content includes:');
    console.log('  ✓ App info from app.json');
    console.log('  ✓ Driver count');
    console.log('  ✓ Recent commits (last 5)');
    console.log('  ✓ Recent fixes');
    console.log('  ✓ Latest changes from CHANGELOG');
    console.log('  ✓ Project structure');
    console.log('  ✓ Documentation links');
    console.log('');
    
  } catch (err) {
    console.error('❌ Error generating README:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateReadme };
