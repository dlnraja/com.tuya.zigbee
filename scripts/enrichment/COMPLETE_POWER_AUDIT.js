#!/usr/bin/env node

/**
 * COMPLETE POWER AUDIT - IDENTIFY ALL DRIVERS MISSING POWER DESIGNATION
 * 
 * @version 2.1.46
 * @author Dylan Rajasekaram
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

class PowerAudit {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.missingPower = [];
    this.needsResearch = [];
    this.hybrid = [];
  }

  log(msg, color = 'blue') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
  }

  hasPowerDesignation(driverName) {
    return driverName.includes('_ac') || 
           driverName.includes('_battery') || 
           driverName.includes('_cr2032') || 
           driverName.includes('_cr2450') ||
           driverName.includes('_hybrid') ||
           driverName.includes('_dc');
  }

  inferPowerFromCapabilities(compose) {
    const hasBattery = compose.capabilities?.includes('measure_battery');
    const hasEnergy = compose.energy?.batteries && compose.energy.batteries.length > 0;
    
    if (hasBattery || hasEnergy) {
      // Check battery type
      if (compose.energy?.batteries) {
        if (compose.energy.batteries.includes('CR2032')) return 'cr2032';
        if (compose.energy.batteries.includes('CR2450')) return 'cr2450';
        return 'battery';
      }
      return 'battery';
    }
    
    // No battery capability, likely AC powered
    return 'ac';
  }

  categorizeDriver(driverName, compose) {
    // Controllers and hubs typically AC
    if (driverName.includes('controller') || 
        driverName.includes('hub') || 
        driverName.includes('gateway') ||
        driverName.includes('bridge')) {
      return 'ac';
    }
    
    // Wireless devices typically battery
    if (driverName.includes('wireless')) {
      return 'cr2032'; // Most wireless switches use coin cells
    }
    
    // Wall switches typically AC
    if (driverName.includes('wall') && driverName.includes('switch')) {
      return 'ac';
    }
    
    // Touch switches typically AC
    if (driverName.includes('touch')) {
      return 'ac';
    }
    
    // Smart plugs always AC
    if (driverName.includes('plug') || driverName.includes('outlet')) {
      return 'ac';
    }
    
    // Dimmers typically AC
    if (driverName.includes('dimmer')) {
      return 'ac';
    }
    
    // Smart switches typically AC
    if (driverName.includes('smart_switch') || driverName.includes('relay')) {
      return 'ac';
    }
    
    // Lights and bulbs AC
    if (driverName.includes('bulb') || driverName.includes('light') || driverName.includes('led_strip')) {
      return 'ac';
    }
    
    // Valves typically AC or hybrid
    if (driverName.includes('valve')) {
      return 'hybrid'; // Often have battery backup
    }
    
    // Thermostats typically AC or hybrid
    if (driverName.includes('thermostat')) {
      return 'hybrid';
    }
    
    // Sensors typically battery
    if (driverName.includes('sensor')) {
      return 'battery';
    }
    
    // Detectors typically battery
    if (driverName.includes('detector')) {
      return 'battery';
    }
    
    // Locks typically battery
    if (driverName.includes('lock')) {
      return 'battery';
    }
    
    // Scene controllers typically battery
    if (driverName.includes('scene_controller')) {
      return 'battery';
    }
    
    // Motors typically AC
    if (driverName.includes('motor') || driverName.includes('curtain')) {
      return 'ac';
    }
    
    return null; // Needs research
  }

  async run() {
    try {
      this.log('\n' + '='.repeat(80), 'cyan');
      this.log('🔍 COMPLETE POWER AUDIT', 'cyan');
      this.log('='.repeat(80) + '\n', 'cyan');

      const allDrivers = fs.readdirSync(this.driversDir).filter(dir => {
        return fs.statSync(path.join(this.driversDir, dir)).isDirectory();
      });

      this.log(`📋 Scanning ${allDrivers.length} drivers...\n`, 'blue');

      for (const driverName of allDrivers) {
        if (!this.hasPowerDesignation(driverName)) {
          const composePath = path.join(this.driversDir, driverName, 'driver.compose.json');
          
          if (fs.existsSync(composePath)) {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
            
            // Try to infer from capabilities
            const inferredPower = this.inferPowerFromCapabilities(compose);
            
            // Try to categorize from name
            const categorizedPower = this.categorizeDriver(driverName, compose);
            
            const finalPower = categorizedPower || inferredPower;
            
            this.missingPower.push({
              name: driverName,
              inferredPower: finalPower,
              hasBattery: compose.capabilities?.includes('measure_battery'),
              batteries: compose.energy?.batteries,
              displayName: compose.name?.en
            });
            
            if (finalPower === 'hybrid') {
              this.hybrid.push(driverName);
            }
            
            if (!finalPower) {
              this.needsResearch.push(driverName);
            }
          }
        }
      }

      // Report
      this.log('='.repeat(80), 'yellow');
      this.log('📊 AUDIT RESULTS', 'yellow');
      this.log('='.repeat(80) + '\n', 'yellow');
      
      this.log(`✅ Drivers with power: ${allDrivers.length - this.missingPower.length}`, 'green');
      this.log(`⚠ Drivers missing power: ${this.missingPower.length}`, 'yellow');
      this.log(`🔄 Inferred as hybrid: ${this.hybrid.length}`, 'cyan');
      this.log(`❓ Needs research: ${this.needsResearch.length}`, 'red');
      
      if (this.missingPower.length > 0) {
        this.log('\n📝 DRIVERS MISSING POWER DESIGNATION:\n', 'yellow');
        
        // Group by inferred power
        const byPower = {};
        this.missingPower.forEach(d => {
          const power = d.inferredPower || 'unknown';
          if (!byPower[power]) byPower[power] = [];
          byPower[power].push(d);
        });
        
        for (const [power, drivers] of Object.entries(byPower)) {
          this.log(`\n${power.toUpperCase()} (${drivers.length} drivers):`, 'cyan');
          drivers.forEach(d => {
            this.log(`  - ${d.name}`, 'yellow');
            this.log(`    Display: ${d.displayName}`, 'blue');
            if (d.hasBattery) this.log(`    Has measure_battery capability`, 'green');
            if (d.batteries) this.log(`    Batteries: ${d.batteries.join(', ')}`, 'green');
          });
        }
      }
      
      if (this.needsResearch.length > 0) {
        this.log('\n❓ REQUIRES INTERNET RESEARCH:\n', 'red');
        this.needsResearch.forEach(name => {
          this.log(`  - ${name}`, 'red');
        });
      }
      
      // Save to file
      const report = {
        timestamp: new Date().toISOString(),
        totalDrivers: allDrivers.length,
        withPower: allDrivers.length - this.missingPower.length,
        missingPower: this.missingPower.length,
        hybrid: this.hybrid.length,
        needsResearch: this.needsResearch.length,
        details: this.missingPower,
        needsResearchList: this.needsResearch
      };
      
      const reportPath = path.join(this.rootDir, 'reports', 'POWER_AUDIT_REPORT.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      
      this.log(`\n💾 Report saved: reports/POWER_AUDIT_REPORT.json\n`, 'green');

    } catch (error) {
      this.log(`\n❌ ERROR: ${error.message}\n`, 'red');
      console.error(error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const audit = new PowerAudit();
  audit.run();
}

module.exports = PowerAudit;
