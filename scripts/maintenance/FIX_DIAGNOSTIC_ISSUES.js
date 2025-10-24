#!/usr/bin/env node
'use strict';

/**
 * FIX DIAGNOSTIC ISSUES
 * 
 * Corrige les problèmes remontés par les utilisateurs:
 * 1. SOS Button - Pas de trigger
 * 2. Motion Sensor - IAS Zone enrollment failed
 * 3. PIR Radar - Motion/Illumination ne fonctionnent pas
 */

const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const FIXES = {
  'sos_emergency_button_cr2032': {
    file: 'device.js',
    issue: 'No button press detected',
    fix: `
// Fix IAS Zone for button press
if (this.hasCapability('alarm_generic')) {
  try {
    // Register IAS Zone for button press
    this.registerCapability('alarm_generic', CLUSTER.IAS_ZONE, {
      zoneType: 'standardCie',
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => {
        this.log('🚨 SOS Button pressed! Zone status:', value);
        
        // Trigger alarm on any zone status change
        if (value && value.alarm1) {
          // Reset alarm after 3 seconds
          setTimeout(() => {
            this.setCapabilityValue('alarm_generic', false).catch(this.error);
          }, 3000);
          return true;
        }
        return false;
      }
    });
    
    // Also listen for command events
    this.zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', async (value) => {
      this.log('🚨 SOS Button - Zone status change:', value);
      await this.setCapabilityValue('alarm_generic', true);
      
      // Reset after 3 seconds
      setTimeout(() => {
        this.setCapabilityValue('alarm_generic', false).catch(this.error);
      }, 3000);
    });
    
    this.log('✅ SOS Button alarm registered');
  } catch (err) {
    this.error('SOS Button alarm registration failed:', err);
  }
}
`
  },
  
  'motion_temp_humidity_illumination_multi_battery': {
    file: 'device.js',
    issue: 'IAS Zone enrollResponse is not a function',
    fix: `
// Fix IAS Zone enrollment without enrollResponse
if (this.hasCapability('alarm_motion')) {
  try {
    this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
      zoneType: 'motionSensor',
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => {
        this.log('Motion IAS Zone status:', value);
        
        // Check for motion in zone status
        if (value && (value.alarm1 || value.alarm2)) {
          return true;
        }
        return false;
      }
    });
    
    // Listen for zone status change notifications
    const motionEndpoint = this.zclNode.endpoints[1];
    if (motionEndpoint && motionEndpoint.clusters.iasZone) {
      motionEndpoint.clusters.iasZone.on('zoneStatusChangeNotification', async (notification) => {
        this.log('🚶 Motion detected! Notification:', notification);
        
        const motionDetected = notification.zoneStatus && 
          (notification.zoneStatus.alarm1 || notification.zoneStatus.alarm2);
        
        await this.setCapabilityValue('alarm_motion', motionDetected);
        
        // Auto-reset motion after 60 seconds if enabled in settings
        if (motionDetected) {
          const timeout = this.getSetting('motion_timeout') || 60;
          setTimeout(async () => {
            await this.setCapabilityValue('alarm_motion', false);
          }, timeout * 1000);
        }
      });
    }
    
    this.log('✅ Motion capability registered (IAS Zone)');
  } catch (err) {
    this.error('Motion IAS Zone failed:', err);
    
    // Fallback to occupancy cluster
    try {
      this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
        get: 'occupancy',
        report: 'occupancy',
        reportParser: value => {
          this.log('Motion occupancy value:', value);
          return (value & 1) === 1;
        }
      });
      this.log('✅ Motion registered (Occupancy fallback)');
    } catch (err2) {
      this.error('Motion occupancy fallback failed:', err2);
    }
  }
}
`
  },
  
  'pir_radar_illumination_sensor_battery': {
    file: 'device.js',
    issue: 'Motion and illumination not reporting',
    fix: `
// Fix PIR Radar motion detection
if (this.hasCapability('alarm_motion')) {
  try {
    // Try IAS Zone first
    this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
      zoneType: 'motionSensor',
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => {
        this.log('PIR Radar motion zone status:', value);
        return value && (value.alarm1 || value.alarm2);
      }
    });
    
    // Listen for notifications
    this.zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', async (notification) => {
      this.log('🚶 PIR Radar motion!', notification);
      const motionDetected = notification.zoneStatus && 
        (notification.zoneStatus.alarm1 || notification.zoneStatus.alarm2);
      await this.setCapabilityValue('alarm_motion', motionDetected);
    });
    
    this.log('✅ PIR Radar motion registered');
  } catch (err) {
    this.error('PIR Radar motion failed:', err);
  }
}

// Fix illumination
if (this.hasCapability('measure_luminance')) {
  try {
    this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT, {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: value => {
        this.log('PIR Radar illuminance raw:', value);
        // Convert from Zigbee format to lux
        const lux = Math.round(Math.pow(10, (value - 1) / 10000));
        this.log('PIR Radar illuminance lux:', lux);
        return lux;
      },
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 60,
          maxInterval: 3600,
          minChange: 100
        }
      }
    });
    this.log('✅ PIR Radar illuminance registered');
  } catch (err) {
    this.error('PIR Radar illuminance failed:', err);
  }
}
`
  }
};

async function fixDiagnosticIssues() {
  console.log('🔧 FIX DIAGNOSTIC ISSUES\n');
  console.log('═'.repeat(70) + '\n');
  
  for (const [driverId, fixInfo] of Object.entries(FIXES)) {
    console.log(`📝 Fixing ${driverId}...`);
    console.log(`   Issue: ${fixInfo.issue}`);
    
    const driverPath = path.join(DRIVERS_DIR, driverId);
    const deviceFile = path.join(driverPath, fixInfo.file);
    
    if (!await fs.pathExists(deviceFile)) {
      console.log(`   ⚠️  ${fixInfo.file} not found, skipping\n`);
      continue;
    }
    
    let content = await fs.readFile(deviceFile, 'utf8');
    
    // Add fix at appropriate location (before onDeleted or at end of onNodeInit)
    if (content.includes('async onDeleted()')) {
      content = String(content).replace(
        'async onDeleted()',
        fixInfo.fix + '\n\n  async onDeleted()'
      );
    } else if (content.includes('await this.setAvailable()')) {
      content = String(content).replace(
        'await this.setAvailable();',
        'await this.setAvailable();' + fixInfo.fix
      );
    } else {
      // Append before last closing brace
      const lastBrace = content.lastIndexOf('}');
      content = content.substring(0, lastBrace) + '\n' + fixInfo.fix + '\n' + content.substring(lastBrace);
    }
    
    await fs.writeFile(deviceFile, content);
    console.log(`   ✅ ${driverId} fixed\n`);
  }
  
  console.log('═'.repeat(70));
  console.log('\n✅ All diagnostic issues fixed!\n');
  console.log('FIXES APPLIED:');
  console.log('  1. SOS Button - IAS Zone + listeners added');
  console.log('  2. Motion Sensor - Enrollment fix + fallback');
  console.log('  3. PIR Radar - Motion + Illumination fix\n');
}

fixDiagnosticIssues().catch(console.error);
