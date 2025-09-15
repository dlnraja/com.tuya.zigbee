#!/usr/bin/env node

// Smart Automated Homey App Publisher
// Handles dynamic interaction with homey app publish command

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class SmartPublisher {
    constructor() {
        this.changelog = `v1.0.19: Complete Device Reorganization - SDK3 & Johan Benz Standards

✅ MAJOR RESTRUCTURING:
- Unbranded all device drivers (removed tuya_ prefixes)
- Organized by device categories: sensors, lights, switches, plugs
- Clean driver structure: motion_sensor, contact_sensor, smart_light, etc.
- Updated flow cards to match new unbranded driver IDs
- Professional device naming following Johan Benz standards

✅ DEVICE CATEGORIES:
- Sensors: motion_sensor, contact_sensor, temperature_humidity_sensor, presence_sensor, multisensor
- Lights: smart_light, light_switch
- Plugs: smart_plug
- All drivers follow SDK3 compliance with proper endpoints

✅ TECHNICAL IMPROVEMENTS:
- Removed duplicate drivers with same functionality
- Comprehensive manufacturer ID support maintained
- Professional asset organization by device category
- Flow cards updated for unbranded compatibility

🏆 App Store Ready: Clean, professional, SDK3 compliant structure`;

        this.responses = {
            'uncommitted changes': 'y',
            'update your app\'s version': 'n',
            'What\'s new': this.changelog,
            'changelog': this.changelog
        };
    }

    log(message, color = 'white') {
        const colors = {
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
            reset: '\x1b[0m'
        };
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    async publish() {
        this.log('🚀 Starting Smart Automated Homey App Publication...', 'green');
        
        return new Promise((resolve, reject) => {
            const homeyProcess = spawn('homey', ['app', 'publish'], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let outputBuffer = '';
            let questionPending = false;
            let changelogStarted = false;

            homeyProcess.stdout.on('data', (data) => {
                const output = data.toString();
                outputBuffer += output;
                this.log(`📤 Output: ${output.trim()}`, 'cyan');

                // Detect prompts and respond intelligently
                const lowerOutput = output.toLowerCase();

                if (lowerOutput.includes('uncommitted changes') && lowerOutput.includes('continue')) {
                    this.log('🔄 Detected uncommitted changes prompt - responding YES', 'yellow');
                    setTimeout(() => {
                        homeyProcess.stdin.write('y\n');
                    }, 500);
                }
                else if (lowerOutput.includes('update') && lowerOutput.includes('version')) {
                    this.log('🔄 Detected version update prompt - responding NO (keep current)', 'yellow');
                    setTimeout(() => {
                        homeyProcess.stdin.write('n\n');
                    }, 500);
                }
                else if ((lowerOutput.includes('what\'s new') || lowerOutput.includes('changelog')) && !changelogStarted) {
                    this.log('📝 Detected changelog prompt - sending changelog content', 'yellow');
                    changelogStarted = true;
                    setTimeout(() => {
                        // Send changelog line by line for better compatibility
                        const lines = this.changelog.split('\n');
                        lines.forEach((line, index) => {
                            setTimeout(() => {
                                homeyProcess.stdin.write(line + '\n');
                                if (index === lines.length - 1) {
                                    // Send additional newlines to finish
                                    setTimeout(() => {
                                        homeyProcess.stdin.write('\n');
                                        homeyProcess.stdin.write('\n');
                                    }, 300);
                                }
                            }, index * 100);
                        });
                    }, 1000);
                }
                else if (lowerOutput.includes('building') || lowerOutput.includes('uploading')) {
                    this.log('🏗️ App is being built and uploaded...', 'blue');
                }
                else if (lowerOutput.includes('published') || lowerOutput.includes('success')) {
                    this.log('✅ App published successfully!', 'green');
                }
            });

            homeyProcess.stderr.on('data', (data) => {
                const error = data.toString();
                this.log(`⚠️ Error: ${error.trim()}`, 'red');
            });

            homeyProcess.on('close', (code) => {
                this.log(`🎯 Process completed with exit code: ${code}`, code === 0 ? 'green' : 'yellow');
                
                if (code === 0) {
                    this.log('🎉 Publication successful!', 'green');
                    resolve({ success: true, code });
                } else {
                    this.log('📋 Publication process finished (manual review may be needed)', 'yellow');
                    resolve({ success: false, code, output: outputBuffer });
                }
            });

            homeyProcess.on('error', (error) => {
                this.log(`❌ Process error: ${error.message}`, 'red');
                reject(error);
            });

            // Timeout after 5 minutes
            setTimeout(() => {
                this.log('⏰ Process timeout - terminating', 'yellow');
                homeyProcess.kill();
                resolve({ success: false, timeout: true });
            }, 300000);
        });
    }

    async fallbackMethod() {
        this.log('🔄 Trying fallback method with input file...', 'yellow');
        
        const inputFile = path.join(process.cwd(), 'publish_responses.txt');
        const responses = [
            'y',  // uncommitted changes
            'n',  // version update
            this.changelog,
            '',   // empty line
            ''    // additional empty line
        ];

        try {
            fs.writeFileSync(inputFile, responses.join('\n'), 'utf8');
            
            return new Promise((resolve) => {
                const fallbackProcess = spawn('cmd', ['/c', `type "${inputFile}" | homey app publish`], {
                    cwd: process.cwd(),
                    stdio: 'inherit'
                });

                fallbackProcess.on('close', (code) => {
                    fs.unlinkSync(inputFile).catch(() => {});
                    resolve({ success: code === 0, code });
                });
            });
        } catch (error) {
            this.log(`❌ Fallback method failed: ${error.message}`, 'red');
            return { success: false, error };
        }
    }
}

// Execute
(async () => {
    const publisher = new SmartPublisher();
    
    try {
        let result = await publisher.publish();
        
        if (!result.success && !result.timeout) {
            publisher.log('🔄 Primary method incomplete, trying fallback...', 'yellow');
            result = await publisher.fallbackMethod();
        }
        
        if (result.success) {
            publisher.log('🎉 Ultimate Zigbee Hub v1.0.19 published successfully!', 'green');
        } else {
            publisher.log('📋 Publication may require manual completion', 'yellow');
        }
        
    } catch (error) {
        publisher.log(`❌ Publication failed: ${error.message}`, 'red');
        process.exit(1);
    }
})();
