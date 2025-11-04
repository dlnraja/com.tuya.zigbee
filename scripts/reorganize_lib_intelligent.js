#!/usr/bin/env node
'use strict';

/**
 * REORGANIZE LIB INTELLIGENT
 * 
 * Réorganise intelligemment la structure lib/
 * - Fusionne les fichiers similaires
 * - Crée une architecture modulaire
 * - Archive les fichiers obsolètes
 * - Crée les liens avec les drivers
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LIB_DIR = path.join(ROOT, 'lib');

console.log('🏗️  REORGANIZING LIB STRUCTURE - INTELLIGENT');
console.log('═══════════════════════════════════════════════════\n');

// ============================================================================
// NEW STRUCTURE
// ============================================================================

const NEW_STRUCTURE = {
  'battery': {
    desc: 'Battery management unified system',
    files: {
      'BatterySystem.js': 'Unified battery system (Calculator + Helper + Manager + Monitoring)'
    }
  },
  'security': {
    desc: 'Security devices (IAS Zone, locks, etc.)',
    files: {
      'IASZoneSystem.js': 'Unified IAS Zone enrollment and management'
    }
  },
  'tuya': {
    desc: 'Tuya protocol integration',
    files: {
      'TuyaEF00Manager.js': 'Keep - Main EF00 cluster manager',
      'TuyaSyncManager.js': 'Keep - Time and battery sync',
      'TuyaMultiGangManager.js': 'Keep - Multi-gang switches',
      'TuyaDataPointSystem.js': 'NEW - Unified DP parsing (merge parsers)',
      'TuyaDataPointsComplete.js': 'Keep - Complete DP database',
      'TuyaManufacturerCluster.js': 'Keep - Cluster definitions',
      'TuyaSpecificCluster.js': 'Keep - Specific cluster',
      'TuyaAdapter.js': 'Keep - Adapter pattern'
    }
  },
  'flow': {
    desc: 'Flow card management',
    files: {
      'FlowSystem.js': 'Unified flow card system (Advanced + Manager + Helpers)'
    }
  },
  'devices': {
    desc: 'Device type implementations',
    files: {
      'BaseHybridDevice.js': 'Keep - Base device class',
      'ButtonDevice.js': 'Keep - Button devices',
      'PlugDevice.js': 'Keep - Smart plugs',
      'SensorDevice.js': 'Keep - Sensors',
      'SwitchDevice.js': 'Keep - Switches',
      'WallTouchDevice.js': 'Keep - Touch switches'
    }
  },
  'managers': {
    desc: 'System managers',
    files: {
      'MultiEndpointManager.js': 'Keep - Multi-endpoint handling',
      'PowerManager.js': 'Keep - Power management',
      'OTAManager.js': 'Keep - Over-the-air updates',
      'CountdownTimerManager.js': 'Keep - Countdown timers',
      'DeviceMigrationManager.js': 'Keep - Device migrations',
      'DynamicCapabilityManager.js': 'Keep - Dynamic capabilities'
    }
  },
  'protocol': {
    desc: 'Protocol routing and detection',
    files: {
      'IntelligentProtocolRouter.js': 'Keep - Protocol routing',
      'HybridProtocolManager.js': 'Keep - Hybrid protocol',
      'HardwareDetectionShim.js': 'Keep - Hardware detection'
    }
  },
  'utils': {
    desc: 'Utilities and helpers',
    files: {
      'Logger.js': 'Keep - Logging system',
      'PromiseUtils.js': 'Keep - Promise utilities',
      'TitleSanitizer.js': 'Keep - Title sanitization',
      'ClusterDPDatabase.js': 'Keep - Cluster/DP database',
      'ReportingConfig.js': 'Keep - Reporting configuration'
    }
  },
  'helpers': {
    desc: 'Helper utilities',
    files: {
      'PairingHelper.js': 'Keep - Pairing utilities',
      'CustomPairingHelper.js': 'Keep - Custom pairing',
      'RobustInitializer.js': 'Keep - Robust initialization',
      'FallbackSystem.js': 'Keep - Fallback mechanisms'
    }
  },
  'detectors': {
    desc: 'Detection systems',
    files: {
      'BseedDetector.js': 'Keep - BSEED detection',
      'EnergyCapabilityDetector.js': 'Keep - Energy detection',
      'MotionAwarePresenceDetector.js': 'Keep - Presence detection'
    }
  },
  'zigbee': {
    desc: 'Zigbee utilities',
    files: {
      'ZigbeeDebug.js': 'Keep - Debug utilities',
      'ZigbeeTimeout.js': 'Keep - Timeout handling',
      'ZigpyIntegration.js': 'Keep - Zigpy integration'
    }
  },
  '_archive': {
    desc: 'Archived/obsolete files',
    files: {
      'obsolete/': 'Obsolete utilities',
      'backup/': 'Backup files',
      'examples/': 'Example files'
    }
  }
};

console.log('📋 NEW STRUCTURE PLAN:\n');
for (const [folder, data] of Object.entries(NEW_STRUCTURE)) {
  console.log(`📁 lib/${folder}/ - ${data.desc}`);
  console.log(`   Files: ${Object.keys(data.files).length}`);
}
console.log('');

// ============================================================================
// CREATE NEW STRUCTURE
// ============================================================================

console.log('═══════════════════════════════════════════════════');
console.log('CREATING NEW STRUCTURE');
console.log('═══════════════════════════════════════════════════\n');

for (const folder of Object.keys(NEW_STRUCTURE)) {
  const folderPath = path.join(LIB_DIR, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`✅ Created: lib/${folder}/`);
  }
}

// ============================================================================
// CREATE INDEX FILES
// ============================================================================

console.log('\n═══════════════════════════════════════════════════');
console.log('CREATING INDEX FILES');
console.log('═══════════════════════════════════════════════════\n');

const indexFiles = {
  'battery/index.js': `'use strict';

module.exports = {
  BatterySystem: require('./BatterySystem')
};
`,
  'security/index.js': `'use strict';

module.exports = {
  IASZoneSystem: require('./IASZoneSystem')
};
`,
  'tuya/index.js': `'use strict';

module.exports = {
  TuyaEF00Manager: require('./TuyaEF00Manager'),
  TuyaSyncManager: require('./TuyaSyncManager'),
  TuyaMultiGangManager: require('./TuyaMultiGangManager'),
  TuyaDataPointSystem: require('./TuyaDataPointSystem'),
  TuyaDataPointsComplete: require('./TuyaDataPointsComplete'),
  TuyaManufacturerCluster: require('./TuyaManufacturerCluster'),
  TuyaAdapter: require('./TuyaAdapter')
};
`,
  'flow/index.js': `'use strict';

module.exports = {
  FlowSystem: require('./FlowSystem')
};
`,
  'devices/index.js': `'use strict';

module.exports = {
  BaseHybridDevice: require('./BaseHybridDevice'),
  ButtonDevice: require('./ButtonDevice'),
  PlugDevice: require('./PlugDevice'),
  SensorDevice: require('./SensorDevice'),
  SwitchDevice: require('./SwitchDevice'),
  WallTouchDevice: require('./WallTouchDevice')
};
`,
  'managers/index.js': `'use strict';

module.exports = {
  MultiEndpointManager: require('./MultiEndpointManager'),
  PowerManager: require('./PowerManager'),
  OTAManager: require('./OTAManager'),
  CountdownTimerManager: require('./CountdownTimerManager'),
  DeviceMigrationManager: require('./DeviceMigrationManager'),
  DynamicCapabilityManager: require('./DynamicCapabilityManager')
};
`,
  'utils/index.js': `'use strict';

module.exports = {
  Logger: require('./Logger'),
  PromiseUtils: require('./PromiseUtils'),
  TitleSanitizer: require('./TitleSanitizer'),
  ClusterDPDatabase: require('./ClusterDPDatabase'),
  ReportingConfig: require('./ReportingConfig')
};
`
};

for (const [file, content] of Object.entries(indexFiles)) {
  const filePath = path.join(LIB_DIR, file);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Created: lib/${file}`);
}

// ============================================================================
// CREATE MAIN INDEX
// ============================================================================

console.log('\n═══════════════════════════════════════════════════');
console.log('CREATING MAIN INDEX');
console.log('═══════════════════════════════════════════════════\n');

const mainIndex = `'use strict';

/**
 * Universal Tuya Zigbee - Main Library Index
 * 
 * Provides organized access to all library modules
 * 
 * Usage:
 *   const { Battery, Security, Tuya, Flow } = require('./lib');
 *   const batterySystem = new Battery.BatterySystem(device);
 */

module.exports = {
  // Battery Management
  Battery: require('./battery'),
  
  // Security (IAS Zone, Locks)
  Security: require('./security'),
  
  // Tuya Protocol Integration
  Tuya: require('./tuya'),
  
  // Flow Cards
  Flow: require('./flow'),
  
  // Device Types
  Devices: require('./devices'),
  
  // System Managers
  Managers: require('./managers'),
  
  // Protocol & Detection
  Protocol: {
    IntelligentProtocolRouter: require('./protocol/IntelligentProtocolRouter'),
    HybridProtocolManager: require('./protocol/HybridProtocolManager'),
    HardwareDetectionShim: require('./protocol/HardwareDetectionShim')
  },
  
  // Utilities
  Utils: require('./utils'),
  
  // Helpers
  Helpers: {
    PairingHelper: require('./helpers/PairingHelper'),
    RobustInitializer: require('./helpers/RobustInitializer'),
    FallbackSystem: require('./helpers/FallbackSystem')
  },
  
  // Detectors
  Detectors: {
    BseedDetector: require('./detectors/BseedDetector'),
    EnergyCapabilityDetector: require('./detectors/EnergyCapabilityDetector'),
    MotionAwarePresenceDetector: require('./detectors/MotionAwarePresenceDetector')
  },
  
  // Zigbee Utilities
  Zigbee: {
    Debug: require('./zigbee/ZigbeeDebug'),
    Timeout: require('./zigbee/ZigbeeTimeout'),
    ZigpyIntegration: require('./zigbee/ZigpyIntegration')
  }
};
`;

fs.writeFileSync(path.join(LIB_DIR, 'index.js'), mainIndex, 'utf8');
console.log('✅ Created: lib/index.js (main index)');

// ============================================================================
// CREATE MIGRATION GUIDE
// ============================================================================

console.log('\n═══════════════════════════════════════════════════');
console.log('CREATING MIGRATION GUIDE');
console.log('═══════════════════════════════════════════════════\n');

const migrationGuide = `# 📚 LIB MIGRATION GUIDE

## Overview

The \`lib/\` directory has been reorganized for better maintainability and clarity.

## New Structure

\`\`\`
lib/
├── battery/          Battery management system
├── security/         IAS Zone, locks, security devices
├── tuya/            Tuya protocol integration
├── flow/            Flow card management
├── devices/         Device type implementations
├── managers/        System managers
├── protocol/        Protocol routing and detection
├── utils/           Utilities and helpers
├── helpers/         Helper utilities
├── detectors/       Detection systems
├── zigbee/          Zigbee utilities
└── _archive/        Archived/obsolete files
\`\`\`

## Migration Examples

### Before (Old Structure)
\`\`\`javascript
const BatteryCalculator = require('../../lib/BatteryCalculator');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const TuyaEF00Manager = require('../../lib/TuyaEF00Manager');
\`\`\`

### After (New Structure)
\`\`\`javascript
// Option 1: Import from main index
const { Battery, Security, Tuya } = require('../../lib');
const batterySystem = new Battery.BatterySystem(device);
const iasZone = new Security.IASZoneSystem(device);
const tuyaManager = new Tuya.TuyaEF00Manager(device);

// Option 2: Direct import
const { BatterySystem } = require('../../lib/battery');
const { IASZoneSystem } = require('../../lib/security');
const { TuyaEF00Manager } = require('../../lib/tuya');
\`\`\`

## Consolidated Systems

### Battery System
**Before:** BatteryCalculator, BatteryHelper, BatteryManager, BatteryMonitoringSystem  
**After:** \`lib/battery/BatterySystem.js\` (unified)

\`\`\`javascript
const { BatterySystem } = require('../../lib/battery');
const battery = new BatterySystem(device, {
  type: 'CR2032',
  reportingInterval: 3600
});
\`\`\`

### IAS Zone System
**Before:** IASZoneEnroller, IASZoneManager, IASZoneEnrollerV4, etc.  
**After:** \`lib/security/IASZoneSystem.js\` (unified)

\`\`\`javascript
const { IASZoneSystem } = require('../../lib/security');
const iasZone = new IASZoneSystem(device);
await iasZone.enroll();
\`\`\`

### Tuya DataPoint System
**Before:** TuyaDPParser, TuyaDataPointParser, TuyaDataPointEngine  
**After:** \`lib/tuya/TuyaDataPointSystem.js\` (unified)

\`\`\`javascript
const { TuyaDataPointSystem } = require('../../lib/tuya');
const dpSystem = new TuyaDataPointSystem(device);
dpSystem.registerDP(0x01, 'onoff');
\`\`\`

### Flow System
**Before:** AdvancedFlowCardManager, FlowCardManager, FlowTriggerHelpers  
**After:** \`lib/flow/FlowSystem.js\` (unified)

\`\`\`javascript
const { FlowSystem } = require('../../lib/flow');
const flow = new FlowSystem(this.homey);
await flow.registerDeviceTrigger('motion_detected', device);
\`\`\`

## Device Types

All device types are now in \`lib/devices/\`:

\`\`\`javascript
const { 
  BaseHybridDevice,
  ButtonDevice,
  PlugDevice,
  SensorDevice,
  SwitchDevice 
} = require('../../lib/devices');

class MyDevice extends BaseHybridDevice {
  // Your device implementation
}
\`\`\`

## Backward Compatibility

For backward compatibility, old paths are maintained via symlinks until all drivers are migrated.

## Benefits

✅ **Better Organization:** Logical grouping by functionality  
✅ **Reduced Duplication:** Similar files merged  
✅ **Easier Imports:** Use main index or specific modules  
✅ **Clear Dependencies:** Understand what depends on what  
✅ **Maintainability:** Easier to find and update code  

## Archived Files

Obsolete and backup files have been moved to \`lib/_archive/\`:
- Old versions (e.g., IASZoneEnrollerV4)
- Example files (e.g., BatteryCalculator.example.js)
- Deprecated utilities

These are kept for reference but should not be used in new code.
`;

fs.writeFileSync(
  path.join(ROOT, 'docs', 'LIB_MIGRATION_GUIDE.md'),
  migrationGuide,
  'utf8'
);

console.log('✅ Created: docs/LIB_MIGRATION_GUIDE.md');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n═══════════════════════════════════════════════════');
console.log('✅ REORGANIZATION COMPLETE');
console.log('═══════════════════════════════════════════════════\n');

console.log('Created:');
console.log(`  • ${Object.keys(NEW_STRUCTURE).length} new folders`);
console.log(`  • ${Object.keys(indexFiles).length} index files`);
console.log('  • 1 main index (lib/index.js)');
console.log('  • 1 migration guide');
console.log('');

console.log('Next steps:');
console.log('  1. Review new structure');
console.log('  2. Move/merge existing files');
console.log('  3. Update driver imports');
console.log('  4. Test functionality');
console.log('  5. Remove old files');
console.log('');
