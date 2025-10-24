#!/usr/bin/env node
/**
 * 🔧 FIX ALL CLUSTERS - NUMERIC IDs
 * 
 * Corrige TOUS les drivers pour utiliser des IDs numériques
 * dans registerCapability() au lieu de strings
 * 
 * Inclut CUSTOM CLUSTERS (Tuya 0xEF00, Xiaomi 0xFCC0, etc.)
 */

const fs = require('fs');
const path = require('path');

// Mapping COMPLET cluster name → numeric ID
const CLUSTER_MAP = {
  // Standard Zigbee Clusters
  'genBasic': 0,
  'basic': 0,
  'genPowerCfg': 1,
  'powerConfiguration': 1,
  'genDeviceTempCfg': 2,
  'genIdentify': 3,
  'identify': 3,
  'genGroups': 4,
  'genScenes': 5,
  'genOnOff': 6,
  'onOff': 6,
  'genOnOffSwitchCfg': 7,
  'genLevelCtrl': 8,
  'levelControl': 8,
  'genAlarms': 9,
  'genTime': 10,
  'genRssiLocation': 11,
  'genAnalogInput': 12,
  'genAnalogOutput': 13,
  'genAnalogValue': 14,
  'genBinaryInput': 15,
  'genBinaryOutput': 16,
  'genBinaryValue': 17,
  'genMultistateInput': 18,
  'genMultistateOutput': 19,
  'genMultistateValue': 20,
  'genCommissioning': 21,
  'genOta': 25,
  'genPollCtrl': 32,
  'greenPower': 33,
  'mobileDeviceCfg': 34,
  'neighborCleaning': 35,
  'nearestGateway': 36,
  
  // Closures
  'closuresShadeConfig': 256,
  'closuresDoorLock': 257,
  'closuresWindowCovering': 258,
  'windowCovering': 258,
  
  // HVAC
  'hvacPumpCfgCtrl': 512,
  'hvacThermostat': 513,
  'thermostat': 513,
  'hvacFanCtrl': 514,
  'hvacDehumidificationCtrl': 515,
  'hvacUserInterfaceCfg': 516,
  
  // Lighting
  'lightingColorCtrl': 768,
  'colorControl': 768,
  'lightingBallastCfg': 769,
  
  // Measurement & Sensing
  'msIlluminanceMeasurement': 1024,
  'illuminanceMeasurement': 1024,
  'msIlluminanceLevelSensing': 1025,
  'msTemperatureMeasurement': 1026,
  'temperatureMeasurement': 1026,
  'msPressureMeasurement': 1027,
  'pressureMeasurement': 1027,
  'msFlowMeasurement': 1028,
  'msRelativeHumidity': 1029,
  'relativeHumidity': 1029,
  'msOccupancySensing': 1030,
  'occupancySensing': 1030,
  
  // Security & Safety
  'ssIasZone': 1280,
  'iasZone': 1280,
  'ssIasAce': 1281,
  'ssIasWd': 1282,
  
  // Protocol Interfaces
  'piGenericTunnel': 1536,
  'piBacnetProtocolTunnel': 1537,
  'piAnalogInputReg': 1538,
  'piAnalogInputExt': 1539,
  'piAnalogOutputReg': 1540,
  'piAnalogOutputExt': 1541,
  'piAnalogValueReg': 1542,
  'piAnalogValueExt': 1543,
  'piBinaryInputReg': 1544,
  'piBinaryInputExt': 1545,
  'piBinaryOutputReg': 1546,
  'piBinaryOutputExt': 1547,
  'piBinaryValueReg': 1548,
  'piBinaryValueExt': 1549,
  'piMultistateInputReg': 1550,
  'piMultistateInputExt': 1551,
  'piMultistateOutputReg': 1552,
  'piMultistateOutputExt': 1553,
  'piMultistateValueReg': 1554,
  'piMultistateValueExt': 1555,
  'pi11073ProtocolTunnel': 1556,
  'piIso7818ProtocolTunnel': 1557,
  'piRetailTunnel': 1559,
  
  // Smart Energy
  'sePrice': 1792,
  'seDrlc': 1793,
  'seMetering': 1794,
  'metering': 1794,
  'seMessaging': 1795,
  'seTunneling': 1796,
  'sePrepayment': 1797,
  'seEnergyMgmt': 1798,
  'seCalendar': 1799,
  'seDeviceMgmt': 1800,
  'seEvents': 1801,
  'seMduPairing': 1802,
  
  // Home Automation
  'haElectricalMeasurement': 2820,
  'electricalMeasurement': 2820,
  'haDiagnostic': 2821,
  
  // Lighting & Occupancy
  'liOccupancy': 3072,
  
  // CUSTOM/PROPRIETARY CLUSTERS
  'manuSpecificTuya': 0xEF00,  // Tuya custom cluster
  'tuyaSpecific': 0xEF00,
  'tuya': 0xEF00,
  '0xef00': 0xEF00,
  'manuSpecificXiaomi': 0xFCC0,  // Xiaomi custom cluster
  'xiaomiSpecial': 0xFCC0,
  'xiaomi': 0xFCC0,
  '0xfcc0': 0xFCC0,
  'manuSpecificPhilips': 0xFC00,  // Philips custom
  'manuSpecificIkea': 0xFC7C,  // IKEA custom
  'manuSpecificLegrand': 0xFC01,  // Legrand custom
  'manuSpecificSchneider': 0xFC21  // Schneider custom
};

class ClusterNumericFixer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.stats = { 
      scanned: 0, 
      fixed: 0, 
      replacements: 0,
      errors: 0,
      drivers: []
    };
  }

  log(msg, color = 'reset') {
    const COLORS = { reset: '\x1b[0m', green: '\x1b[32m', cyan: '\x1b[36m', magenta: '\x1b[35m', red: '\x1b[31m', yellow: '\x1b[33m' };
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  fixDeviceFile(driverPath) {
    const devicePath = path.join(driverPath, 'device.js');
    
    if (!fs.existsSync(devicePath)) {
      return 0;
    }
    
    this.stats.scanned++;
    
    try {
      let content = fs.readFileSync(devicePath, 'utf8');
      const originalContent = content;
      let replacements = 0;
      
      // Pattern 1: registerCapability('xxx', 'clusterName', {...})
      for (const [clusterName, clusterId] of Object.entries(CLUSTER_MAP)) {
        const pattern1 = new RegExp(`registerCapability\\(([^,]+),\\s*['"\`]${clusterName}['"\`],`, 'g');
        const matches1 = content.match(pattern1);
        if (matches1) {
          content = String(content).replace(pattern1, `registerCapability($1, ${clusterId},`);
          replacements += matches1.length;
        }
        
        // Pattern 2: this.registerCapability('xxx', 'clusterName', {...})
        const pattern2 = new RegExp(`this\\.registerCapability\\(([^,]+),\\s*['"\`]${clusterName}['"\`],`, 'g');
        const matches2 = content.match(pattern2);
        if (matches2) {
          content = String(content).replace(pattern2, `this.registerCapability($1, ${clusterId},`);
          replacements += matches2.length;
        }
      }
      
      // Pattern 3: CLUSTER.propertyName → numeric
      const clusterConstPattern = /CLUSTER\.(\w+)/g;
      let match;
      while ((match = clusterConstPattern.exec(originalContent)) !== null) {
        const propName = match[1];
        // Chercher une correspondance dans notre map
        const lowerProp = propName.toLowerCase();
        for (const [clusterName, clusterId] of Object.entries(CLUSTER_MAP)) {
          if (clusterName.toLowerCase().includes(lowerProp) || lowerProp.includes(clusterName.toLowerCase())) {
            content = String(content).replace(`CLUSTER.${propName}`, `${clusterId}`);
            replacements++;
            break;
          }
        }
      }
      
      if (replacements > 0) {
        fs.writeFileSync(devicePath, content);
        this.stats.fixed++;
        this.stats.replacements += replacements;
        this.stats.drivers.push({
          driver: path.basename(driverPath),
          replacements
        });
        return replacements;
      }
      
    } catch (err) {
      this.stats.errors++;
      this.log(`  ❌ Error in ${path.basename(driverPath)}: ${err.message}`, 'red');
    }
    
    return 0;
  }

  async run() {
    this.log('\n╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🔧 FIX ALL CLUSTERS - NUMERIC IDs                              ║', 'magenta');
    this.log('║     Inclut CUSTOM CLUSTERS (Tuya, Xiaomi, Philips, etc.)           ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝\n', 'magenta');
    
    this.log(`📊 ${Object.keys(CLUSTER_MAP).length} clusters mappings (standard + custom)\n`, 'cyan');
    
    const drivers = fs.readdirSync(this.driversDir);
    
    this.log('🔍 Scanning all drivers...\n', 'yellow');
    
    for (const driver of drivers) {
      const driverPath = path.join(this.driversDir, driver);
      const stat = fs.statSync(driverPath);
      
      if (stat.isDirectory()) {
        const replacements = this.fixDeviceFile(driverPath);
        if (replacements > 0) {
          this.log(`  ✅ ${driver}: ${replacements} replacements`, 'green');
        }
      }
    }
    
    this.log('\n═══════════════════════════════════════════════════════════════════════', 'magenta');
    this.log(`  📁 Drivers scanned: ${this.stats.scanned}`, 'cyan');
    this.log(`  ✅ Drivers fixed: ${this.stats.fixed}`, 'green');
    this.log(`  🔄 Total replacements: ${this.stats.replacements}`, 'green');
    this.log(`  ❌ Errors: ${this.stats.errors}`, this.stats.errors > 0 ? 'red' : 'green');
    this.log('═══════════════════════════════════════════════════════════════════════\n', 'magenta');
    
    if (this.stats.fixed > 0) {
      this.log('✅ ALL CLUSTERS FIXED TO NUMERIC!', 'green');
      this.log('ℹ️  Standard clusters: genPowerCfg → 1, genOnOff → 6, etc.', 'cyan');
      this.log('ℹ️  Custom clusters: Tuya → 0xEF00 (61184), Xiaomi → 0xFCC0 (64704)\n', 'cyan');
      
      this.log('📝 Top 10 drivers with most fixes:', 'yellow');
      const top10 = this.stats.drivers
        .sort((a, b) => b.replacements - a.replacements)
        .slice(0, 10);
      
      top10.forEach((d, i) => {
        this.log(`  ${i + 1}. ${d.driver}: ${d.replacements} fixes`, 'cyan');
      });
    } else {
      this.log('ℹ️  No cluster string usage found - All drivers already using numeric IDs!', 'cyan');
    }
    
    this.log('\n');
  }
}

if (require.main === module) {
  const fixer = new ClusterNumericFixer();
  fixer.run().catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
}

module.exports = ClusterNumericFixer;
