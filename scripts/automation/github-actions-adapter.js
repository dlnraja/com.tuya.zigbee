#!/usr/bin/env node

/**
 * 🔧 GITHUB ACTIONS ADAPTER v1.0.0
 *
 * Adaptateur pour faire fonctionner le monitoring dans GitHub Actions
 * Gère les différences d'environnement entre local et cloud
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class GitHubActionsAdapter {
  constructor() {
    this.isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
    this.projectRoot = process.cwd();

    this.config = {
      maxDevicesPerRun: parseInt(process.env.MAX_DEVICES_PER_RUN || '5'),
      forceRun: process.env.FORCE_RUN === 'true',
      githubToken: process.env.GITHUB_TOKEN,
      johanToken: process.env.JOHAN_REPO_TOKEN || process.env.GITHUB_TOKEN
    };
  }

  /**
   * 📝 Logger adapté pour GitHub Actions
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();

    if (this.isGitHubActions) {
      // GitHub Actions logging avec annotations
      switch (level) {
        case 'ERROR':
          console.log(`::error::${message}`);
          break;
        case 'WARN':
          console.log(`::warning::${message}`);
          break;
        case 'SUCCESS':
          console.log(`::notice::✅ ${message}`);
          break;
        default:
          console.log(`📝 ${message}`);
      }
    } else {
      // Logging standard
      console.log(`[${timestamp}] [${level}] ${message}`);
    }

    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * 🔧 Configuration spécifique GitHub Actions
   */
  async setupGitHubActionsEnvironment() {
    if (!this.isGitHubActions) return;

    this.log('INFO', '🔧 Setting up GitHub Actions environment...');

    try {
      // Créer les répertoires nécessaires
      const directories = [
        'logs/automation',
        'backups/automation',
        'quarantine'
      ];

      for (const dir of directories) {
        await fs.mkdir(dir, { recursive: true });
        this.log('INFO', `📁 Created directory: ${dir}`);
      }

      // Configuration Git pour GitHub Actions
      execSync('git config --global user.name "GitHub Actions Bot"', { stdio: 'inherit' });
      execSync('git config --global user.email "actions@github.com"', { stdio: 'inherit' });

      // Vérifier les tokens
      if (!this.config.githubToken) {
        throw new Error('GITHUB_TOKEN is required for GitHub Actions');
      }

      this.log('SUCCESS', '🔧 GitHub Actions environment configured');

    } catch (error) {
      this.log('ERROR', '🔧 Failed to setup GitHub Actions environment', error);
      throw error;
    }
  }

  /**
   * ⚙️ Adapter les paramètres pour GitHub Actions
   */
  getAdaptedConfig() {
    const baseConfig = {
      projectRoot: this.projectRoot,
      maxDevicesPerRun: this.config.maxDevicesPerRun,
      forceRun: this.config.forceRun,
      githubActions: this.isGitHubActions
    };

    if (this.isGitHubActions) {
      // Configuration spécifique GitHub Actions
      return {
        ...baseConfig,
        // Utiliser GitHub API directement avec token
        githubApiToken: this.config.githubToken,
        johanRepoToken: this.config.johanToken,
        // Logging adapté
        logLevel: process.env.DEBUG_AUTOMATION ? 'DEBUG' : 'INFO',
        // Timeouts plus courts pour Actions
        requestTimeout: 30000,
        // Pas de monitoring continu en Actions
        runOnce: true
      };
    } else {
      // Configuration locale
      return {
        ...baseConfig,
        // Configuration locale standard
        logLevel: 'INFO',
        requestTimeout: 60000,
        runOnce: false
      };
    }
  }

  /**
   * 🎯 Exécution principale adaptée
   */
  async executeMonitoring() {
    await this.setupGitHubActionsEnvironment();

    const adaptedConfig = this.getAdaptedConfig();

    this.log('INFO', '🤖 Starting adapted monitoring execution...', {
      isGitHubActions: this.isGitHubActions,
      maxDevices: adaptedConfig.maxDevicesPerRun,
      forceRun: adaptedConfig.forceRun
    });

    // Importer et exécuter le monitor principal avec configuration adaptée
    const GitHubAutoMonitor = require('./github-auto-monitor.js');
    const monitor = new GitHubAutoMonitor(adaptedConfig);

    try {
      const result = await monitor.runOnce();

      this.log('SUCCESS', '🎉 Monitoring execution completed successfully', result);

      // Sortie spécifique GitHub Actions
      if (this.isGitHubActions) {
        console.log(`::set-output name=devices_processed::${result.devicesProcessed || 0}`);
        console.log(`::set-output name=issues_resolved::${result.issuesResolved || 0}`);
        console.log(`::set-output name=changes_made::${result.changesMade || false}`);
      }

      return result;

    } catch (error) {
      this.log('ERROR', '❌ Monitoring execution failed', error);

      if (this.isGitHubActions) {
        // Fail le job GitHub Actions
        process.exit(1);
      }

      throw error;
    }
  }

  /**
   * 📊 Génération de rapport pour GitHub Actions
   */
  async generateActionsReport(result) {
    if (!this.isGitHubActions) return;

    const report = {
      timestamp: new Date().toISOString(),
      execution: {
        trigger: process.env.GITHUB_EVENT_NAME || 'manual',
        runId: process.env.GITHUB_RUN_ID || 'unknown',
        sha: process.env.GITHUB_SHA || 'unknown'
      },
      results: result,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        maxDevicesPerRun: this.config.maxDevicesPerRun,
        forceRun: this.config.forceRun
      }
    };

    // Sauvegarder le rapport
    await fs.writeFile(
      'automation-execution-report.json',
      JSON.stringify(report, null, 2),
      'utf8'
    );

    this.log('INFO', '📊 Execution report generated', report);
  }

  /**
   * 🔍 Vérification des changements pour commit
   */
  async checkForChanges() {
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      const hasChanges = gitStatus.trim().length > 0;

      if (hasChanges) {
        this.log('SUCCESS', '📝 Changes detected for deployment', {
          files: gitStatus.split('\n').filter(line => line.trim())
        });
      } else {
        this.log('INFO', '✅ No changes detected');
      }

      return {
        hasChanges,
        files: gitStatus.split('\n').filter(line => line.trim())
      };

    } catch (error) {
      this.log('ERROR', '🔍 Failed to check git status', error);
      return { hasChanges: false, files: [] };
    }
  }

  /**
   * 🚀 Commit et push automatique (GitHub Actions seulement)
   */
  async autoCommitAndPush(changes) {
    if (!this.isGitHubActions || !changes.hasChanges) return false;

    try {
      // Staging des changements
      execSync('git add .', { stdio: 'inherit' });

      // Commit avec message détaillé
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const commitMessage = `🤖 AUTO: Device integration via GitHub Actions (${timestamp})

Files modified:
${changes.files.join('\n')}

Triggered by: ${process.env.GITHUB_EVENT_NAME || 'manual'}
Run ID: ${process.env.GITHUB_RUN_ID || 'unknown'}`;

      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

      // Push vers master
      execSync('git push origin master', { stdio: 'inherit' });

      this.log('SUCCESS', '🚀 Changes committed and pushed successfully');
      return true;

    } catch (error) {
      this.log('ERROR', '🚀 Failed to commit and push changes', error);
      throw error;
    }
  }
}

// Export pour utilisation dans d'autres modules
module.exports = GitHubActionsAdapter;

// Interface CLI
if (require.main === module) {
  const adapter = new GitHubActionsAdapter();

  const command = process.argv[2];

  switch (command) {
    case 'execute':
      adapter.executeMonitoring()
        .then(result => {
          return adapter.generateActionsReport(result);
        })
        .then(() => {
          console.log('🎉 Execution completed successfully');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Execution failed:', error);
          process.exit(1);
        });
      break;

    case 'check-changes':
      adapter.checkForChanges()
        .then(changes => {
          console.log(JSON.stringify(changes, null, 2));
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Failed to check changes:', error);
          process.exit(1);
        });
      break;

    default:
      console.log(`
🔧 GitHub Actions Adapter

Usage: node github-actions-adapter.js <command>

Commands:
  execute        - Run complete monitoring cycle adapted for GitHub Actions
  check-changes  - Check for git changes that need to be committed

Environment Variables:
  GITHUB_ACTIONS     - Set to 'true' when running in GitHub Actions
  MAX_DEVICES_PER_RUN - Maximum devices to process per run (default: 5)
  FORCE_RUN          - Force execution even if no new issues (default: false)
  GITHUB_TOKEN       - GitHub API token for authentication
  JOHAN_REPO_TOKEN   - Optional separate token for Johan's repository
      `);
  }
}
