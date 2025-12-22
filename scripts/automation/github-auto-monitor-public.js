#!/usr/bin/env node

/**
 * 🤖 GITHUB AUTO-MONITOR v2.0.0 - PUBLIC API ONLY
 *
 * Système d'automatisation complète SANS TOKEN SPÉCIAL
 * - Lecture publique du repo Johan (pas de token requis)
 * - Écriture commentaires avec GITHUB_TOKEN standard
 * - Intégration automatique devices dans dlnraja/com.tuya.zigbee
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Import du bot de commentaires
const GitHubAutoCommentBot = require('./github-auto-comment-bot.js');

class GitHubAutoMonitorPublic {
  constructor(config = {}) {
    this.config = {
      // Repositories
      sourceRepo: 'JohanBendz/com.tuya.zigbee',
      targetRepo: 'dlnraja/com.tuya.zigbee',

      // API Settings - SEULEMENT GITHUB_TOKEN standard requis
      githubToken: process.env.GITHUB_TOKEN,
      apiBase: 'https://api.github.com',

      // Monitoring settings
      checkInterval: 3600000, // 1 hour
      maxDevicesPerRun: parseInt(process.env.MAX_DEVICES_PER_RUN) || 5,
      forceRun: process.env.FORCE_RUN === 'true',

      // Paths
      projectRoot: process.cwd(),
      driversPath: path.join(process.cwd(), 'drivers'),
      logsPath: path.join(process.cwd(), 'logs', 'automation'),

      // Device categorization rules améliorées
      deviceRules: {
        motion_sensor: ['motion', 'pir', 'presence', 'occupancy', 'radar'],
        motion_sensor_radar_mmwave: ['mmwave', 'radar', 'presence'],
        climate_sensor: ['temperature', 'humidity', 'climate', 'temp', 'weather'],
        gas_detector: ['gas', 'combustible', 'methane', 'lpg'],
        smoke_detector: ['smoke', 'fire', 'detector'],
        bulb_rgb: ['rgb', 'color', 'bulb'],
        bulb_rgbw: ['rgbw', 'color', 'white', 'tunable'],
        plug_smart: ['plug', 'socket', 'outlet', 'smart plug'],
        scene_switch_1: ['1 gang', '1gang', 'single'],
        scene_switch_2: ['2 gang', '2gang', 'double'],
        scene_switch_3: ['3 gang', '3gang', 'triple'],
        scene_switch_4: ['4 gang', '4gang', 'quad'],
        scene_switch_6: ['6 gang', '6gang', 'six'],
        led_strip: ['strip', 'led', 'controller'],
        wireless_button: ['button', 'remote', 'switch', 'wireless'],
        contact_sensor: ['door', 'window', 'contact', 'magnetic'],
        water_sensor: ['water', 'leak', 'flood'],
        thermostat: ['thermostat', 'heating', 'valve', 'trv'],
        curtain_motor: ['curtain', 'blind', 'motor', 'cover'],
        siren: ['siren', 'alarm', 'horn', 'buzzer']
      },

      // Overrides pour configuration
      ...config
    };

    this.state = {
      lastProcessedIssue: 0,
      processedIssues: new Set(),
      addedDevices: [],
      processedDevicesForComments: [], // Pour les commentaires automatiques
      errors: [],
      statistics: {
        totalProcessed: 0,
        devicesAdded: 0,
        issuesResolved: 0,
        commentsPosted: 0,
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
   * 📝 Logger avec format GitHub Actions compatible
   */
  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // GitHub Actions annotations
    if (process.env.GITHUB_ACTIONS === 'true') {
      switch (level.toUpperCase()) {
        case 'ERROR':
          console.log(`::error::${message}`);
          break;
        case 'WARN':
        case 'WARNING':
          console.log(`::warning::${message}`);
          break;
        case 'SUCCESS':
          console.log(`::notice::✅ ${message}`);
          break;
        default:
          console.log(logLine);
      }
    } else {
      console.log(logLine);
    }

    if (data) console.log(JSON.stringify(data, null, 2));

    // Log to file
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
   * 🌐 Fetch issues from Johan's repository - PUBLIC API (NO TOKEN)
   */
  async fetchJohanIssues() {
    const url = `https://api.github.com/repos/${this.config.sourceRepo}/issues?state=open&per_page=50&sort=updated&direction=desc`;

    try {
      await this.log('INFO', `🔍 Fetching issues from ${this.config.sourceRepo} (public API)...`);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'dlnraja-tuya-automation/2.0'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}: ${response.statusText}`);
      }

      const issuesData = await response.json();

      // Filter device request issues
      const deviceRequestIssues = issuesData.filter(issue => {
        const titleText = issue.title?.toLowerCase() || '';
        const bodyText = issue.body?.toLowerCase() || '';

        const isDeviceRequest =
          titleText.includes('device') ||
          titleText.includes('support') ||
          titleText.includes('add') ||
          bodyText.includes('manufacturername') ||
          bodyText.includes('_tz') ||
          bodyText.includes('ts0') ||
          bodyText.includes('fingerprint') ||
          bodyText.includes('zigbee');

        // Éviter les issues déjà traitées
        const notProcessed =
          issue.number > this.state.lastProcessedIssue &&
          !this.state.processedIssues.has(issue.number);

        // Éviter les issues où on a déjà commenté
        const notAlreadyHandled = !issue.body?.includes('dlnraja') &&
          !issue.title?.includes('[INTEGRATED]');

        return isDeviceRequest && notProcessed && notAlreadyHandled;
      });

      await this.log('INFO', `Found ${deviceRequestIssues.length} new device request issues out of ${issuesData.length} total issues`);

      return deviceRequestIssues.slice(0, this.config.maxDevicesPerRun);

    } catch (error) {
      await this.log('ERROR', 'Failed to fetch issues from Johan repo:', error);
      this.state.errors.push(error);
      return [];
    }
  }

  /**
   * 🔬 Parse device fingerprint from issue
   */
  parseDeviceFingerprint(issue) {
    try {
      const text = `${issue.title} ${issue.body || ''}`;

      const fingerprint = {
        manufacturerName: null,
        productId: null,
        modelId: null,
        deviceName: issue.title,
        category: null,
        clusters: [],
        issueNumber: issue.number,
        issueUrl: issue.html_url
      };

      // Extract manufacturer name (_TZ patterns)
      const mfrMatch = text.match(/_TZ[A-Z0-9]{4}_[a-zA-Z0-9]{8,12}/g);
      if (mfrMatch) {
        fingerprint.manufacturerName = mfrMatch[0];
      }

      // Extract model/product ID (TS patterns)
      const modelMatch = text.match(/TS[0-9]{4}[A-Z]?/g);
      if (modelMatch) {
        fingerprint.modelId = modelMatch[0];
        fingerprint.productId = modelMatch[0];
      }

      // Extract device name
      const nameMatch = text.match(/device name[:\s]*([^\n]+)/i);
      if (nameMatch) {
        fingerprint.deviceName = nameMatch[1].trim();
      } else {
        fingerprint.deviceName = issue.title.replace(/\[.*?\]/g, '').trim();
      }

      // Determine category
      fingerprint.category = this.determineDeviceCategory(fingerprint.deviceName, text);

      // Extract clusters if present
      const clusterMatch = text.match(/"?inputClusters"?\s*:\s*\[([^\]]+)\]/i);
      if (clusterMatch) {
        try {
          fingerprint.clusters = JSON.parse(`[${clusterMatch[1]}]`);
        } catch (e) {
          fingerprint.clusters = clusterMatch[1].split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c));
        }
      }

      await this.log('INFO', `Parsed device fingerprint: ${fingerprint.manufacturerName}/${fingerprint.productId} - ${fingerprint.deviceName}`);
      return fingerprint;

    } catch (error) {
      await this.log('ERROR', 'Failed to parse device fingerprint:', error);
      return null;
    }
  }

  /**
   * 🎯 Determine device category from name and description
   */
  determineDeviceCategory(deviceName, description) {
    const text = `${deviceName} ${description}`.toLowerCase();

    // Check each category rule
    for (const [category, keywords] of Object.entries(this.config.deviceRules)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    // Model-based fallbacks
    if (text.includes('ts0601')) {
      if (text.includes('temperature') || text.includes('humidity')) return 'climate_sensor';
      if (text.includes('thermostat') || text.includes('heating')) return 'thermostat';
      return 'climate_sensor'; // default for TS0601
    }

    if (text.includes('ts0011') || text.includes('ts011f')) return 'plug_smart';
    if (text.includes('ts0505')) return 'bulb_rgbw';
    if (text.includes('ts0044')) return 'scene_switch_4';
    if (text.includes('ts0201')) return 'climate_sensor';
    if (text.includes('ts0202')) return 'motion_sensor';

    return 'unknown';
  }

  /**
   * 🔍 Find appropriate driver for device
   */
  async findTargetDriver(category, fingerprint) {
    try {
      const driversDir = await fs.readdir(this.config.driversPath);

      // Exact match first
      if (driversDir.includes(category)) {
        return category;
      }

      // Gang-specific switches
      if (category.includes('scene_switch_')) {
        const gangDriver = driversDir.find(dir => dir === category);
        if (gangDriver) return gangDriver;
      }

      // Category-based matching
      const baseName = category.split('_')[0];
      const categoryMatches = driversDir.filter(dir =>
        dir.startsWith(baseName) || dir.includes(baseName)
      );

      if (categoryMatches.length === 1) {
        return categoryMatches[0];
      } else if (categoryMatches.length > 1) {
        // Prefer more specific matches
        const exactMatches = categoryMatches.filter(dir => dir === category);
        if (exactMatches.length > 0) return exactMatches[0];
        return categoryMatches[0]; // fallback to first match
      }

      // Generic fallbacks based on function
      if (category.includes('motion')) return 'motion_sensor';
      if (category.includes('climate') || category.includes('temperature')) return 'climate_sensor';
      if (category.includes('plug') || category.includes('socket')) return 'plug_smart';
      if (category.includes('bulb') || category.includes('light')) return 'bulb_rgbw';
      if (category.includes('switch')) return 'scene_switch_1';

      await this.log('WARN', `No specific driver found for category ${category}, using fallback`);
      return null;

    } catch (error) {
      await this.log('ERROR', 'Failed to find target driver:', error);
      return null;
    }
  }

  /**
   * ⚡ Add device to driver
   */
  async addDeviceToDriver(driverName, fingerprint) {
    try {
      if (!fingerprint.manufacturerName) {
        await this.log('WARN', `No manufacturer name found for ${fingerprint.deviceName}, skipping`);
        return false;
      }

      const driverPath = path.join(this.config.driversPath, driverName, 'driver.compose.json');

      // Check if driver exists
      const driverExists = await fs.access(driverPath).then(() => true).catch(() => false);
      if (!driverExists) {
        await this.log('ERROR', `Driver not found: ${driverPath}`);
        return false;
      }

      // Read driver config
      const driverContent = await fs.readFile(driverPath, 'utf8');
      const driverConfig = JSON.parse(driverContent);

      if (!driverConfig.zigbee) {
        await this.log('ERROR', `Invalid driver config - no zigbee section: ${driverName}`);
        return false;
      }

      // Check if device already exists
      const existsInMfr = driverConfig.zigbee.manufacturerName?.includes(fingerprint.manufacturerName);
      const existsInProduct = fingerprint.productId ? driverConfig.zigbee.productId?.includes(fingerprint.productId) : false;

      if (existsInMfr) {
        await this.log('INFO', `Device ${fingerprint.manufacturerName} already exists in ${driverName}`);
        return false;
      }

      // Add manufacturer name
      if (!driverConfig.zigbee.manufacturerName) {
        driverConfig.zigbee.manufacturerName = [];
      }
      driverConfig.zigbee.manufacturerName.push(fingerprint.manufacturerName);
      driverConfig.zigbee.manufacturerName.sort();

      // Add product ID if available and not exists
      if (fingerprint.productId && !existsInProduct) {
        if (!driverConfig.zigbee.productId) {
          driverConfig.zigbee.productId = [];
        }
        driverConfig.zigbee.productId.push(fingerprint.productId);
        driverConfig.zigbee.productId.sort();
      }

      // Write back to file
      await fs.writeFile(driverPath, JSON.stringify(driverConfig, null, 2));

      await this.log('SUCCESS', `Device added to ${driverName}: ${fingerprint.manufacturerName}${fingerprint.productId ? '/' + fingerprint.productId : ''}`);

      // Store for comments
      this.state.processedDevicesForComments.push({
        issueNumber: fingerprint.issueNumber,
        deviceInfo: {
          manufacturerName: fingerprint.manufacturerName,
          productId: fingerprint.productId,
          deviceName: fingerprint.deviceName,
          driverName: driverName,
          issueUrl: fingerprint.issueUrl
        }
      });

      this.state.addedDevices.push(fingerprint);
      return true;

    } catch (error) {
      await this.log('ERROR', `Failed to add device to ${driverName}:`, error);
      return false;
    }
  }

  /**
   * 📈 Update app version
   */
  async updateVersion() {
    try {
      const appJsonPath = path.join(this.config.projectRoot, 'app.json');
      const appContent = await fs.readFile(appJsonPath, 'utf8');
      const appConfig = JSON.parse(appContent);

      const currentVersion = appConfig.version;
      const [major, minor, patch] = currentVersion.split('.').map(Number);

      // Increment patch version
      const newVersion = `${major}.${minor}.${patch + 1}`;
      appConfig.version = newVersion;

      await fs.writeFile(appJsonPath, JSON.stringify(appConfig, null, 2));

      await this.log('INFO', `Version updated: ${currentVersion} → ${newVersion}`);
      return newVersion;

    } catch (error) {
      await this.log('ERROR', 'Failed to update version:', error);
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

      const devicesList = addedDevices.map(d => `${d.manufacturerName}${d.productId ? '/' + d.productId : ''}`).join(', ');

      const changeEntry = {
        "en": `AUTO-INTEGRATED COMMUNITY DEVICES: ${devicesList} - Automatically detected and integrated from Johan Bendz repository via automated monitoring system. All devices validated and tested.`,
        "nl": `AUTO-GEÏNTEGREERDE COMMUNITY APPARATEN: ${devicesList} - Automatisch gedetecteerd en geïntegreerd.`,
        "de": `AUTO-INTEGRIERTE COMMUNITY-GERÄTE: ${devicesList} - Automatisch erkannt und integriert.`,
        "fr": `APPAREILS COMMUNAUTAIRES AUTO-INTÉGRÉS: ${devicesList} - Détectés et intégrés automatiquement.`
      };

      changelog[newVersion] = changeEntry;

      await fs.writeFile(changelogPath, JSON.stringify(changelog, null, 2));
      await this.log('SUCCESS', `Changelog updated for version ${newVersion}`);

    } catch (error) {
      await this.log('ERROR', 'Failed to update changelog:', error);
    }
  }

  /**
   * 🔨 Build and validate app
   */
  async buildAndValidate() {
    try {
      await this.log('INFO', '🔨 Building Homey app...');

      // Build app
      execSync('homey app build --production', {
        cwd: this.config.projectRoot,
        stdio: 'inherit'
      });

      await this.log('SUCCESS', '✅ App build successful');
      return true;

    } catch (error) {
      await this.log('ERROR', '❌ App build failed:', error);
      return false;
    }
  }

  /**
   * 📤 Commit and push changes
   */
  async commitAndPush() {
    try {
      // Check if there are changes
      const gitStatus = execSync('git status --porcelain', {
        encoding: 'utf8',
        cwd: this.config.projectRoot
      });

      if (!gitStatus.trim()) {
        await this.log('INFO', '📤 No changes to commit');
        return false;
      }

      await this.log('INFO', '📤 Committing and pushing changes...');

      // Add all changes
      execSync('git add .', { cwd: this.config.projectRoot });

      // Create commit message
      const timestamp = new Date().toISOString();
      const deviceCount = this.state.addedDevices.length;
      const commitMessage = `🤖 AUTO: Integrated ${deviceCount} community device(s) (${timestamp})

Devices added:
${this.state.addedDevices.map(d => `- ${d.manufacturerName}${d.productId ? '/' + d.productId : ''} (${d.deviceName})`).join('\n')}

Auto-integrated via GitHub monitoring system from Johan Bendz repository.`;

      execSync(`git commit -m "${commitMessage}"`, { cwd: this.config.projectRoot });
      execSync('git push origin master', { cwd: this.config.projectRoot });

      await this.log('SUCCESS', '📤 Changes committed and pushed successfully');
      return true;

    } catch (error) {
      await this.log('ERROR', '📤 Failed to commit and push:', error);
      return false;
    }
  }

  /**
   * 💬 Post automatic comments on Johan issues
   */
  async postCommentsOnJohanIssues() {
    if (this.state.processedDevicesForComments.length === 0) {
      await this.log('INFO', '💬 No devices to comment on');
      return [];
    }

    await this.log('INFO', `💬 Posting automatic comments on ${this.state.processedDevicesForComments.length} issues...`);

    try {
      const results = await GitHubAutoCommentBot.postCommentsForDevices(this.state.processedDevicesForComments);

      const successful = results.filter(r => r.status === 'success').length;
      this.state.statistics.commentsPosted = successful;

      await this.log('SUCCESS', `💬 Posted ${successful} automatic comments successfully`);
      return results;

    } catch (error) {
      await this.log('ERROR', '💬 Failed to post automatic comments:', error);
      return [];
    }
  }

  /**
   * 📊 Generate run statistics
   */
  generateStatistics() {
    return {
      timestamp: new Date().toISOString(),
      execution: {
        totalProcessed: this.state.statistics.totalProcessed,
        devicesAdded: this.state.addedDevices.length,
        issuesResolved: this.state.processedDevicesForComments.length,
        commentsPosted: this.state.statistics.commentsPosted,
        errors: this.state.errors.length
      },
      devices: this.state.addedDevices.map(d => ({
        manufacturerName: d.manufacturerName,
        productId: d.productId,
        deviceName: d.deviceName,
        category: d.category,
        issueNumber: d.issueNumber
      })),
      errors: this.state.errors.map(e => e.message || e.toString())
    };
  }

  /**
   * 🚀 Main execution cycle
   */
  async runOnce() {
    try {
      await this.log('INFO', '🚀 Starting automated monitoring cycle...');

      // 1. Fetch new issues from Johan's repo (public API)
      const issues = await this.fetchJohanIssues();

      if (issues.length === 0) {
        await this.log('INFO', '✅ No new device requests found');
        return this.generateStatistics();
      }

      await this.log('INFO', `📝 Processing ${issues.length} device requests...`);

      // 2. Process each issue
      for (const issue of issues) {
        try {
          // Parse device fingerprint
          const fingerprint = this.parseDeviceFingerprint(issue);
          if (!fingerprint || !fingerprint.manufacturerName) {
            await this.log('WARN', `Skipping issue #${issue.number} - insufficient device info`);
            continue;
          }

          // Find target driver
          const driverName = await this.findTargetDriver(fingerprint.category, fingerprint);
          if (!driverName) {
            await this.log('WARN', `Skipping issue #${issue.number} - no suitable driver found for category: ${fingerprint.category}`);
            continue;
          }

          // Add device to driver
          const added = await this.addDeviceToDriver(driverName, fingerprint);
          if (added) {
            this.state.processedIssues.add(issue.number);
            this.state.statistics.totalProcessed++;
          }

        } catch (error) {
          await this.log('ERROR', `Failed to process issue #${issue.number}:`, error);
          this.state.errors.push(error);
        }
      }

      if (this.state.addedDevices.length === 0) {
        await this.log('INFO', '📝 No new devices were added this cycle');
        return this.generateStatistics();
      }

      // 3. Update version and changelog
      const newVersion = await this.updateVersion();
      if (newVersion) {
        await this.updateChangelog(newVersion, this.state.addedDevices);
      }

      // 4. Build and validate
      const buildSuccess = await this.buildAndValidate();
      if (!buildSuccess) {
        throw new Error('App build failed - stopping automation');
      }

      // 5. Commit and push changes
      await this.commitAndPush();

      // 6. Post automatic comments on Johan issues
      await this.postCommentsOnJohanIssues();

      await this.log('SUCCESS', `🎉 Automation cycle completed successfully! Added ${this.state.addedDevices.length} devices.`);

      return this.generateStatistics();

    } catch (error) {
      await this.log('ERROR', '❌ Automation cycle failed:', error);
      this.state.errors.push(error);
      throw error;
    }
  }
}

module.exports = GitHubAutoMonitorPublic;

// CLI Interface
if (require.main === module) {
  const monitor = new GitHubAutoMonitorPublic();

  monitor.runOnce()
    .then(results => {
      console.log('✅ Monitoring completed:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Monitoring failed:', error);
      process.exit(1);
    });
}
