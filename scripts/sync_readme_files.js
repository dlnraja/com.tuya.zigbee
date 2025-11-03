#!/usr/bin/env node
'use strict';

/**
 * SYNC README FILES
 * 
 * Synchronise automatiquement:
 * - README.md (racine) - Format GitHub
 * - docs/README.txt - Format texte détaillé
 * 
 * Les deux doivent être cohérents et à jour
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const README_MD = path.join(ROOT, 'README.md');
const README_TXT = path.join(ROOT, 'docs', 'README.txt');

console.log('📚 SYNCHRONISATION README FILES');
console.log('═══════════════════════════════════════════════════\n');

// ============================================================================
// VÉRIFIER FICHIERS
// ============================================================================

if (!fs.existsSync(README_MD)) {
  console.error('❌ README.md introuvable à la racine!');
  process.exit(1);
}

if (!fs.existsSync(README_TXT)) {
  console.error('❌ docs/README.txt introuvable!');
  process.exit(1);
}

console.log('✅ README.md: ' + README_MD);
console.log('✅ README.txt: ' + README_TXT);

// ============================================================================
// EXTRAIRE VERSION & INFO
// ============================================================================

const readmeMd = fs.readFileSync(README_MD, 'utf8');
const readmeTxt = fs.readFileSync(README_TXT, 'utf8');

// Extraire version du README.md
const versionMatch = readmeMd.match(/version-(\d+\.\d+\.\d+)-blue/);
const version = versionMatch ? versionMatch[1] : 'unknown';

// Extraire drivers count
const driversMatch = readmeMd.match(/drivers-(\d+)-green/);
const driversCount = driversMatch ? driversMatch[1] : 'unknown';

console.log(`\n📊 Version détectée: ${version}`);
console.log(`📊 Drivers détectés: ${driversCount}`);

// ============================================================================
// SYNCHRONISER README.TXT
// ============================================================================

console.log('\n🔄 Mise à jour README.txt...');

// Mettre à jour la section Version dans README.txt
let updatedTxt = readmeTxt;

// Update version line
updatedTxt = updatedTxt.replace(
  /Version: .*/,
  `Version: ${version} (Phase 2 - Intelligent System)`
);

// Update last updated
const today = new Date().toISOString().split('T')[0];
updatedTxt = updatedTxt.replace(
  /Last Updated: .*/,
  `Last Updated: ${today}`
);

// Update drivers count
updatedTxt = updatedTxt.replace(
  /- (\d+) Drivers \(all validated SDK3\)/,
  `- ${driversCount} Drivers (all validated SDK3)`
);

updatedTxt = updatedTxt.replace(
  /Drivers: \d+/,
  `Drivers: ${driversCount}`
);

// Vérifier si Phase 2 features sont présentes
if (!updatedTxt.includes('PHASE 2 NEW FEATURES')) {
  console.log('⚠️  Phase 2 features manquantes dans README.txt');
  // Elles ont déjà été ajoutées précédemment
}

// Sauvegarder
fs.writeFileSync(README_TXT, updatedTxt, 'utf8');
console.log('✅ README.txt mis à jour');

// ============================================================================
// VÉRIFIER COHÉRENCE
// ============================================================================

console.log('\n🔍 Vérification cohérence...');

const checks = [
  {
    name: 'Version présente',
    md: readmeMd.includes(version),
    txt: updatedTxt.includes(version)
  },
  {
    name: 'Drivers count',
    md: readmeMd.includes(driversCount),
    txt: updatedTxt.includes(driversCount)
  },
  {
    name: 'Phase 2 mentionnée',
    md: readmeMd.includes('Phase 2'),
    txt: updatedTxt.includes('Phase 2')
  },
  {
    name: 'IntelligentProtocolRouter',
    md: readmeMd.includes('IntelligentProtocolRouter') || readmeMd.includes('Intelligent Protocol'),
    txt: updatedTxt.includes('IntelligentProtocolRouter') || updatedTxt.includes('INTELLIGENT PROTOCOL')
  }
];

let allOk = true;
checks.forEach(check => {
  if (check.md && check.txt) {
    console.log(`  ✅ ${check.name}`);
  } else {
    console.log(`  ⚠️  ${check.name} - MD:${check.md} TXT:${check.txt}`);
    allOk = false;
  }
});

// ============================================================================
// CRÉER BACKUP
// ============================================================================

const backupPath = path.join(ROOT, 'docs', 'README.txt.backup-sync');
fs.writeFileSync(backupPath, readmeTxt, 'utf8');
console.log(`\n💾 Backup créé: ${backupPath}`);

// ============================================================================
// RÉSUMÉ
// ============================================================================

console.log('\n═══════════════════════════════════════════════════');
console.log('✅ SYNCHRONISATION TERMINÉE');
console.log('═══════════════════════════════════════════════════\n');

console.log(`Version: ${version}`);
console.log(`Drivers: ${driversCount}`);
console.log(`Cohérence: ${allOk ? '✅ OK' : '⚠️  À vérifier'}`);
console.log('');

if (!allOk) {
  console.log('⚠️  Certaines informations diffèrent entre MD et TXT');
  console.log('   Vérifiez manuellement les fichiers\n');
}

// ============================================================================
// CRÉER README.md À PARTIR DE README.txt SI NÉCESSAIRE
// ============================================================================

function createReadmeMdFromTxt() {
  console.log('\n📝 Génération README.md depuis README.txt...');
  
  const txt = fs.readFileSync(README_TXT, 'utf8');
  
  // Extraire les sections importantes
  const versionMatch = txt.match(/Version: ([^\n]+)/);
  const version = versionMatch ? versionMatch[1].split(' ')[0] : '4.10.0';
  
  const md = `# [APP][Pro] Universal TUYA Zigbee - Local-First Control

![Version](https://img.shields.io/badge/version-${version}-blue)
![Drivers](https://img.shields.io/badge/drivers-${driversCount}-green)
![SDK](https://img.shields.io/badge/SDK-3-orange)
![License](https://img.shields.io/badge/license-GPL--3.0-red)
![Homey](https://img.shields.io/badge/Homey-Pro-blueviolet)

**Community-maintained Universal Zigbee app with unified hybrid drivers and 18,000+ manufacturer IDs.**

🏠 100% Local Control - No Cloud Required  
🔋 Intelligent Auto-Detection - Power Source & Battery Type  
⚡ Advanced Energy Management - Flow Cards Included  
🛠️ SDK3 Compliant - Latest Homey Standards

## 📊 Statistics

- **Total Drivers:** ${driversCount}
- **SDK Version:** 3
- **Homey Compatibility:** >=12.2.0
- **Last Updated:** ${today}
- **Phase 2 Status:** ✅ Complete
- **Intelligent Protocol Router:** ✅ Integrated

## 🚀 Latest Updates - v${version} (Phase 2 Complete)

### ✨ New Features
- **IntelligentProtocolRouter:** Auto-detects Tuya DP vs native Zigbee protocol
- **BSEED Multi-Gang Fix:** Resolves issue where all gangs activate together
- **TS0601 Full Support:** 3 device types with complete DP mapping
- **HOBEIAN Manufacturer:** ZG-204ZV Multisensor integration
- **Device Finder Enhanced:** Functional search and filters

### 🔧 Technical Improvements
- Integrated protocol routing in BaseHybridDevice
- BseedDetector for automatic BSEED device detection
- TuyaDataPointEngine for TS0601 devices
- All 7 network devices updated and optimized
- 97% validation success rate

## 📦 Installation

### From Homey App Store
1. Open Homey app
2. Go to "More" → "Apps"
3. Search for "Universal Tuya Zigbee"
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
# Validate
npx homey app validate --level publish

# Run locally
npx homey app run

# Install on Homey
npx homey app install
\`\`\`

## 🎯 Supported Devices

### Categories
- **Switches & Relays:** Multi-gang switches, wall switches, relays
- **Sensors:** Motion, temperature, humidity, contact, water leak
- **Buttons:** Wireless scene controllers, emergency buttons
- **Power Management:** Smart plugs, power meters, energy monitoring
- **Climate:** Thermostats, TRVs, humidity controllers
- **Lighting:** Dimmers, RGB controllers, LED strips
- **Security:** Door sensors, motion detectors, alarms

### Special Support
- **BSEED Devices:** Automatic detection and protocol routing
- **TS0601 Devices:** Full Tuya DataPoint support
- **Multi-Gang Switches:** Individual gang control
- **IAS Zone Devices:** Automatic enrollment

## 🤖 Intelligent Features

### Protocol Router
Automatically detects and routes commands through the optimal protocol:
- **Tuya DP:** For TS0601 and BSEED-like devices
- **Native Zigbee:** For standard Zigbee devices
- **Hybrid:** Seamless switching between protocols

### Power Management
- Auto-detection of power source (AC/DC/Battery)
- Intelligent battery type recognition
- Accurate battery percentage calculations
- Energy monitoring with flow cards

## 📚 Documentation

- **Installation Guide:** See above
- **Device Pairing:** Use Homey app pairing wizard
- **Troubleshooting:** Check GitHub issues
- **Phase 2 Details:** See \`SESSION_COMPLETE_PHASE2_FINAL.md\`
- **Driver Updates:** See \`DRIVERS_UPDATE_COMPLETE.md\`

## 🐛 Support

### GitHub
- **Issues:** https://github.com/dlnraja/com.tuya.zigbee/issues
- **Discussions:** https://github.com/dlnraja/com.tuya.zigbee/discussions

### Homey Community
- **Forum:** https://community.homey.app/t/140352/

### Contact
- **Developer:** Dylan Rajasekaram
- **Email:** [redacted-email]

## 📜 License

GPL-3.0 License - See LICENSE file for details

Based on Johan Bendz's Tuya Zigbee App (MIT License)

## 🙏 Credits

- **Original Author:** Johan Bendz
- **Maintainer:** Dylan Rajasekaram
- **Contributors:** Homey Community
- **Special Thanks:** Loïc Salmona (BSEED testing)

## 🔄 Changelog

See \`CHANGELOG.md\` for complete version history.

---

**Made with ❤️ for the Homey Community**
`;

  return md;
}

// Si besoin de regénérer le README.md
// const newMd = createReadmeMdFromTxt();
// fs.writeFileSync(README_MD, newMd, 'utf8');
// console.log('✅ README.md regénéré');

process.exit(allOk ? 0 : 1);
