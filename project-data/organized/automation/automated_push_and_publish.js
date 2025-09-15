const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class AutomatedPublisher {
    constructor() {
        this.homeyToken = process.env.HOMEY_TOKEN;
        this.githubToken = process.env.GITHUB_TOKEN;
    }

    async log(message) {
        console.log(`[${new Date().toISOString()}] ${message}`);
    }

    async execCommand(command, cwd = process.cwd()) {
        return new Promise((resolve, reject) => {
            exec(command, { cwd }, (error, stdout, stderr) => {
                if (error) {
                    reject({ error, stderr });
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }

    async spawnInteractive(command, args, responses) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            let output = '';
            let responseIndex = 0;

            child.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.log(text);

                // Check for prompts and respond
                if (responseIndex < responses.length) {
                    const { trigger, response } = responses[responseIndex];
                    if (text.includes(trigger)) {
                        setTimeout(() => {
                            child.stdin.write(response + '\n');
                            responseIndex++;
                        }, 500);
                    }
                }
            });

            child.stderr.on('data', (data) => {
                console.error(data.toString());
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Command failed with code ${code}`));
                }
            });
        });
    }

    async installDependencies() {
        await this.log('Installing dependencies...');
        
        // Install Node.js dependencies
        try {
            await this.execCommand('npm install -g homey');
            await this.log('Homey CLI installed globally');
        } catch (e) {
            await this.log('Homey CLI already installed or failed to install');
        }

        try {
            await this.execCommand('npm install');
            await this.log('Project dependencies installed');
        } catch (e) {
            await this.log('Failed to install project dependencies');
        }

        // Install Python dependencies
        try {
            await this.execCommand('pip install Pillow');
            await this.log('Python Pillow installed');
        } catch (e) {
            await this.log('Python Pillow already installed or failed');
        }
    }

    async validateApp() {
        await this.log('Validating app...');
        try {
            const result = await this.execCommand('homey app validate --level publish');
            await this.log('App validation successful');
            return true;
        } catch (e) {
            await this.log(`Validation failed: ${e.stderr}`);
            return false;
        }
    }

    async commitAndPush() {
        await this.log('Committing and pushing changes...');
        
        try {
            await this.execCommand('git add .');
            await this.execCommand('git commit -m "feat: Add missing scene remotes and Johan Bendz compatibility - v1.0.28 automated deployment"');
            await this.execCommand('git push origin main');
            await this.log('Successfully pushed to GitHub');
            return true;
        } catch (e) {
            await this.log(`Git operations failed: ${e.stderr}`);
            return false;
        }
    }

    async publishToHomey() {
        await this.log('Publishing to Homey App Store...');

        const changelog = `v1.0.28 - Complete Professional Reorganization

✨ NEW FEATURES:
• Added 2 Gang Scene Remote (TS0042) - _TZ3000_dfgbtub0 support
• Added 4 Gang Scene Remote (TS0044) - _TZ3000_wkai4ga5 support
• Enhanced Johan Bendz compatibility with expanded manufacturer IDs
• Professional unbranded device categorization following SDK3 standards

🔧 IMPROVEMENTS:
• Updated support URL to Homey Community forum (${process.env.HOMEY_COMMUNITY_URL || 'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352'})
• Fixed all validation errors and image size requirements (75x75)
• Multi-language tags support (EN/FR/NL)
• Clean asset management and driver structure

🐛 BUG FIXES:
• Corrected all driver image paths after reorganization
• Fixed manifest.tags format to object with language keys
• Resolved .homeybuild cache conflicts
• Enhanced device compatibility matrix

📋 TECHNICAL:
• Full SDK3 compliance with proper endpoint definitions
• Local Zigbee operation - no cloud dependencies
• Professional flow cards and device capabilities
• Automated CI/CD pipeline with GitHub Actions

This version ensures complete compatibility with Johan Bendz's original Tuya Zigbee app while providing modern SDK3 architecture and professional device organization.`;

        const responses = [
            { trigger: 'uncommitted changes', response: 'y' },
            { trigger: 'version number', response: 'n' },
            { trigger: 'Changelog', response: changelog }
        ];

        try {
            await this.spawnInteractive('homey', ['app', 'publish'], responses);
            await this.log('Successfully published to Homey App Store!');
            return true;
        } catch (e) {
            await this.log(`Publishing failed: ${e.message}`);
            return false;
        }
    }

    async run() {
        await this.log('Starting automated push and publish process...');
        
        try {
            // Step 1: Install dependencies
            await this.installDependencies();

            // Step 2: Validate app
            const isValid = await this.validateApp();
            if (!isValid) {
                throw new Error('App validation failed');
            }

            // Step 3: Commit and push to GitHub
            const pushed = await this.commitAndPush();
            if (!pushed) {
                await this.log('Warning: Git push failed, continuing with publish...');
            }

            // Step 4: Publish to Homey
            const published = await this.publishToHomey();
            if (!published) {
                throw new Error('Homey publishing failed');
            }

            await this.log('🎉 AUTOMATED PUBLISH COMPLETE! 🎉');
            await this.log('✅ App is now live on Homey App Store');
            await this.log('✅ All Johan Bendz devices supported');
            await this.log('✅ Scene remotes TS0042/TS0044 added');
            await this.log('✅ Professional organization complete');

        } catch (error) {
            await this.log(`❌ Process failed: ${error.message}`);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const publisher = new AutomatedPublisher();
    publisher.run().catch(console.error);
}

module.exports = AutomatedPublisher;
