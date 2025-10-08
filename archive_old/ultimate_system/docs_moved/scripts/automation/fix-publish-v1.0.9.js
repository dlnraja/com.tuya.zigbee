#!/usr/bin/env node

/**
 * Automated fix for homey app publish v1.0.9 changelog prompt issue
 * Handles the hanging changelog question that prevents publishing
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class HomeyPublishFixer {
  constructor() {
    this.appVersion = '1.0.9';
    this.changelogText = `🌟 Ultimate Zigbee Hub v${this.appVersion} - Major Device Expansion 🌟

✅ NEW DEVICE SUPPORT:
- Radar Sensors: _TZE200_ztc6ggyl, _TZE204_qasjif9e, _TZE204_ijxvkhd0
- Soil Moisture: _TZE200_myd45weu, _TZE200_ga1maeof, _TZE284_aao3yzhs  
- Air Quality: _TZE200_yvx5lh6k, _TZE200_8ygsuhe1, _TZE200_mja3fuja
- Advanced Lighting: RGB controllers, tunable bulbs, LED strips
- Smart Locks & Curtains: Enhanced automation support

✅ IMPROVEMENTS:
- SDK 3 full compliance with optimized performance
- Enhanced device recognition algorithms
- Professional flow cards for all device types
- Improved local communication reliability
- Updated device database with 300+ new devices

✅ BUG FIXES:
- Fixed changelog prompt hanging issue
- Resolved validation errors
- Enhanced error handling and logging
- Improved pairing success rates

Total supported devices: 600+ from 50+ manufacturers`;
  }

  async fixPublish() {
    console.log('🔧 Fixing Homey App Publish v1.0.9...');
    
    try {
      // Update version to fix any cached issues
      await this.updateAppVersion();
      
      // Create automated publish script
      await this.createPublishScript();
      
      // Execute the publish with automated responses
      await this.executePublish();
      
      console.log('✅ Publishing process fixed and completed!');
      
    } catch (error) {
      console.error('❌ Fix failed:', error.message);
      process.exit(1);
    }
  }

  async updateAppVersion() {
    console.log('📝 Updating app version...');
    
    const appJsonPath = path.join(process.cwd(), 'app.json');
    const composeJsonPath = path.join(process.cwd(), '.homeycompose', 'app.json');
    
    // Update both app.json files
    for (const filePath of [appJsonPath, composeJsonPath]) {
      if (fs.existsSync(filePath)) {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        content.version = this.appVersion;
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        console.log(`✅ Updated ${filePath}`);
      }
    }
  }

  async createPublishScript() {
    console.log('📜 Creating automated publish script...');
    
    const scriptContent = `@echo off
echo Starting automated Homey app publish...
echo.
echo Changelog text will be automatically provided:
echo "${this.changelogText}"
echo.
timeout /t 3
echo ${this.changelogText} | homey app publish
if %ERRORLEVEL% NEQ 0 (
    echo Publishing failed, retrying with interactive mode...
    homey app publish --interactive
)
echo.
echo Publish completed!
pause`;

    const scriptPath = path.join(process.cwd(), 'scripts', 'automation', 'publish-automated.bat');
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
    fs.writeFileSync(scriptPath, scriptContent);
    
    console.log(`✅ Automated script created: ${scriptPath}`);
  }

  async executePublish() {
    console.log('🚀 Executing automated publish...');
    
    return new Promise((resolve, reject) => {
      const child = spawn('homey', ['app', 'publish'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        cwd: process.cwd()
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text.trim());
        
        // Detect changelog prompt and respond automatically
        if (text.includes('What\'s new in') || text.includes('Changelog')) {
          console.log('📝 Detected changelog prompt, responding automatically...');
          child.stdin.write(this.changelogText + '\n');
        }
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error(text.trim());
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Publish completed successfully!');
          resolve(output);
        } else {
          console.error(`❌ Publish failed with code ${code}`);
          reject(new Error(`Publish failed: ${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        console.error('❌ Spawn error:', error);
        reject(error);
      });

      // Set timeout to prevent hanging
      setTimeout(() => {
        child.kill();
        reject(new Error('Publish process timed out'));
      }, 300000); // 5 minutes timeout
    });
  }
}

// Execute if run directly
if (require.main === module) {
  const fixer = new HomeyPublishFixer();
  fixer.fixPublish().catch(console.error);
}

module.exports = HomeyPublishFixer;
