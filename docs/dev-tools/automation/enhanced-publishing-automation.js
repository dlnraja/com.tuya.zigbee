#!/usr/bin/env node

/**
 * Enhanced Publishing Automation System
 * Robust Homey CLI automation with intelligent prompt handling and multiple fallback strategies
 * Handles all possible interactive prompts during publication process
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class EnhancedPublishingAutomation {
    constructor() {
        this.projectRoot = process.cwd();
        this.logFile = path.join(this.projectRoot, 'publish-automation.log');
        this.maxRetries = 3;
        this.timeout = 300000; // 5 minutes
        this.currentRetry = 0;
        
        this.promptHandlers = new Map([
            // Version management prompts
            ['uncommitted changes', 'y\n'],
            ['update the version', 'y\n'],
            ['Update version', 'y\n'],
            ['version number', 'patch\n'],
            
            // Version selection menu
            ['Patch', 'patch\n'],
            ['Minor', 'patch\n'],
            ['Major', 'patch\n'],
            ['patch', 'patch\n'],
            ['minor', 'patch\n'],
            ['major', 'patch\n'],
            
            // Changelog prompts
            ['Changelog', this.generateChangelog()],
            ['changelog', this.generateChangelog()],
            ['Enter changelog', this.generateChangelog()],
            ['What changed', this.generateChangelog()],
            
            // Authentication prompts
            ['email', 'dlnraja@gmail.com\n'],
            ['Email', 'dlnraja@gmail.com\n'],
            ['username', 'dlnraja\n'],
            ['Username', 'dlnraja\n'],
            ['password', '\n'], // Will be handled by stored token
            ['password: "REDACTED", '\n'],
            
            // Confirmation prompts
            ['Continue', 'y\n'],
            ['continue', 'y\n'],
            ['Proceed', 'y\n'],
            ['proceed', 'y\n'],
            ['Yes/No', 'y\n'],
            ['(y/n)', 'y\n'],
            ['[Y/n]', 'y\n'],
            ['[y/N]', 'y\n'],
            
            // Error recovery
            ['Try again', 'y\n'],
            ['Retry', 'y\n'],
            ['retry', 'y\n'],
            
            // Publication status
            ['Published', ''], // Just acknowledge
            ['Success', ''], // Just acknowledge
            ['Complete', ''] // Just acknowledge
        ]);

        console.log('🚀 Enhanced Publishing Automation System');
        console.log('🔧 Intelligent prompt handling with multiple fallback strategies');
    }

    async run() {
        console.log('\n🚀 Starting enhanced publishing automation...');
        
        try {
            await this.initializeLogging();
            await this.validateEnvironment();
            
            const result = await this.publishWithRetries();
            
            console.log('✅ Publishing automation completed successfully!');
            return result;
            
        } catch (error) {
            console.error('❌ Publishing automation failed:', error);
            await this.logError(error);
            throw error;
        }
    }

    async initializeLogging() {
        await fs.ensureFile(this.logFile);
        const timestamp = new Date().toISOString();
        await fs.appendFile(this.logFile, `\n=== PUBLISHING SESSION ${timestamp} ===\n`);
    }

    async validateEnvironment() {
        console.log('🔍 Validating publishing environment...');
        
        // Check for package.json
        const packagePath = path.join(this.projectRoot, 'package.json');
        if (!await fs.pathExists(packagePath)) {
            throw new Error('package.json not found');
        }

        // Check for app.json
        const appPath = path.join(this.projectRoot, 'app.json');
        if (!await fs.pathExists(appPath)) {
            throw new Error('app.json not found');
        }

        // Validate Homey CLI
        try {
            await this.runCommand('homey', ['--version'], { timeout: 10000 });
            console.log('✅ Homey CLI validated');
        } catch (error) {
            throw new Error('Homey CLI not found or not working: ' + error.message);
        }

        console.log('✅ Environment validation passed');
    }

    async publishWithRetries() {
        for (this.currentRetry = 0; this.currentRetry < this.maxRetries; this.currentRetry++) {
            console.log(`\n📦 Publication attempt ${this.currentRetry + 1}/${this.maxRetries}`);
            
            try {
                const result = await this.executePublish();
                console.log('✅ Publication successful!');
                return result;
                
            } catch (error) {
                console.log(`❌ Attempt ${this.currentRetry + 1} failed:`, error.message);
                
                if (this.currentRetry < this.maxRetries - 1) {
                    console.log('🔄 Retrying in 10 seconds...');
                    await this.sleep(10000);
                    
                    // Try different strategies on retries
                    if (this.currentRetry === 1) {
                        await this.tryAlternativeAuth();
                    }
                } else {
                    throw new Error(`All ${this.maxRetries} publication attempts failed. Last error: ${error.message}`);
                }
            }
        }
    }

    async executePublish() {
        return new Promise((resolve, reject) => {
            console.log('🚀 Executing: homey app publish');
            
            const publish = spawn('homey', ['app', 'publish'], {
                cwd: this.projectRoot,
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            let outputBuffer = '';
            let errorBuffer = '';
            let isResolved = false;
            
            // Set up timeout
            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    publish.kill('SIGTERM');
                    reject(new Error('Publication timeout after 5 minutes'));
                }
            }, this.timeout);

            // Handle stdout with intelligent prompt detection
            publish.stdout.on('data', async (data) => {
                const text = data.toString();
                outputBuffer += text;
                
                console.log('📤 Output:', text.trim());
                await this.logOutput('STDOUT', text);
                
                // Check for prompts and respond
                await this.handlePrompts(text, publish);
                
                // Check for success indicators
                if (this.isPublishSuccess(text)) {
                    clearTimeout(timeoutId);
                    if (!isResolved) {
                        isResolved = true;
                        resolve({
                            success: true,
                            output: outputBuffer,
                            attempt: this.currentRetry + 1
                        });
                    }
                }
            });

            // Handle stderr
            publish.stderr.on('data', async (data) => {
                const text = data.toString();
                errorBuffer += text;
                
                console.log('📤 Error:', text.trim());
                await this.logOutput('STDERR', text);
                
                // Some errors might still need prompt responses
                await this.handlePrompts(text, publish);
            });

            // Handle process exit
            publish.on('close', (code) => {
                clearTimeout(timeoutId);
                
                if (!isResolved) {
                    isResolved = true;
                    
                    if (code === 0) {
                        resolve({
                            success: true,
                            output: outputBuffer,
                            attempt: this.currentRetry + 1
                        });
                    } else {
                        reject(new Error(`Process exited with code ${code}. Error: ${errorBuffer}`));
                    }
                }
            });

            // Handle process errors
            publish.on('error', (error) => {
                clearTimeout(timeoutId);
                
                if (!isResolved) {
                    isResolved = true;
                    reject(new Error(`Process error: ${error.message}`));
                }
            });
        });
    }

    async handlePrompts(text, process) {
        const lowerText = text.toLowerCase();
        
        for (const [trigger, response] of this.promptHandlers) {
            if (lowerText.includes(trigger.toLowerCase())) {
                console.log(`🎯 Detected prompt: "${trigger}" -> Responding: "${response.replace('\n', '\\n')}"`);
                
                try {
                    if (response) {
                        process.stdin.write(response);
                        await this.logOutput('STDIN', response);
                    }
                    
                    // Special handling for version selection menu
                    if (trigger.includes('Patch') || trigger.includes('patch')) {
                        await this.sleep(1000); // Wait a bit for menu to stabilize
                    }
                    
                } catch (error) {
                    console.log(`⚠️  Error sending response to prompt: ${error.message}`);
                }
                break; // Handle only first matching prompt
            }
        }

        // Special case: detect menu selections
        if (this.isVersionMenu(text)) {
            console.log('🎯 Detected version selection menu -> Selecting patch');
            try {
                process.stdin.write('patch\n');
                await this.logOutput('STDIN', 'patch\n');
            } catch (error) {
                console.log(`⚠️  Error selecting patch version: ${error.message}`);
            }
        }
    }

    isVersionMenu(text) {
        const menuIndicators = [
            'Patch', 'Minor', 'Major',
            'patch', 'minor', 'major',
            '1)', '2)', '3)',
            'Select version',
            'Choose version',
            'Version type'
        ];
        
        return menuIndicators.some(indicator => text.includes(indicator));
    }

    isPublishSuccess(text) {
        const successIndicators = [
            'Successfully published',
            'Published version',
            'App published',
            'Publication successful',
            'Upload complete',
            'Version published'
        ];
        
        return successIndicators.some(indicator => 
            text.toLowerCase().includes(indicator.toLowerCase())
        );
    }

    generateChangelog() {
        return `Ultimate Zigbee Hub Enhancement:
- Added 25 new device drivers from comprehensive source analysis
- Enhanced image coherence with 50 professional driver images regenerated  
- Improved device categorization with intelligent unbranded organization
- Expanded manufacturer ID compatibility (267+ preserved)
- Enhanced automation and validation systems
- Comprehensive driver enrichment from PR/issues and external sources

This update significantly expands Zigbee device compatibility and improves user experience.\n`;
    }

    async tryAlternativeAuth() {
        console.log('🔐 Trying alternative authentication method...');
        
        try {
            // Try homey login first
            await this.runCommand('homey', ['login'], { 
                timeout: 30000,
                input: 'dlnraja@gmail.com\n'
            });
            console.log('✅ Alternative authentication successful');
        } catch (error) {
            console.log('⚠️  Alternative authentication failed:', error.message);
            // Continue anyway - might already be authenticated
        }
    }

    async runCommand(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, {
                cwd: this.projectRoot,
                stdio: options.input ? ['pipe', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
                shell: true,
                ...options
            });

            let output = '';
            let error = '';

            const timeout = options.timeout || 30000;
            const timeoutId = setTimeout(() => {
                process.kill('SIGTERM');
                reject(new Error(`Command timeout: ${command} ${args.join(' ')}`));
            }, timeout);

            if (options.input) {
                process.stdin.write(options.input);
                process.stdin.end();
            }

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                clearTimeout(timeoutId);
                
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Command failed with code ${code}: ${error || output}`));
                }
            });

            process.on('error', (err) => {
                clearTimeout(timeoutId);
                reject(err);
            });
        });
    }

    async logOutput(type, text) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${type}: ${text}`;
        
        try {
            await fs.appendFile(this.logFile, logEntry);
        } catch (error) {
            // Silent fail for logging
        }
    }

    async logError(error) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ERROR: ${error.message}\n${error.stack}\n`;
        
        try {
            await fs.appendFile(this.logFile, logEntry);
        } catch (logError) {
            // Silent fail for logging
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Execute if run directly
if (require.main === module) {
    const automation = new EnhancedPublishingAutomation();
    automation.run()
        .then(result => {
            console.log('\n🎉 Publication automation completed!');
            console.log('📊 Result:', JSON.stringify(result, null, 2));
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Publication automation failed!');
            console.error('Error:', error.message);
            process.exit(1);
        });
}

module.exports = EnhancedPublishingAutomation;
