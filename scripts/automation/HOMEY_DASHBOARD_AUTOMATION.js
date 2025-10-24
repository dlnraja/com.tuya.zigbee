#!/usr/bin/env node

/**
 * 🖱️ HOMEY DASHBOARD AUTOMATION
 * 
 * Automatise les interactions avec le Homey Developer Dashboard:
 * - Login automatique
 * - Promotion builds draft → test
 * - Monitoring statuts
 * - Screenshots
 * 
 * Utilise Puppeteer pour automatisation browser
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class HomeyDashboardAutomation {
  constructor(options = {}) {
    this.dashboardUrl = 'https://tools.developer.homey.app/';
    this.appId = options.appId || process.env.HOMEY_APP_ID || 'com.dlnraja.tuya.zigbee';
    this.headless = options.headless !== undefined ? options.headless : false;
    this.screenshotsDir = path.join(__dirname, '../../docs/screenshots');
    
    // Créer dossier screenshots si nécessaire
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  async init() {
    console.log('🚀 Initializing Homey Dashboard Automation...');
    
    this.browser = await puppeteer.launch({
      headless: this.headless,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Set user agent
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );
    
    console.log('✅ Browser initialized');
  }

  async login(email, password) {
    console.log('🔐 Logging in to Homey Dashboard...');
    
    await this.page.goto(this.dashboardUrl, { waitUntil: 'networkidle2' });
    
    try {
      // Attendre form de login
      await this.page.waitForSelector('input[type="email"], input[name="email"]', {
        timeout: 10000
      });
      
      // Remplir credentials
      await this.page.type('input[type="email"], input[name="email"]', email);
      await this.page.type('input[type="password"], input[name="password"]', password);
      
      // Click login button
      await this.page.click('button[type="submit"], button:contains("Log in")');
      
      // Attendre navigation
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      console.log('✅ Logged in successfully!');
      
      // Screenshot de confirmation
      await this.takeScreenshot('login-success.png');
      
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      await this.takeScreenshot('login-error.png');
      return false;
    }
  }

  async navigateToApp() {
    console.log(`📱 Navigating to app: ${this.appId}...`);
    
    const appUrl = `${this.dashboardUrl}apps/app/${this.appId}`;
    await this.page.goto(appUrl, { waitUntil: 'networkidle2' });
    
    // Attendre que la page charge
    await this.page.waitForSelector('.app-builds, .builds-list', {
      timeout: 10000
    });
    
    console.log('✅ App page loaded');
  }

  async getLatestBuildStatus() {
    console.log('📊 Getting latest build status...');
    
    await this.navigateToApp();
    
    try {
      const status = await this.page.evaluate(() => {
        // Chercher premier build dans la liste
        const buildRow = document.querySelector(
          '.build-row:first-child, .builds-list tr:first-of-type'
        );
        
        if (!buildRow) return null;
        
        return {
          version: buildRow.querySelector('.build-version, .version')?.textContent.trim(),
          status: buildRow.querySelector('.build-status, .status')?.textContent.trim(),
          channel: buildRow.querySelector('.build-channel, .channel')?.textContent.trim(),
          date: buildRow.querySelector('.build-date, .date')?.textContent.trim(),
          id: buildRow.getAttribute('data-build-id')
        };
      });
      
      if (status) {
        console.log('📊 Latest Build:');
        console.log(`  Version: ${status.version}`);
        console.log(`  Status: ${status.status}`);
        console.log(`  Channel: ${status.channel}`);
        console.log(`  Date: ${status.date}`);
        
        await this.takeScreenshot('build-status.png');
        
        return status;
      } else {
        console.log('⚠️ No builds found');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting build status:', error.message);
      await this.takeScreenshot('build-status-error.png');
      return null;
    }
  }

  async promoteToTest() {
    console.log('🚀 Promoting latest build to TEST channel...');
    
    await this.navigateToApp();
    
    try {
      // Chercher le bouton d'actions
      const actionButton = await this.page.$(
        '.build-row:first-child .build-actions button, .builds-list tr:first-of-type .actions button'
      );
      
      if (!actionButton) {
        console.log('⚠️ Actions button not found');
        return false;
      }
      
      // Cliquer sur actions
      await actionButton.click();
      await this.page.waitForTimeout(1000);
      
      // Chercher option "Promote to Test"
      const promoteButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons.find(btn => 
          btn.textContent.toLowerCase().includes('promote') &&
          btn.textContent.toLowerCase().includes('test')
        );
      });
      
      if (promoteButton) {
        await promoteButton.click();
        
        // Attendre modal de confirmation si existe
        await this.page.waitForTimeout(1000);
        
        const confirmButton = await this.page.$(
          'button.confirm, button.btn-primary, button:contains("Confirm")'
        );
        
        if (confirmButton) {
          await confirmButton.click();
        }
        
        // Attendre que promotion soit complète
        await this.page.waitForTimeout(2000);
        
        console.log('✅ Build promoted to TEST channel!');
        
        // Screenshot de confirmation
        await this.takeScreenshot('promoted-to-test.png');
        
        return true;
      } else {
        console.log('⚠️ Promote button not found - build may already be on TEST');
        await this.takeScreenshot('promote-not-available.png');
        return false;
      }
    } catch (error) {
      console.error('❌ Error promoting build:', error.message);
      await this.takeScreenshot('promote-error.png');
      return false;
    }
  }

  async getAllBuilds() {
    console.log('📋 Getting all builds...');
    
    await this.navigateToApp();
    
    try {
      const builds = await this.page.evaluate(() => {
        const buildRows = Array.from(
          document.querySelectorAll('.build-row, .builds-list tr')
        );
        
        return buildRows.map(row => ({
          version: row.querySelector('.build-version, .version')?.textContent.trim(),
          status: row.querySelector('.build-status, .status')?.textContent.trim(),
          channel: row.querySelector('.build-channel, .channel')?.textContent.trim(),
          date: row.querySelector('.build-date, .date')?.textContent.trim()
        })).filter(build => build.version);
      });
      
      console.log(`📊 Found ${builds.length} builds`);
      
      builds.forEach((build, i) => {
        console.log(`  ${i + 1}. ${build.version} - ${build.status} (${build.channel})`);
      });
      
      return builds;
    } catch (error) {
      console.error('❌ Error getting builds:', error.message);
      return [];
    }
  }

  async takeScreenshot(filename) {
    const filepath = path.join(this.screenshotsDir, filename);
    
    try {
      await this.page.screenshot({
        path: filepath,
        fullPage: true
      });
      
      console.log(`📸 Screenshot saved: ${filename}`);
    } catch (error) {
      console.error(`❌ Screenshot error: ${error.message}`);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }
}

// CLI Usage
if (require.main === module) {
  const action = process.argv[2];
  
  const automation = new HomeyDashboardAutomation({
    headless: process.env.HEADLESS === 'true'
  });
  
  async function main() {
    try {
      await automation.init();
      
      const logged = await automation.login(
        process.env.HOMEY_EMAIL,
        process.env.HOMEY_PASSWORD
      );
      
      if (!logged) {
        console.error('❌ Login failed');
        process.exit(1);
      }
      
      switch (action) {
        case 'status':
          await automation.getLatestBuildStatus();
          break;
          
        case 'promote':
          const promoted = await automation.promoteToTest();
          process.exit(promoted ? 0 : 1);
          break;
          
        case 'list':
          await automation.getAllBuilds();
          break;
          
        default:
          console.log('Usage: node HOMEY_DASHBOARD_AUTOMATION.js [status|promote|list]');
          break;
      }
      
    } finally {
      await automation.close();
    }
  }
  
  main().catch(error => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  });
}

module.exports = HomeyDashboardAutomation;
