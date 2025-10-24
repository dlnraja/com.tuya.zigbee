#!/usr/bin/env node
'use strict';

/**
 * README PROACTIVE UPDATE SYSTEM
 * Auto-updates README.md with current project stats, driver categories, and badges
 * Runs intelligently before every push
 */

const fs = require('fs');
const path = require('path');

// Paths
const ROOT = path.join(__dirname, '..', '..');
const APP_JSON = path.join(ROOT, 'app.json');
const README = path.join(ROOT, 'README.md');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m'
};

/**
 * Read app.json to get current version
 */
function getCurrentVersion() {
  const appData = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  return appData.version;
}

/**
 * Count drivers by category
 */
function categorizeDrivers() {
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(f => 
    fs.statSync(path.join(DRIVERS_DIR, f)).isDirectory()
  );

  const categories = {
    '🚨 Motion & Presence Detection': [],
    '🚪 Contact & Security': [],
    '🌡️ Temperature & Climate': [],
    '💡 Smart Lighting': [],
    '🔌 Power & Energy': [],
    '⚠️ Safety & Detection': [],
    '🎛️ Automation Control': [],
    '🔧 Other Devices': []
  };

  // Categorize drivers
  drivers.forEach(driver => {
    if (driver.includes('motion') || driver.includes('presence') || driver.includes('radar') || driver.includes('pir')) {
      categories['🚨 Motion & Presence Detection'].push(driver);
    } else if (driver.includes('door') || driver.includes('window') || driver.includes('contact') || driver.includes('lock')) {
      categories['🚪 Contact & Security'].push(driver);
    } else if (driver.includes('temp') || driver.includes('humid') || driver.includes('thermostat') || driver.includes('climate') || driver.includes('hvac')) {
      categories['🌡️ Temperature & Climate'].push(driver);
    } else if (driver.includes('bulb') || driver.includes('light') || driver.includes('led') || driver.includes('strip') || driver.includes('dimmer') || driver.includes('rgbcct')) {
      categories['💡 Smart Lighting'].push(driver);
    } else if (driver.includes('plug') || driver.includes('outlet') || driver.includes('socket') || driver.includes('power') || driver.includes('energy') || driver.includes('meter')) {
      categories['🔌 Power & Energy'].push(driver);
    } else if (driver.includes('smoke') || driver.includes('gas') || driver.includes('leak') || driver.includes('water') || driver.includes('co_') || driver.includes('alarm')) {
      categories['⚠️ Safety & Detection'].push(driver);
    } else if (driver.includes('button') || driver.includes('switch') && driver.includes('battery') || driver.includes('scene') || driver.includes('remote') || driver.includes('knob')) {
      categories['🎛️ Automation Control'].push(driver);
    } else {
      categories['🔧 Other Devices'].push(driver);
    }
  });

  return { categories, total: drivers.length };
}

/**
 * Generate concise README content
 */
function generateReadme() {
  const version = getCurrentVersion();
  const { categories, total } = categorizeDrivers();

  let readme = `# 🏠 Universal Tuya Zigbee

[![Version](https://img.shields.io/badge/version-${version}-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee)
[![SDK](https://img.shields.io/badge/SDK-3-green.svg)](https://apps.developer.homey.app)
[![Homey](https://img.shields.io/badge/Homey->=12.2.0-orange.svg)](https://homey.app)
[![Drivers](https://img.shields.io/badge/drivers-${total}-brightgreen.svg)](https://github.com/dlnraja/com.tuya.zigbee/tree/master/drivers)
[![Build & Validate](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/ci-complete.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/ci-complete.yml)
[![Matrix Export](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/matrix-export.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/matrix-export.yml)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

**Community-maintained Tuya Zigbee app** with ${total} SDK3 native drivers. 100% local control, no cloud required. Active development with comprehensive device support.

---

## ✨ Key Features

- ✅ **${total} Native Zigbee Drivers** - Comprehensive device coverage
- ✅ **100% Local Control** - No cloud dependency, works offline
- ✅ **SDK3 Architecture** - Modern Homey SDK implementation
- ✅ **Multi-brand Support** - Compatible with 550+ device IDs
- ✅ **Active Development** - Regular updates and community support
- ✅ **CI/CD Pipeline** - Automated validation and publishing

---

## 🚀 Installation

### From Homey CLI (Recommended)
\`\`\`bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
homey app install
\`\`\`

### From Homey App Store
> ⚠️ **Note:** App Store listing pending review. Use CLI method above for immediate access.

1. Open Homey app → **More** → **Apps**
2. Search for "**Universal Tuya Zigbee**"
3. Click **Install**

---

## 📊 Supported Devices (${total} Drivers)

`;

  // Add driver categories
  for (const [category, drivers] of Object.entries(categories)) {
    if (drivers.length > 0) {
      readme += `### ${category} (${drivers.length})\n\n`;
      readme += `<details>\n<summary>View all ${drivers.length} drivers</summary>\n\n`;
      drivers.sort().forEach(driver => {
        // Format driver name (remove underscores, capitalize)
        const formatted = driver.split('_').map(w => 
          w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' ');
        readme += `- ${formatted}\n`;
      });
      readme += `\n</details>\n\n`;
    }
  }

  readme += `---

## 🔄 Recent Updates

**Version ${version}** - Latest changes in [CHANGELOG.md](CHANGELOG.md)

### v3.0.37 - IAS Zone Enrollment Fix
- ✅ Fixed crash: "Zigbee is aan het opstarten" (6 crashes eliminated)
- ✅ Listener-only approach per Homey SDK best practices
- ✅ All IAS Zone devices (motion/contact/buttons) now stable

### v3.0.17 - TS0601 Device Support
- ✅ Tuya TS0601 devices now working (gas sensors, leak detectors)
- ✅ Fixed \`Error: Cannot find module '../../utils/tuya-cluster-handler'\`
- ✅ Universal handler for Tuya proprietary cluster (EF00)

**Full changelog:** [CHANGELOG.md](CHANGELOG.md)

---

## 🔍 Transparence (CI)

> **Public Artifacts** - Every commit generates verifiable evidence

### Validation Logs
- **Latest:** [CI Complete – Validation & Matrix Generation](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/ci-complete.yml)
- **Command:** \`homey app validate --level publish\`
- **Status:** ✅ Zero errors, warnings only

### Device Matrix
- **Export:** [Matrix Export workflow artifacts](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/matrix-export.yml)
- **Formats:** JSON (\`devices.json\`) + CSV (\`devices.csv\`)
- **Content:** ${total} drivers × 6834+ device IDs with clusters

**💡 Download:** Click on a run → "Artifacts" section → \`validation-report\` or \`device-matrix\`

---

## 📚 Documentation

### For Users
- [Installation Guide](docs/guides/INSTALLATION.md) - Step-by-step setup
- [Device Support](docs/guides/DEVICE_SUPPORT.md) - Compatibility list
- [Troubleshooting](docs/guides/TROUBLESHOOTING.md) - Common issues

### For Developers
- [Tuya Engine (Declarative)](docs/guides/TUYA_ENGINE_DEV.md) - Add devices via JSON
- [Device Matrix](docs/guides/DEVICE_MATRIX.md) - Regenerate matrix (JSON/CSV)
- [Project Structure](PROJECT_STRUCTURE.md) - Complete documentation
- [Contributing](CONTRIBUTING.md) - PR checklist and guidelines

### Bug Fixes & Reports
- [Critical Fixes](docs/fixes/) - Latest bug fixes
- [IAS Zone Fix](docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md) - Sensor enrollment fix

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- PR checklist (lint, validate, matrix, issue)
- Code standards (UNBRANDED by function)
- Device request template

**Report issues:** [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

Built with contributions from:
- Homey Community Forum
- Zigbee2MQTT Database
- Johan Bendz (inspiration)
- Home Assistant / Blakadder

**Support:** [Homey Community Forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test)

---

<p align="center">
  <strong>Made with ❤️ for the Homey Community</strong><br>
  <em>v${version} | ${total} Drivers | 100% Local | No Cloud Required</em>
</p>
`;

  return readme;
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.blue}📝 README Proactive Update System${colors.reset}\n`);

  try {
    // Generate new README
    console.log(`${colors.yellow}⏳ Generating README...${colors.reset}`);
    const newReadme = generateReadme();

    // Write README
    fs.writeFileSync(README, newReadme, 'utf8');
    console.log(`${colors.green}✅ README.md updated successfully!${colors.reset}\n`);

    // Show stats
    const { categories, total } = categorizeDrivers();
    const version = getCurrentVersion();
    
    console.log(`${colors.blue}📊 Stats:${colors.reset}`);
    console.log(`   Version: ${version}`);
    console.log(`   Total Drivers: ${total}`);
    console.log(`   Categories: ${Object.keys(categories).length}\n`);

    Object.entries(categories).forEach(([cat, drivers]) => {
      if (drivers.length > 0) {
        console.log(`   ${cat}: ${drivers.length}`);
      }
    });

    console.log(`\n${colors.green}✅ README is now up-to-date with current project state!${colors.reset}`);

  } catch (error) {
    console.error(`${colors.reset}❌ Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateReadme, categorizeDrivers, getCurrentVersion };
