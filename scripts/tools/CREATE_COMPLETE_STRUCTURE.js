#!/usr/bin/env node
'use strict';

/**
 * CREATE COMPLETE STRUCTURE
 * 
 * Crée TOUS les dossiers et fichiers supplémentaires
 * pour un projet Homey professionnel complet
 */

const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const STRUCTURE = {
  // Locales pour traductions
  'locales': {
    'en.json': {
      title: 'English translations',
      content: {
        settings: {
          title: 'Settings',
          debug_logging: 'Enable debug logging',
          community_updates: 'Enable community updates'
        }
      }
    },
    'fr.json': {
      title: 'French translations',
      content: {
        settings: {
          title: 'Paramètres',
          debug_logging: 'Activer les logs de débogage',
          community_updates: 'Activer les mises à jour communautaires'
        }
      }
    },
    'nl.json': {
      title: 'Dutch translations',
      content: {
        settings: {
          title: 'Instellingen',
          debug_logging: 'Debug logging inschakelen',
          community_updates: 'Community updates inschakelen'
        }
      }
    },
    'de.json': {
      title: 'German translations',
      content: {
        settings: {
          title: 'Einstellungen',
          debug_logging: 'Debug-Protokollierung aktivieren',
          community_updates: 'Community-Updates aktivieren'
        }
      }
    }
  },
  
  // Custom capabilities
  '.homeycompose/capabilities': {
    'custom_mode.json': {
      title: 'Custom mode capability',
      content: {
        type: 'enum',
        title: { en: 'Mode', fr: 'Mode', nl: 'Modus', de: 'Modus' },
        desc: { en: 'Device mode', fr: 'Mode appareil', nl: 'Apparaat modus', de: 'Gerätemodus' },
        values: [
          { id: 'auto', title: { en: 'Auto', fr: 'Auto', nl: 'Auto', de: 'Auto' } },
          { id: 'manual', title: { en: 'Manual', fr: 'Manuel', nl: 'Handmatig', de: 'Manuell' } }
        ],
        getable: true,
        setable: true,
        uiComponent: 'picker'
      }
    }
  },
  
  // Discovery pour pairing avancé
  '.homeycompose/discovery': {
    'zigbee.json': {
      title: 'Zigbee discovery',
      content: {
        zigbee: {
          type: 'zigbee',
          id: 'zigbee_discovery'
        }
      }
    }
  },
  
  // Tests
  'test': {
    'README.md': {
      title: 'Tests directory',
      content: `# Tests

## Structure
- Unit tests pour drivers
- Integration tests
- Mock devices

## Run tests
\`\`\`bash
npm test
\`\`\`
`
    }
  },
  
  // Lib pour code partagé
  'lib': {
    'ZigbeeHelper.js': {
      title: 'Zigbee helper utilities',
      content: `'use strict';

/**
 * Zigbee Helper Utilities
 * Fonctions utilitaires partagées pour tous les drivers
 */

class ZigbeeHelper {
  
  static parseBatteryPercentage(value) {
    // Convert battery percentage from Zigbee format
    return Math.round(value / 2);
  }
  
  static parseTemperature(value) {
    // Convert temperature from Zigbee format (centidegrees)
    return Math.round(value / 100 * 10) / 10;
  }
  
  static parseHumidity(value) {
    // Convert humidity from Zigbee format
    return Math.round(value / 100 * 10) / 10;
  }
  
  static parsePower(value) {
    // Convert power from Zigbee format
    return value / 10;
  }
  
  static parseVoltage(value) {
    // Convert voltage from Zigbee format
    return value / 10;
  }
  
  static parseCurrent(value) {
    // Convert current from Zigbee format
    return value / 1000;
  }
  
  static parseEnergy(value) {
    // Convert energy from Zigbee format
    return value / 1000;
  }
  
  static parseIlluminance(value) {
    // Convert illuminance from Zigbee format
    return Math.round(Math.pow(10, (value - 1) / 10000));
  }
  
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

module.exports = ZigbeeHelper;
`
    },
    'BatteryHelper.js': {
      title: 'Battery helper utilities',
      content: `'use strict';

/**
 * Battery Helper
 * Calcul intelligent du niveau de batterie
 */

class BatteryHelper {
  
  static calculateBatteryPercentage(voltage, batteryType = 'CR2032') {
    const profiles = {
      'CR2032': { max: 3.0, min: 2.0 },
      'CR2450': { max: 3.0, min: 2.0 },
      'AAA': { max: 1.5, min: 0.9 },
      'AA': { max: 1.5, min: 0.9 }
    };
    
    const profile = profiles[batteryType] || profiles['CR2032'];
    const percentage = ((voltage - profile.min) / (profile.max - profile.min)) * 100;
    
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }
  
  static getBatteryStatus(percentage) {
    if (percentage > 80) return 'good';
    if (percentage > 50) return 'medium';
    if (percentage > 20) return 'low';
    return 'critical';
  }
  
  static shouldSendBatteryAlert(percentage) {
    return percentage < 20;
  }
}

module.exports = BatteryHelper;
`
    }
  },
  
  // App settings page
  'settings': {
    'index.html': {
      title: 'Settings page',
      content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Universal Tuya Zigbee - Settings</title>
    <script type="text/javascript" src="/homey.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            color: #1E88E5;
        }
        .section {
            margin: 30px 0;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 8px;
        }
        .info {
            padding: 15px;
            background: #e3f2fd;
            border-left: 4px solid #1E88E5;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <h1>🎯 Universal Tuya Zigbee</h1>
    
    <div class="section">
        <h2>📊 Statistics</h2>
        <p><strong>Version:</strong> 2.15.31</p>
        <p><strong>Drivers:</strong> 183</p>
        <p><strong>Supported Devices:</strong> 1600+</p>
        <p><strong>Thread/Matter:</strong> 14 products</p>
    </div>
    
    <div class="section">
        <h2>🌟 Features</h2>
        <ul>
            <li>✅ 100% Local Control (no cloud)</li>
            <li>✅ UNBRANDED Architecture</li>
            <li>✅ Thread/Matter Ready</li>
            <li>✅ 2024-2025 Products</li>
            <li>✅ Multilingual Support</li>
        </ul>
    </div>
    
    <div class="info">
        <p><strong>💡 Tip:</strong> Configure individual device settings in device settings page.</p>
    </div>
    
    <script>
        function onHomeyReady(Homey) {
            Homey.ready();
        }
    </script>
</body>
</html>
`
    }
  },
  
  // API pour extensions futures
  'api': {
    'README.md': {
      title: 'API directory',
      content: `# API

Extensions et endpoints personnalisés pour le projet.

## Structure
- REST endpoints
- WebSocket handlers
- Custom integrations
`
    }
  }
};

class StructureCreator {
  
  async run() {
    console.log('🏗️  CREATE COMPLETE STRUCTURE\n');
    console.log('═'.repeat(70) + '\n');
    
    let created = 0;
    
    for (const [dirName, content] of Object.entries(STRUCTURE)) {
      const dirPath = path.join(ROOT, dirName);
      
      console.log(`📁 Creating ${dirName}/...`);
      await fs.ensureDir(dirPath);
      
      if (typeof content === 'object') {
        for (const [fileName, fileData] of Object.entries(content)) {
          const filePath = path.join(dirPath, fileName);
          
          if (!await fs.pathExists(filePath)) {
            const fileContent = typeof fileData.content === 'string' 
              ? fileData.content 
              : JSON.stringify(fileData.content, null, 2);
            
            await fs.writeFile(filePath, fileContent);
            console.log(`   ✓ ${fileName}`);
            created++;
          } else {
            console.log(`   ⚠️  ${fileName} exists, skipping`);
          }
        }
      }
      
      console.log();
    }
    
    console.log('═'.repeat(70));
    console.log(`\n✅ Structure complete: ${created} files created\n`);
  }
}

async function main() {
  const creator = new StructureCreator();
  await creator.run();
}

main().catch(console.error);
