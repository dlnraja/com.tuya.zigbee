const fs = require('fs').promises;
const path = require('path');

async function analyzeDriversCoherence() {
    const driversDir = path.join(__dirname, '../drivers');
    const issues = [];
    const report = {
        totalDrivers: 0,
        validDrivers: 0,
        issues: [],
        missingFiles: [],
        invalidConfigs: [],
        missingImages: []
    };

    console.log('🔍 Analyzing drivers coherence...\n');

    try {
        const entries = await fs.readdir(driversDir, { withFileTypes: true });
        const driverDirs = entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.'));

        for (const driverDir of driverDirs) {
            const driverPath = path.join(driversDir, driverDir.name);
            const analysis = await analyzeDriver(driverPath, driverDir.name);
            
            report.totalDrivers++;
            
            if (analysis.valid) {
                report.validDrivers++;
                console.log(`✅ ${driverDir.name} - OK`);
            } else {
                console.log(`❌ ${driverDir.name} - Issues found:`);
                analysis.issues.forEach(issue => {
                    console.log(`   - ${issue}`);
                    report.issues.push(`${driverDir.name}: ${issue}`);
                });
            }
        }

        // Generate summary
        console.log('\n📊 SUMMARY:');
        console.log(`Total drivers: ${report.totalDrivers}`);
        console.log(`Valid drivers: ${report.validDrivers}`);
        console.log(`Drivers with issues: ${report.totalDrivers - report.validDrivers}`);
        
        if (report.issues.length > 0) {
            console.log('\n🚨 ISSUES TO FIX:');
            report.issues.forEach(issue => console.log(`- ${issue}`));
        }

        // Write detailed report
        await fs.writeFile(
            path.join(__dirname, '../reports/drivers-coherence-report.json'),
            JSON.stringify(report, null, 2)
        );

        return report;

    } catch (error) {
        console.error('Error analyzing drivers:', error);
        throw error;
    }
}

async function analyzeDriver(driverPath, driverName) {
    const analysis = {
        name: driverName,
        valid: true,
        issues: [],
        files: {
            'driver.compose.json': false,
            'device.js': false,
            'driver.js': false
        },
        images: {
            large: false,
            small: false,
            icon: false
        }
    };

    try {
        const files = await fs.readdir(driverPath);
        
        // Check required files
        const requiredFiles = ['driver.compose.json', 'device.js'];
        const recommendedFiles = ['driver.js'];
        
        for (const file of requiredFiles) {
            if (files.includes(file)) {
                analysis.files[file] = true;
            } else {
                analysis.valid = false;
                analysis.issues.push(`Missing required file: ${file}`);
            }
        }

        for (const file of recommendedFiles) {
            if (files.includes(file)) {
                analysis.files[file] = true;
            } else {
                analysis.issues.push(`Missing recommended file: ${file}`);
            }
        }

        // Check driver.compose.json structure
        if (analysis.files['driver.compose.json']) {
            try {
                const composeContent = await fs.readFile(path.join(driverPath, 'driver.compose.json'), 'utf8');
                const compose = JSON.parse(composeContent);
                
                // Validate structure
                const requiredFields = ['id', 'name', 'class', 'capabilities'];
                for (const field of requiredFields) {
                    if (!compose[field]) {
                        analysis.valid = false;
                        analysis.issues.push(`Missing field in driver.compose.json: ${field}`);
                    }
                }

                // Check images configuration
                if (compose.images) {
                    const imageChecks = [];
                    if (compose.images.large) {
                        const imagePath = path.join(driverPath, compose.images.large.replace('/drivers/' + driverName + '/', ''));
                        try {
                            await fs.access(imagePath);
                            analysis.images.large = true;
                        } catch {
                            analysis.issues.push(`Missing large image: ${compose.images.large}`);
                        }
                    }
                    
                    if (compose.images.small) {
                        const imagePath = path.join(driverPath, compose.images.small.replace('/drivers/' + driverName + '/', ''));
                        try {
                            await fs.access(imagePath);
                            analysis.images.small = true;
                        } catch {
                            analysis.issues.push(`Missing small image: ${compose.images.small}`);
                        }
                    }
                }

                // Check icon
                if (compose.icon) {
                    const iconPath = path.join(driverPath, compose.icon.replace('/drivers/' + driverName + '/', ''));
                    try {
                        await fs.access(iconPath);
                        analysis.images.icon = true;
                    } catch {
                        analysis.issues.push(`Missing icon: ${compose.icon}`);
                    }
                } else {
                    // Check for default icon locations
                    const defaultIcons = ['assets/icon.svg', 'icon.svg'];
                    for (const iconFile of defaultIcons) {
                        try {
                            await fs.access(path.join(driverPath, iconFile));
                            analysis.images.icon = true;
                            break;
                        } catch {
                            // Continue checking
                        }
                    }
                    if (!analysis.images.icon) {
                        analysis.issues.push('No icon found (checked assets/icon.svg, icon.svg)');
                    }
                }

                // Check Zigbee configuration
                if (compose.zigbee) {
                    if (!compose.zigbee.manufacturerName && !compose.zigbee.productId) {
                        analysis.issues.push('Missing manufacturerName or productId in zigbee config');
                    }
                    
                    if (!compose.zigbee.endpoints || Object.keys(compose.zigbee.endpoints).length === 0) {
                        analysis.issues.push('Missing or empty endpoints in zigbee config');
                    }
                }

            } catch (error) {
                analysis.valid = false;
                analysis.issues.push(`Invalid JSON in driver.compose.json: ${error.message}`);
            }
        }

        // Check device.js structure
        if (analysis.files['device.js']) {
            try {
                const deviceContent = await fs.readFile(path.join(driverPath, 'device.js'), 'utf8');
                
                // Basic checks for device.js
                if (!deviceContent.includes('class') && !deviceContent.includes('module.exports')) {
                    analysis.issues.push('device.js appears to be empty or invalid');
                }
                
                if (!deviceContent.includes('onNodeInit') && !deviceContent.includes('onInit')) {
                    analysis.issues.push('device.js missing initialization method');
                }

            } catch (error) {
                analysis.issues.push(`Error reading device.js: ${error.message}`);
            }
        }

    } catch (error) {
        analysis.valid = false;
        analysis.issues.push(`Error analyzing driver: ${error.message}`);
    }

    return analysis;
}

// Run analysis if called directly
if (require.main === module) {
    analyzeDriversCoherence()
        .then(report => {
            process.exit(report.issues.length > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Analysis failed:', error);
            process.exit(1);
        });
}

module.exports = { analyzeDriversCoherence, analyzeDriver };
