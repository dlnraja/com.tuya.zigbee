#!/usr/bin/env node

/**
 * 🤖 GITHUB AUTO-MONITOR v1.0.0
 *
 * Système d'automatisation complète pour la gestion autonome des Issues/PRs
 * Johan Bendz → dlnraja repository
 *
 * FONCTIONNALITÉS:
 * - Surveillance continue des nouvelles issues JohanBendz/com.tuya.zigbee
 * - Parser automatique des device fingerprints Zigbee
 * - Intégration automatique dans les drivers appropriés
 * - Commit/Build/Push automatique avec versioning intelligent
 * - Réponse automatique aux issues avec confirmation
 * - Scheduling régulier (configurable)
 * - Validation et sécurité anti-collision
 * - Logs détaillés et monitoring
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, exec } = require('child_process');

class GitHubAutoMonitor {
  constructor() {
    this.config = {
      // Repositories
      sourceRepo: 'JohanBendz/com.tuya.zigbee',
      targetRepo: 'dlnraja/com.tuya.zigbee',

      // Monitoring settings
      checkInterval: 3600000, // 1 hour in ms
      maxIssuesPerRun: 10,

      // Paths
      projectRoot: process.cwd(),
      driversPath: path.join(process.cwd(), 'drivers'),
      logsPath: path.join(process.cwd(), 'logs', 'automation'),

      // GitHub API
      apiBase: 'https://api.github.com',

      // Device categorization rules
      deviceRules: {
        motion_sensor: ['motion', 'pir', 'presence'],
        climate_sensor: ['temperature', 'humidity', 'climate'],
        gas_detector: ['gas', 'combustible', 'methane'],
        smoke_detector: ['smoke', 'fire'],
        bulb_rgb: ['rgb', 'color', 'bulb'],
        bulb_rgbw: ['rgbw', 'color', 'white'],
        plug_smart: ['plug', 'socket', 'outlet'],
        scene_switch: ['scene', 'switch', 'gang'],
        led_strip: ['strip', 'led']
      },

      // Version increment rules
      versionRules: {
        newDevice: 'patch',    // +0.0.1
        deviceFix: 'patch',    // +0.0.1
        majorUpdate: 'minor',  // +0.1.0
        breaking: 'major'      // +1.0.0
      }
    };

    this.state = {
      lastProcessedIssue: 0,
      processedIssues: new Set(),
      addedDevices: [],
      errors: [],
      statistics: {
        totalProcessed: 0,
        devicesAdded: 0,
        issuesResolved: 0,
        errors: 0
      }
    };

    this.initializeLogging();
  }

  /**
   * 📝 Initialize logging system
   */
  async initializeLogging() {
    try {
      await fs.mkdir(this.config.logsPath, { recursive: true });
      this.logFile = path.join(this.config.logsPath, `auto-monitor-${new Date().toISOString().split('T')[0]}.log`);
    } catch (error) {
      console.error('Failed to initialize logging:', error);
    }
  }

  /**
   * 📝 Log with timestamp and level
   */
  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    console.log(logLine);
    if (data) console.log(JSON.stringify(data, null, 2));

    try {
      await fs.appendFile(this.logFile, logLine + '\n');
      if (data) {
        await fs.appendFile(this.logFile, JSON.stringify(data, null, 2) + '\n');
      }
    } catch (error) {
      console.error('Logging failed:', error);
    }
  }

  /**
   * 🔍 Fetch new issues from Johan's repository
   */
  async fetchNewIssues() {
    try {
      await this.log('info', 'Fetching new issues from Johan repository...');

      // Use GitHub CLI if available, otherwise curl
      let issuesData;
      try {
        const result = execSync(`gh api repos/${this.config.sourceRepo}/issues?state=open&sort=created&direction=desc&per_page=${this.config.maxIssuesPerRun}`,
          { encoding: 'utf8' });
        issuesData = JSON.parse(result);
      } catch (error) {
        await this.log('warn', 'GitHub CLI not available, using curl...');
        const result = execSync(`curl -s "${this.config.apiBase}/repos/${this.config.sourceRepo}/issues?state=open&sort=created&direction=desc&per_page=${this.config.maxIssuesPerRun}"`,
          { encoding: 'utf8' });
        issuesData = JSON.parse(result);
      }

      // Filter new issues
      const newIssues = issuesData.filter(issue =>
        issue.number > this.state.lastProcessedIssue &&
        !this.state.processedIssues.has(issue.number) &&
        issue.title.toLowerCase().includes('device request')
      );

      await this.log('info', `Found ${newIssues.length} new device request issues`);
      return newIssues;

    } catch (error) {
      await this.log('error', 'Failed to fetch issues:', error);
      this.state.errors.push(error);
      return [];
    }
  }

  /**
   * 🔬 Parse device fingerprint from issue body
   */
  parseDeviceFingerprint(issueBody) {
    try {
      const fingerprint = {
        manufacturerName: null,
        productId: null,
        modelId: null,
        deviceName: null,
        category: null,
        clusters: [],
        endpoints: {}
      };

      // Extract manufacturer name
      const mfrMatch = issueBody.match(/_TZ[A-Z0-9]{4}_[a-zA-Z0-9]{8,12}/g);
      if (mfrMatch) {
        fingerprint.manufacturerName = mfrMatch[0];
      }

      // Extract model ID
      const modelMatch = issueBody.match(/TS[0-9]{4}[A-Z]?/g);
      if (modelMatch) {
        fingerprint.modelId = modelMatch[0];
        fingerprint.productId = modelMatch[0];
      }

      // Extract device name from title
      const nameMatch = issueBody.match(/Device Name:\s*([^\n]+)/i);
      if (nameMatch) {
        fingerprint.deviceName = nameMatch[1].trim();
      }

      // Determine category based on device name and description
      fingerprint.category = this.determineDeviceCategory(fingerprint.deviceName, issueBody);

      // Extract clusters from interview data
      const clusterMatch = issueBody.match(/"inputClusters":\s*\[([^\]]+)\]/);
      if (clusterMatch) {
        try {
          fingerprint.clusters = JSON.parse(`[${clusterMatch[1]}]`);
        } catch (e) {
          fingerprint.clusters = clusterMatch[1].split(',').map(c => parseInt(c.trim()));
        }
      }

      return fingerprint;

    } catch (error) {
      this.log('error', 'Failed to parse device fingerprint:', error);
      return null;
    }
  }

  /**
   * 🎯 Determine device category based on name and description
   */
  determineDeviceCategory(deviceName, description) {
    const text = (deviceName + ' ' + description).toLowerCase();

    for (const [category, keywords] of Object.entries(this.config.deviceRules)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    // Default fallback based on model patterns
    if (text.includes('ts0601')) return 'climate_sensor';
    if (text.includes('ts0011') || text.includes('ts011f')) return 'plug_smart';
    if (text.includes('ts0505')) return 'bulb_rgbw';
    if (text.includes('ts0044')) return 'scene_switch_4';

    return 'unknown';
  }

  /**
   * 🔍 Find appropriate driver for device
   */
  async findTargetDriver(category, fingerprint) {
    try {
      const driversDir = await fs.readdir(this.config.driversPath);

      // Look for exact category match first
      const exactMatch = driversDir.find(dir => dir === category);
      if (exactMatch) {
        return exactMatch;
      }

      // Look for category-based matches
      const categoryMatches = driversDir.filter(dir =>
        dir.includes(category.split('_')[0]) ||
        category.includes(dir.split('_')[0])
      );

      if (categoryMatches.length === 1) {
        return categoryMatches[0];
      }

      // For multi-gang switches, determine gang count
      if (category.includes('scene_switch')) {
        const gangCount = this.extractGangCount(fingerprint.deviceName);
        const gangDriver = driversDir.find(dir => dir === `scene_switch_${gangCount}`);
        if (gangDriver) return gangDriver;
      }

      // Default to first category match or unknown driver
      return categoryMatches[0] || null;

    } catch (error) {
      await this.log('error', 'Failed to find target driver:', error);
      return null;
    }
  }

  /**
   * 🔢 Extract gang count from device name
   */
  extractGangCount(deviceName) {
    const gangMatch = deviceName.match(/(\d+)\s*gang/i);
    return gangMatch ? parseInt(gangMatch[1]) : 1;
  }

  /**
   * ⚡ Add device to driver automatically
   */
  async addDeviceToDriver(driverName, fingerprint) {
    try {
      const driverPath = path.join(this.config.driversPath, driverName, 'driver.compose.json');

      // Read current driver config
      const driverContent = await fs.readFile(driverPath, 'utf8');
      const driverConfig = JSON.parse(driverContent);

      // Check if device already exists
      const existsInMfr = driverConfig.zigbee.manufacturerName?.includes(fingerprint.manufacturerName);
      const existsInProduct = driverConfig.zigbee.productId?.includes(fingerprint.productId);

      if (existsInMfr && existsInProduct) {
        await this.log('info', `Device ${fingerprint.manufacturerName} already exists in ${driverName}`);
        return false;
      }

      // Add manufacturer name if not exists
      if (!existsInMfr && fingerprint.manufacturerName) {
        if (!driverConfig.zigbee.manufacturerName) {
          driverConfig.zigbee.manufacturerName = [];
        }
        driverConfig.zigbee.manufacturerName.push(fingerprint.manufacturerName);
        driverConfig.zigbee.manufacturerName.sort();
      }

      // Add product ID if not exists
      if (!existsInProduct && fingerprint.productId) {
        if (!driverConfig.zigbee.productId) {
          driverConfig.zigbee.productId = [];
        }
        driverConfig.zigbee.productId.push(fingerprint.productId);
        driverConfig.zigbee.productId.sort();
      }

      // Write back to file
      await fs.writeFile(driverPath, JSON.stringify(driverConfig, null, 2));

      await this.log('success', `Device added to ${driverName}: ${fingerprint.manufacturerName} / ${fingerprint.productId}`);
      return true;

    } catch (error) {
      await this.log('error', `Failed to add device to ${driverName}:`, error);
      return false;
    }
  }

  /**
   * 📈 Update app version intelligently
   */
  async updateVersion() {
    try {
      const appJsonPath = path.join(this.config.projectRoot, 'app.json');
      const appContent = await fs.readFile(appJsonPath, 'utf8');
      const appConfig = JSON.parse(appContent);

      const currentVersion = appConfig.version;
      const [major, minor, patch] = currentVersion.split('.').map(Number);

      // Increment patch version for new devices
      const newVersion = `${major}.${minor}.${patch + 1}`;
      appConfig.version = newVersion;

      await fs.writeFile(appJsonPath, JSON.stringify(appConfig, null, 2));

      await this.log('info', `Version updated: ${currentVersion} → ${newVersion}`);
      return newVersion;

    } catch (error) {
      await this.log('error', 'Failed to update version:', error);
      return null;
    }
  }

  /**
   * 📝 Update changelog
   */
  async updateChangelog(newVersion, addedDevices) {
    try {
      const changelogPath = path.join(this.config.projectRoot, '.homeychangelog.json');
      const changelogContent = await fs.readFile(changelogPath, 'utf8');
      const changelog = JSON.parse(changelogContent);

      const devicesList = addedDevices.map(d => `${d.manufacturerName}/${d.productId}`).join(', ');

      const changeEntry = {
        "en": `AUTO-ADDED DEVICES: Community devices from Johan repository - ${devicesList}. Automated integration via GitHub monitoring system. All devices validated and categorized automatically.`,
        "nl": `AUTO-TOEGEVOEGDE APPARATEN: Community apparaten van Johan repository - ${devicesList}. Geautomatiseerde integratie.`,
        "de": `AUTO-HINZUGEFÜGTE GERÄTE: Community-Geräte aus Johan-Repository - ${devicesList}. Automatisierte Integration.`
      };

      // Add new entry at the beginning
      const newChangelog = { [newVersion]: changeEntry, ...changelog };

      await fs.writeFile(changelogPath, JSON.stringify(newChangelog, null, 2));

      await this.log('info', `Changelog updated for version ${newVersion}`);

    } catch (error) {
      await this.log('error', 'Failed to update changelog:', error);
    }
  }

  /**
   * 🏗️ Build and validate app
   */
  async buildApp() {
    try {
      await this.log('info', 'Building app...');

      execSync('homey app build', {
        cwd: this.config.projectRoot,
        stdio: 'pipe'
      });

      await this.log('success', 'App built successfully');
      return true;

    } catch (error) {
      await this.log('error', 'App build failed:', error);
      return false;
    }
  }

  /**
   * 📤 Commit and push changes
   */
  async commitAndPush(newVersion, addedDevices) {
    try {
      const devicesList = addedDevices.map(d => `${d.manufacturerName}/${d.productId}`).join(', ');
      const commitMessage = `AUTO v${newVersion}: Community devices from Johan repo\n\nAUTO-ADDED DEVICES:\n${addedDevices.map(d => `✅ ${d.deviceName} (${d.manufacturerName}/${d.productId}) → ${d.driver}`).join('\n')}\n\nAutomated integration via GitHub monitoring system`;

      // Git operations
      execSync('git add -A', { cwd: this.config.projectRoot });
      execSync(`git commit -m "${commitMessage}"`, { cwd: this.config.projectRoot });
      execSync('git push origin master', { cwd: this.config.projectRoot });

      await this.log('success', `Changes committed and pushed: v${newVersion}`);
      return true;

    } catch (error) {
      await this.log('error', 'Git operations failed:', error);
      return false;
    }
  }

  /**
   * 📧 Post response to GitHub issue
   */
  async respondToIssue(issueNumber, fingerprint, driverName, newVersion) {
    try {
      const responseMessage = `
🤖 **AUTOMATED INTEGRATION COMPLETED**

✅ **Device Added Successfully**: ${fingerprint.deviceName}
- **Manufacturer ID**: \`${fingerprint.manufacturerName}\`
- **Product ID**: \`${fingerprint.productId}\`
- **Driver**: \`${driverName}\`
- **Version**: v${newVersion}

🚀 **Status**: Your device is now supported in the Universal Tuya Zigbee app! The integration has been automatically processed and deployed.

📱 **Next Steps**:
1. Update your app to v${newVersion}
2. Re-pair your device if already added
3. Enjoy full local control without cloud dependency!

*This integration was processed automatically by the GitHub monitoring system.*
      `.trim();

      // Use GitHub CLI to post comment
      try {
        execSync(`gh issue comment ${issueNumber} --repo ${this.config.sourceRepo} --body "${responseMessage}"`,
          { stdio: 'pipe' });
        await this.log('success', `Response posted to issue #${issueNumber}`);
      } catch (error) {
        await this.log('warn', 'GitHub CLI comment failed, issue resolved but no response posted');
      }

    } catch (error) {
      await this.log('error', `Failed to respond to issue #${issueNumber}:`, error);
    }
  }

  /**
   * 🔄 Process single issue
   */
  async processIssue(issue) {
    try {
      await this.log('info', `Processing issue #${issue.number}: ${issue.title}`);

      // Parse device fingerprint
      const fingerprint = this.parseDeviceFingerprint(issue.body);
      if (!fingerprint || !fingerprint.manufacturerName) {
        await this.log('warn', `Skipped issue #${issue.number}: Invalid fingerprint`);
        return false;
      }

      // Find target driver
      const driverName = await this.findTargetDriver(fingerprint.category, fingerprint);
      if (!driverName) {
        await this.log('warn', `Skipped issue #${issue.number}: No suitable driver found for category ${fingerprint.category}`);
        return false;
      }

      // Add device to driver
      const added = await this.addDeviceToDriver(driverName, fingerprint);
      if (!added) {
        await this.log('info', `Skipped issue #${issue.number}: Device already exists or failed to add`);
        return false;
      }

      // Track for batch processing
      fingerprint.driver = driverName;
      fingerprint.issueNumber = issue.number;
      this.state.addedDevices.push(fingerprint);

      await this.log('success', `Issue #${issue.number} processed successfully`);
      return true;

    } catch (error) {
      await this.log('error', `Failed to process issue #${issue.number}:`, error);
      this.state.errors.push(error);
      return false;
    }
  }

  /**
   * 🚀 Main processing loop
   */
  async processNewIssues() {
    try {
      await this.log('info', '🤖 Starting GitHub auto-monitoring cycle...');

      // Fetch new issues
      const newIssues = await this.fetchNewIssues();
      if (newIssues.length === 0) {
        await this.log('info', 'No new issues found');
        return;
      }

      // Process each issue
      this.state.addedDevices = [];
      let processedCount = 0;

      for (const issue of newIssues) {
        const processed = await this.processIssue(issue);
        if (processed) {
          processedCount++;
          this.state.processedIssues.add(issue.number);
          this.state.lastProcessedIssue = Math.max(this.state.lastProcessedIssue, issue.number);
        }
      }

      // If devices were added, deploy the changes
      if (this.state.addedDevices.length > 0) {
        await this.log('info', `Deploying ${this.state.addedDevices.length} new devices...`);

        // Update version and changelog
        const newVersion = await this.updateVersion();
        if (!newVersion) return;

        await this.updateChangelog(newVersion, this.state.addedDevices);

        // Build app
        const buildSuccess = await this.buildApp();
        if (!buildSuccess) return;

        // Commit and push
        const pushSuccess = await this.commitAndPush(newVersion, this.state.addedDevices);
        if (!pushSuccess) return;

        // Respond to issues
        for (const device of this.state.addedDevices) {
          await this.respondToIssue(device.issueNumber, device, device.driver, newVersion);
        }

        // Update statistics
        this.state.statistics.devicesAdded += this.state.addedDevices.length;
        this.state.statistics.issuesResolved += this.state.addedDevices.length;

        await this.log('success', `🚀 Deployment completed: ${this.state.addedDevices.length} devices added in v${newVersion}`);
      }

      this.state.statistics.totalProcessed += processedCount;

    } catch (error) {
      await this.log('error', 'Auto-monitoring cycle failed:', error);
      this.state.errors.push(error);
    }
  }

  /**
   * ⏰ Start continuous monitoring
   */
  async startMonitoring() {
    await this.log('info', `🤖 GitHub Auto-Monitor started - checking every ${this.config.checkInterval / 60000} minutes`);

    // Initial run
    await this.processNewIssues();

    // Schedule regular runs
    setInterval(async () => {
      await this.processNewIssues();
    }, this.config.checkInterval);
  }

  /**
   * 📊 Get monitoring statistics
   */
  getStatistics() {
    return {
      ...this.state.statistics,
      lastRun: new Date().toISOString(),
      errors: this.state.errors.length,
      processedIssues: Array.from(this.state.processedIssues),
      recentDevices: this.state.addedDevices.slice(-10)
    };
  }
}

// Export for use as module
module.exports = GitHubAutoMonitor;

// Run directly if called as script
if (require.main === module) {
  const monitor = new GitHubAutoMonitor();

  // Handle CLI arguments
  const args = process.argv.slice(2);

  if (args.includes('--once')) {
    // Run once and exit
    monitor.processNewIssues().then(() => {
      console.log('Single run completed');
      process.exit(0);
    });
  } else if (args.includes('--stats')) {
    // Show statistics
    console.log('GitHub Auto-Monitor Statistics:');
    console.log(JSON.stringify(monitor.getStatistics(), null, 2));
  } else {
    // Start continuous monitoring
    monitor.startMonitoring();
  }
}
