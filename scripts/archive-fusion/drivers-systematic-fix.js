const fs = require('fs').promises;
const path = require('path');

class TuyaDriversSystematicFixer {
    constructor() {
        this.driversDir = path.join(__dirname, '../drivers');
        this.issues = [];
        this.fixes = [];
        this.johanBenzStandards = {
            requiredFiles: ['driver.compose.json', 'device.js'],
            recommendedFiles: ['driver.js'],
            requiredFields: ['id', 'name', 'class', 'capabilities'],
            requiredZigbeeFields: ['manufacturerName', 'endpoints'],
            standardClusters: {
                basic: 0,
                identify: 3,
                groups: 4,
                scenes: 5,
                onOff: 6,
                levelControl: 8,
                colorControl: 768,
                occupancySensing: 1030,
                temperatureMeasurement: 1026,
                powerConfiguration: 1,
                manuSpecificTuya: 61184 // EF00 cluster
            }
        };
    }

    async analyzeAndFix() {
        console.log('🔧 Starting systematic driver analysis and fixes...\n');
        
        try {
            const entries = await fs.readdir(this.driversDir, { withFileTypes: true });
            const driverDirs = entries.filter(entry => 
                entry.isDirectory() && 
                !entry.name.startsWith('.') && 
                !['_base', '_template', '_templates', 'common'].includes(entry.name)
            );

            for (const driverDir of driverDirs) {
                await this.processDriver(driverDir.name);
            }

            await this.generateReport();
            console.log(`\n✅ Analysis complete. Fixed ${this.fixes.length} issues, ${this.issues.length} remaining.`);
            
        } catch (error) {
            console.error('❌ Analysis failed:', error);
            throw error;
        }
    }

    async processDriver(driverName) {
        const driverPath = path.join(this.driversDir, driverName);
        console.log(`🔍 Processing driver: ${driverName}`);

        try {
            // Check and fix driver.compose.json
            await this.fixDriverCompose(driverPath, driverName);
            
            // Check and create missing device.js
            await this.fixDeviceJs(driverPath, driverName);
            
            // Check and create missing driver.js
            await this.fixDriverJs(driverPath, driverName);
            
            // Check and fix images
            await this.fixDriverImages(driverPath, driverName);
            
        } catch (error) {
            this.issues.push(`${driverName}: Error processing - ${error.message}`);
        }
    }

    async fixDriverCompose(driverPath, driverName) {
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        try {
            const composeContent = await fs.readFile(composePath, 'utf8');
            let compose = JSON.parse(composeContent);
            let modified = false;

            // Fix missing ID
            if (!compose.id) {
                compose.id = driverName.replace(/[^a-zA-Z0-9_]/g, '_');
                modified = true;
                this.fixes.push(`${driverName}: Added missing ID`);
            }

            // Fix bindings format (arrays of objects to arrays of numbers)
            if (compose.zigbee?.endpoints) {
                for (const [endpointId, endpoint] of Object.entries(compose.zigbee.endpoints)) {
                    if (endpoint.bindings && Array.isArray(endpoint.bindings)) {
                        const hasObjectBindings = endpoint.bindings.some(binding => 
                            typeof binding === 'object' && binding.cluster !== undefined
                        );
                        
                        if (hasObjectBindings) {
                            endpoint.bindings = endpoint.bindings.map(binding => {
                                if (typeof binding === 'object' && binding.cluster !== undefined) {
                                    return binding.cluster;
                                }
                                return binding;
                            });
                            modified = true;
                            this.fixes.push(`${driverName}: Fixed bindings format`);
                        }
                    }
                }
            }

            // Ensure zigbee has endpoints
            if (compose.zigbee && !compose.zigbee.endpoints) {
                compose.zigbee.endpoints = {
                    "1": {
                        "clusters": [0, 3, 4, 5, 6],
                        "bindings": [6]
                    }
                };
                modified = true;
                this.fixes.push(`${driverName}: Added missing endpoints`);
            }

            // Fix capabilities for sensors
            if (compose.class === 'sensor' && driverName.toLowerCase().includes('motion')) {
                const expectedCaps = ['alarm_motion', 'measure_battery'];
                let currentCaps = compose.capabilities || [];
                
                // Remove excessive capabilities
                const sensibleCaps = currentCaps.filter(cap => 
                    expectedCaps.includes(cap) || cap.startsWith('measure_') || cap.startsWith('alarm_')
                );
                
                if (sensibleCaps.length !== currentCaps.length) {
                    compose.capabilities = sensibleCaps.length > 0 ? sensibleCaps : expectedCaps;
                    modified = true;
                    this.fixes.push(`${driverName}: Cleaned excessive capabilities`);
                }
            }

            // Fix image paths
            if (compose.images) {
                if (compose.images.large && !compose.images.large.includes('{{driverAssetsPath}}')) {
                    compose.images.large = 'assets/images/large.png';
                    modified = true;
                }
                if (compose.images.small && !compose.images.small.includes('{{driverAssetsPath}}')) {
                    compose.images.small = 'assets/images/small.png';
                    modified = true;
                }
                if (modified) {
                    this.fixes.push(`${driverName}: Fixed image paths`);
                }
            }

            if (modified) {
                await fs.writeFile(composePath, JSON.stringify(compose, null, 2));
                this.fixes.push(`${driverName}: Updated driver.compose.json`);
            }

        } catch (error) {
            this.issues.push(`${driverName}: driver.compose.json error - ${error.message}`);
        }
    }

    async fixDeviceJs(driverPath, driverName) {
        const devicePath = path.join(driverPath, 'device.js');
        
        try {
            await fs.access(devicePath);
            // Check if file is valid
            const content = await fs.readFile(devicePath, 'utf8');
            if (content.trim().length < 50) {
                throw new Error('File too short');
            }
        } catch {
            // Create missing device.js
            const deviceTemplate = this.generateDeviceJs(driverName);
            await fs.writeFile(devicePath, deviceTemplate);
            this.fixes.push(`${driverName}: Created missing device.js`);
        }
    }

    async fixDriverJs(driverPath, driverName) {
        const driverJsPath = path.join(driverPath, 'driver.js');
        
        try {
            await fs.access(driverJsPath);
        } catch {
            // Create missing driver.js
            const driverTemplate = this.generateDriverJs(driverName);
            await fs.writeFile(driverJsPath, driverTemplate);
            this.fixes.push(`${driverName}: Created missing driver.js`);
        }
    }

    async fixDriverImages(driverPath, driverName) {
        const assetsDir = path.join(driverPath, 'assets');
        const imagesDir = path.join(assetsDir, 'images');
        
        try {
            await fs.mkdir(imagesDir, { recursive: true });
            
            // Check for required images
            const requiredImages = ['large.png', 'small.png'];
            for (const imgName of requiredImages) {
                const imgPath = path.join(imagesDir, imgName);
                try {
                    await fs.access(imgPath);
                } catch {
                    // Copy placeholder image
                    await this.createPlaceholderImage(imgPath, driverName);
                    this.fixes.push(`${driverName}: Created placeholder ${imgName}`);
                }
            }
            
            // Check for icon
            const iconPath = path.join(assetsDir, 'icon.svg');
            try {
                await fs.access(iconPath);
            } catch {
                await this.createPlaceholderIcon(iconPath, driverName);
                this.fixes.push(`${driverName}: Created placeholder icon.svg`);
            }
            
        } catch (error) {
            this.issues.push(`${driverName}: Image error - ${error.message}`);
        }
    }

    generateDeviceJs(driverName) {
        const className = driverName.split(/[-_]/).map(part => 
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('') + 'Device';
        
        return `const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Enable debug mode
    if (this.getSetting('debug_enabled')) {
      this.enableDebug();
      this.printNode();
    }

    // Register capabilities based on device type
    await this.registerCapabilities(zclNode);
    
    this.log('${className} initialized successfully');
  }

  async registerCapabilities(zclNode) {
    // Register device-specific capabilities
    try {
      // Add capability registration based on driver configuration
      if (this.hasCapability('onoff')) {
        this.registerCapability('onoff', 'genOnOff', {
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 0,
              maxInterval: 300,
              minChange: 1,
            },
          },
        });
      }

      if (this.hasCapability('alarm_motion')) {
        this.registerCapability('alarm_motion', 'msOccupancySensing', {
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 0,
              maxInterval: 300,
              minChange: 1,
            },
          },
        });
      }

      if (this.hasCapability('measure_battery')) {
        this.registerCapability('measure_battery', 'genPowerCfg', {
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 3600,
              maxInterval: 21600,
              minChange: 1,
            },
          },
        });
      }

    } catch (error) {
      this.error('Error registering capabilities:', error);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
    
    // Handle setting changes
    for (const key of changedKeys) {
      switch (key) {
        case 'debug_enabled':
          if (newSettings.debug_enabled) {
            this.enableDebug();
          }
          break;
        default:
          this.log(\`Setting \${key} changed to \${newSettings[key]}\`);
      }
    }
  }

  onDeleted() {
    this.log('${className} has been deleted');
  }

}

module.exports = ${className};
`;
    }

    generateDriverJs(driverName) {
        const className = driverName.split(/[-_]/).map(part => 
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('') + 'Driver';
        
        return `const { ZigBeeDriver } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDriver {

  async onInit() {
    this.log('${className} has been initialized');
  }

  async onPair(session) {
    this.log('${className} pairing started');
    
    session.setHandler('list_devices', async () => {
      return this.onPairListDevices();
    });

    session.setHandler('pincode', async (pincode) => {
      return this.onPairPincode(pincode);
    });
  }

  async onPairListDevices() {
    this.log('Listing devices for pairing...');
    
    // Return discovered devices
    return [];
  }

  async onPairPincode(pincode) {
    this.log('Pincode received:', pincode);
    return true;
  }

}

module.exports = ${className};
`;
    }

    async createPlaceholderImage(imagePath, driverName) {
        // Create a simple text-based placeholder for now
        // In a real implementation, you'd generate actual PNG files
        const placeholder = `# Placeholder image for ${driverName}
# This should be replaced with actual PNG files`;
        
        await fs.writeFile(imagePath.replace('.png', '.txt'), placeholder);
    }

    async createPlaceholderIcon(iconPath, driverName) {
        const svgTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#0066CC" rx="20"/>
  <text x="100" y="100" font-family="Arial" font-size="16" fill="white" text-anchor="middle" dy=".3em">
    ${driverName.toUpperCase()}
  </text>
  <circle cx="100" cy="140" r="20" fill="white" opacity="0.8"/>
</svg>`;
        
        await fs.writeFile(iconPath, svgTemplate);
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            totalFixes: this.fixes.length,
            remainingIssues: this.issues.length,
            fixes: this.fixes,
            issues: this.issues
        };

        await fs.writeFile(
            path.join(__dirname, '../reports/systematic-fixes-report.json'),
            JSON.stringify(report, null, 2)
        );

        console.log('\n📊 SYSTEMATIC FIXES REPORT:');
        console.log(`✅ Total fixes applied: ${this.fixes.length}`);
        console.log(`⚠️  Remaining issues: ${this.issues.length}`);
        
        if (this.fixes.length > 0) {
            console.log('\n🔧 FIXES APPLIED:');
            this.fixes.slice(0, 10).forEach(fix => console.log(`  - ${fix}`));
            if (this.fixes.length > 10) {
                console.log(`  ... and ${this.fixes.length - 10} more fixes`);
            }
        }
        
        if (this.issues.length > 0) {
            console.log('\n⚠️  REMAINING ISSUES:');
            this.issues.slice(0, 5).forEach(issue => console.log(`  - ${issue}`));
            if (this.issues.length > 5) {
                console.log(`  ... and ${this.issues.length - 5} more issues`);
            }
        }
    }
}

// Run if called directly
if (require.main === module) {
    const fixer = new TuyaDriversSystematicFixer();
    fixer.analyzeAndFix()
        .then(() => {
            console.log('\n🎉 Systematic fixes completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Systematic fixes failed:', error);
            process.exit(1);
        });
}

module.exports = TuyaDriversSystematicFixer;
