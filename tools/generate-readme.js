#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Template de base pour le README
const README_TEMPLATE = {
  en: {
    title: "Tuya Zigbee Integration for Homey",
    description: "Universal Tuya ZigBee device integration with AI-powered features for Homey SDK3",
    features: [
      "🔌 Universal Tuya ZigBee device support",
      "🤖 AI-powered device detection and optimization",
      "📊 Real-time dashboard and monitoring",
      "🌍 Multi-language support (EN, FR, NL, TA)",
      "⚡ Homey SDK3 compatible",
      "🔄 Automatic synchronization with tuya-light version",
      "📈 Comprehensive Zigbee reference matrix"
    ],
    installation: "Install via Homey App Store or manual installation",
    usage: "Add Tuya Zigbee devices through the Homey app interface",
    contributing: "Contributions welcome! Please read CONTRIBUTING.md",
    license: "MIT License"
  },
  fr: {
    title: "Intégration Tuya Zigbee pour Homey",
    description: "Intégration universelle des appareils Tuya ZigBee avec des fonctionnalités IA pour Homey SDK3",
    features: [
      "🔌 Support universel des appareils Tuya ZigBee",
      "🤖 Détection et optimisation IA des appareils",
      "📊 Tableau de bord et surveillance en temps réel",
      "🌍 Support multilingue (EN, FR, NL, TA)",
      "⚡ Compatible Homey SDK3",
      "🔄 Synchronisation automatique avec la version tuya-light",
      "📈 Matrice de référence Zigbee complète"
    ],
    installation: "Installer via Homey App Store ou installation manuelle",
    usage: "Ajouter des appareils Tuya Zigbee via l'interface Homey",
    contributing: "Contributions bienvenues ! Lisez CONTRIBUTING.md",
    license: "Licence MIT"
  },
  nl: {
    title: "Tuya Zigbee Integratie voor Homey",
    description: "Universele Tuya ZigBee apparaat integratie met AI-aangedreven functies voor Homey SDK3",
    features: [
      "🔌 Universele Tuya ZigBee apparaat ondersteuning",
      "🤖 AI-aangedreven apparaat detectie en optimalisatie",
      "📊 Real-time dashboard en monitoring",
      "🌍 Meertalige ondersteuning (EN, FR, NL, TA)",
      "⚡ Homey SDK3 compatibel",
      "🔄 Automatische synchronisatie met tuya-light versie",
      "📈 Uitgebreide Zigbee referentie matrix"
    ],
    installation: "Installeer via Homey App Store of handmatige installatie",
    usage: "Voeg Tuya Zigbee apparaten toe via de Homey app interface",
    contributing: "Bijdragen welkom! Lees CONTRIBUTING.md",
    license: "MIT Licentie"
  },
  ta: {
    title: "Homey க்கான Tuya Zigbee ஒருங்கிணைப்பு",
    description: "Homey SDK3 க்கான AI-ஆல் இயக்கப்படும் அம்சங்களுடன் உலகளாவிய Tuya ZigBee சாதன ஒருங்கிணைப்பு",
    features: [
      "🔌 உலகளாவிய Tuya ZigBee சாதன ஆதரவு",
      "🤖 AI-ஆல் இயக்கப்படும் சாதன கண்டறிதல் மற்றும் உகந்தமயமாக்கல்",
      "📊 நேரலை டாஷ்போர்டு மற்றும் கண்காணிப்பு",
      "🌍 பல மொழி ஆதரவு (EN, FR, NL, TA)",
      "⚡ Homey SDK3 பொருந்தக்கூடியது",
      "🔄 tuya-light பதிப்புடன் தானியங்கி ஒத்திசைவு",
      "📈 விரிவான Zigbee குறிப்பு அணி"
    ],
    installation: "Homey App Store மூலம் நிறுவவும் அல்லது கைமுறை நிறுவல்",
    usage: "Homey பயன்பாட்டு இடைமுகம் மூலம் Tuya Zigbee சாதனங்களைச் சேர்க்கவும்",
    contributing: "பங்களிப்புகள் வரவேற்கப்படுகின்றன! CONTRIBUTING.md ஐப் படிக்கவும்",
    license: "MIT உரிமம்"
  }
};

function generateMultilingualREADME() {
  let readmeContent = '';
  
  // Generate each language section
  Object.entries(README_TEMPLATE).forEach(([lang, content]) => {
    const langName = {
      en: 'ENGLISH',
      fr: 'FRANÇAIS',
      nl: 'NEDERLANDS',
      ta: 'தமிழ்'
    }[lang];
    
    readmeContent += `# ${langName}\n\n`;
    readmeContent += `## ${content.title}\n\n`;
    readmeContent += `${content.description}\n\n`;
    
    readmeContent += `### ✨ Features\n\n`;
    content.features.forEach(feature => {
      readmeContent += `- ${feature}\n`;
    });
    readmeContent += '\n';
    
    readmeContent += `### 📦 Installation\n\n`;
    readmeContent += `${content.installation}\n\n`;
    
    readmeContent += `### 🚀 Usage\n\n`;
    readmeContent += `${content.usage}\n\n`;
    
    readmeContent += `### 🤝 Contributing\n\n`;
    readmeContent += `${content.contributing}\n\n`;
    
    readmeContent += `### 📄 License\n\n`;
    readmeContent += `${content.license}\n\n`;
    
    readmeContent += `---\n\n`;
  });
  
  // Add project statistics
  readmeContent += `## 📊 Project Statistics\n\n`;
  readmeContent += `- **Total Drivers:** ${getDriverCount()}\n`;
  readmeContent += `- **Zigbee Clusters:** ${getClusterCount()}\n`;
  readmeContent += `- **Device Types:** ${getDeviceTypeCount()}\n`;
  readmeContent += `- **Languages:** 4 (EN, FR, NL, TA)\n`;
  readmeContent += `- **SDK Version:** Homey SDK3\n\n`;
  
  // Add links
  readmeContent += `## 🔗 Links\n\n`;
  readmeContent += `- [Dashboard](https://dlnraja.github.io/com.tuya.zigbee/)\n`;
  readmeContent += `- [Documentation](https://github.com/dlnraja/com.tuya.zigbee/tree/main/docs)\n`;
  readmeContent += `- [Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)\n`;
  readmeContent += `- [Releases](https://github.com/dlnraja/com.tuya.zigbee/releases)\n\n`;
  
  return readmeContent;
}

function getDriverCount() {
  try {
    const driversDir = path.join(__dirname, '..', 'drivers', 'sdk3');
    if (fs.existsSync(driversDir)) {
      return fs.readdirSync(driversDir).filter(item => 
        fs.statSync(path.join(driversDir, item)).isDirectory()
      ).length;
    }
  } catch (error) {
    console.log('Error counting drivers:', error.message);
  }
  return 'N/A';
}

function getClusterCount() {
  try {
    const clustersFile = path.join(__dirname, '..', 'ref', 'zigbee-matrix.json');
    if (fs.existsSync(clustersFile)) {
      const data = JSON.parse(fs.readFileSync(clustersFile, 'utf8'));
      return Object.keys(data.clusters || {}).length;
    }
  } catch (error) {
    console.log('Error counting clusters:', error.message);
  }
  return 'N/A';
}

function getDeviceTypeCount() {
  try {
    const deviceTypesFile = path.join(__dirname, '..', 'ref', 'device-types.json');
    if (fs.existsSync(deviceTypesFile)) {
      const data = JSON.parse(fs.readFileSync(deviceTypesFile, 'utf8'));
      return Object.keys(data.deviceTypes || {}).length;
    }
  } catch (error) {
    console.log('Error counting device types:', error.message);
  }
  return 'N/A';
}

function main() {
  try {
    console.log('🔄 Generating multilingual README...');
    
    const readmeContent = generateMultilingualREADME();
    const readmePath = path.join(__dirname, '..', 'README.md');
    
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`✅ README generated: ${readmePath}`);
    
    // Also generate tuya-light version
    const tuyaLightContent = generateTuyaLightREADME();
    const tuyaLightPath = path.join(__dirname, '..', 'tuya-light-README.md');
    fs.writeFileSync(tuyaLightPath, tuyaLightContent);
    console.log(`✅ Tuya Light README generated: ${tuyaLightPath}`);
    
    console.log('🎉 README generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error generating README:', error);
    process.exit(1);
  }
}

function generateTuyaLightREADME() {
  return `# Tuya Light - Simplified Version

## Overview
Simplified version of Tuya Zigbee integration without AI features.

## Installation
\`\`\`bash
homey app install tuya-light.zip
\`\`\`

## Features
- Basic Tuya Zigbee device support
- Homey SDK3 compatible
- Essential drivers only
- No AI/automation features

## Drivers Included
- TS0201 (Temperature Sensor)
- TS0202 (Humidity Sensor)
- TS0601 (Smart Switch)
- TS011F (Smart Plug)
- TS004F (Wall Switch)

## License
MIT License
`;
}

if (require.main === module) {
  main();
}

module.exports = { generateMultilingualREADME, generateTuyaLightREADME };
console.log('README generator ready');
