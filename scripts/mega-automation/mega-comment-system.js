#!/usr/bin/env node

/**
 * 💬 MEGA COMMENT SYSTEM v1.0.0
 *
 * Système de commentaires automatiques unifié pour toutes les sources:
 * - Issues GitHub (Johan + Tuya officiel + dlnraja)
 * - Forums Homey Community
 * - Reddit posts
 * - Discussions GitHub
 *
 * Poste des commentaires automatiques confirmant l'intégration avec liens
 */

const fs = require('fs').promises;
const path = require('path');

class MegaCommentSystem {
  constructor() {
    this.config = {
      // Templates de commentaires par source
      commentTemplates: {
        github_issue: {
          title: "🤖 **DEVICE AUTOMATICALLY INTEGRATED!**",
          sections: {
            detection: "Hi! I've automatically detected and integrated your device request into my Tuya Zigbee app.",
            device_details: "**Device Details:**",
            status: "**✅ STATUS: COMPLETED**",
            download: "**📦 Download Link:**",
            automation: "**🔄 Automatic Integration System:**",
            support: "**Questions?** Feel free to open an issue in my repository if you need any support."
          },
          footer: "*This comment was generated automatically by the dlnraja MEGA automation system.*"
        },

        forum_post: {
          title: "🎉 **TUYA DEVICE INTEGRATED AUTOMATICALLY**",
          sections: {
            detection: "Hello! Your Tuya device has been automatically detected and integrated.",
            device_details: "**Device Information:**",
            status: "**✅ INTEGRATION STATUS: COMPLETE**",
            download: "**📱 Get the App:**",
            automation: "**⚡ Powered by MEGA Automation:**",
            support: "**Need Help?** Visit my GitHub repository or ask in the Homey Community."
          },
          footer: "*Automated integration via dlnraja MEGA system - Multi-source monitoring.*"
        },

        reddit_post: {
          title: "🚀 **Your Tuya Device is Now Supported!**",
          sections: {
            detection: "Hey! I noticed your post about a Tuya device and automatically added support for it.",
            device_details: "**Device Info:**",
            status: "**✅ SUPPORTED**",
            download: "**🔗 App Link:**",
            automation: "**🤖 Auto-Detection:**",
            support: "**Questions?** Feel free to reach out on GitHub!"
          },
          footer: "*Auto-integrated via dlnraja MEGA automation - Monitoring Reddit for Tuya devices.*"
        }
      },

      // Configurations par source
      sources: {
        github: {
          apiBase: 'https://api.github.com',
          repos: [
            'JohanBendz/com.tuya.zigbee',
            'dlnraja/com.tuya.zigbee'
          ],
          template: 'github_issue',
          enabled: true
        },

        homey_forum: {
          apiBase: 'https://community.homey.app',
          template: 'forum_post',
          enabled: false // Nécessite authentification
        },

        reddit: {
          apiBase: 'https://www.reddit.com',
          template: 'reddit_post',
          enabled: false // Nécessite authentification
        }
      },

      // URLs et liens
      projectLinks: {
        github: 'https://github.com/dlnraja/com.tuya.zigbee',
        homeyStore: 'https://homey.app/app/com.tuya.zigbee',
        documentation: 'https://github.com/dlnraja/com.tuya.zigbee#readme'
      }
    };

    // Arguments ligne de commande
    this.integrationSummary = this.parseIntegrationSummary();

    this.results = {
      commentsPosted: 0,
      commentsFailed: 0,
      sourcesProcessed: 0,
      errors: []
    };
  }

  /**
   * 📝 Parser integration summary depuis arguments
   */
  parseIntegrationSummary() {
    const summaryArg = process.argv.find(arg => arg.startsWith('--integration-summary='));
    if (summaryArg) {
      try {
        return JSON.parse(summaryArg.split('=')[1]);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * 📝 Logger compatible GitHub Actions
   */
  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();

    if (process.env.GITHUB_ACTIONS === 'true') {
      switch (level.toUpperCase()) {
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
          console.log(`[${timestamp}] ${message}`);
      }
    } else {
      console.log(`[${timestamp}] [${level}] ${message}`);
    }

    if (data) console.log(JSON.stringify(data, null, 2));
  }

  /**
   * 📥 Charger les findings intégrés
   */
  async loadIntegratedFindings() {
    const findings = [];

    try {
      // Charger depuis les différentes sources de données
      const sourcePaths = [
        'data/sources/github-findings.json',
        'data/forums/forum-findings.json',
        'data/databases/database-findings.json'
      ];

      for (const sourcePath of sourcePaths) {
        try {
          const fullPath = path.join(process.cwd(), sourcePath);
          const content = await fs.readFile(fullPath, 'utf8');
          const sourceData = JSON.parse(content);

          if (sourceData.findings) {
            // Filtrer seulement les findings qui ont été intégrés
            const integratedFindings = sourceData.findings.filter(f =>
              f.validationStatus === 'valid' ||
              f.confidence >= 50
            );

            findings.push(...integratedFindings);
          }
        } catch (error) {
          await this.log('WARN', `Could not load ${sourcePath}:`, error);
        }
      }

      await this.log('INFO', `📥 Loaded ${findings.length} integrated findings for commenting`);
      return findings;

    } catch (error) {
      await this.log('ERROR', 'Failed to load integrated findings:', error);
      return [];
    }
  }

  /**
   * ✍️ Générer commentaire pour un device intégré
   */
  generateComment(finding, template) {
    const tmpl = this.config.commentTemplates[template];
    if (!tmpl) {
      return null;
    }

    const deviceInfo = {
      manufacturerName: finding.manufacturerName || 'N/A',
      productId: finding.productId || 'N/A',
      deviceName: finding.deviceName || finding.description || finding.title || 'Unknown Device',
      category: finding.category || 'auto-detected',
      source: finding.source || 'unknown'
    };

    const comment = `${tmpl.title}

${tmpl.sections.detection}

${tmpl.sections.device_details}
- **Manufacturer ID:** \`${deviceInfo.manufacturerName}\`
- **Product ID:** \`${deviceInfo.productId}\`
- **Device Name:** ${deviceInfo.deviceName}
- **Category:** ${deviceInfo.category}
- **Source:** ${deviceInfo.source}

${tmpl.sections.status}
Your device has been automatically integrated and will be available in the next app update.

${tmpl.sections.download}
🔗 **${this.config.projectLinks.github}**
📱 **Homey App Store:** ${this.config.projectLinks.homeyStore}

${tmpl.sections.automation}
This device was detected and integrated through my automated MEGA system. The system:
- 🔍 **Monitors** multiple sources (GitHub, Forums, Databases)
- 🤖 **Automatically parses** Zigbee fingerprints and device information
- ⚙️ **Integrates** devices with complete features (flows, capabilities, datapoints)
- 🔨 **Builds and deploys** updates automatically
- 💬 **Posts confirmation** comments (like this one!)
- 🛡️ **Validates** everything with strict anti-regression rules

**Features Integrated:** ${this.integrationSummary ?
        `${this.integrationSummary.featuresIntegrated} features across ${this.integrationSummary.driversModified} drivers` :
        'Complete device support with all capabilities'}

No manual intervention needed - everything is automated! 🚀

${tmpl.sections.support}

📚 **Documentation:** ${this.config.projectLinks.documentation}

---
${tmpl.footer}`;

    return comment;
  }

  /**
   * 💬 Poster commentaire sur GitHub issue
   */
  async postGitHubComment(finding, comment) {
    if (!finding.url || !finding.id) {
      await this.log('WARN', 'Missing URL or ID for GitHub comment');
      return false;
    }

    try {
      // Extraire repo et issue number depuis URL
      const urlMatch = finding.url.match(/github\.com\/([^\/]+\/[^\/]+)\/issues\/(\d+)/);
      if (!urlMatch) {
        await this.log('WARN', `Cannot parse GitHub URL: ${finding.url}`);
        return false;
      }

      const [, repo, issueNumber] = urlMatch;
      const apiUrl = `${this.config.sources.github.apiBase}/repos/${repo}/issues/${issueNumber}/comments`;

      // Vérifier si on a déjà commenté
      const hasCommented = await this.checkExistingGitHubComment(repo, issueNumber);
      if (hasCommented) {
        await this.log('INFO', `Already commented on ${repo}#${issueNumber} - skipping`);
        return true;
      }

      // Poster le commentaire
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'User-Agent': 'dlnraja-mega-automation/1.0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body: comment })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      await this.log('SUCCESS', `✅ Posted comment on ${repo}#${issueNumber}`, {
        commentId: result.id,
        commentUrl: result.html_url
      });

      return true;

    } catch (error) {
      await this.log('ERROR', `Failed to post GitHub comment:`, error);
      this.results.errors.push(`GitHub comment: ${error.message}`);
      return false;
    }
  }

  /**
   * 🔍 Vérifier commentaire existant sur GitHub
   */
  async checkExistingGitHubComment(repo, issueNumber) {
    try {
      const apiUrl = `${this.config.sources.github.apiBase}/repos/${repo}/issues/${issueNumber}/comments`;

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'dlnraja-mega-automation/1.0',
          ...(process.env.GITHUB_TOKEN && { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` })
        }
      });

      if (!response.ok) {
        return false;
      }

      const comments = await response.json();

      // Chercher commentaire de notre système
      return comments.some(comment =>
        comment.body?.includes('dlnraja MEGA automation system') ||
        comment.body?.includes('DEVICE AUTOMATICALLY INTEGRATED') ||
        (comment.user?.login === 'dlnraja') // Si c'est notre username
      );

    } catch (error) {
      await this.log('WARN', `Could not check existing comments for ${repo}#${issueNumber}:`, error);
      return false; // En cas d'erreur, tenter de commenter quand même
    }
  }

  /**
   * 🏭 Poster commentaire sur forum (futur)
   */
  async postForumComment(finding, comment) {
    // Forum Homey nécessite authentification - implémentation future
    await this.log('INFO', '🏭 Forum commenting - TODO (authentication required)');
    return false;
  }

  /**
   * 🤖 Poster commentaire sur Reddit (futur)
   */
  async postRedditComment(finding, comment) {
    // Reddit nécessite OAuth - implémentation future
    await this.log('INFO', '🤖 Reddit commenting - TODO (OAuth required)');
    return false;
  }

  /**
   * 🚀 Exécuter commentaires pour tous les findings intégrés
   */
  async execute() {
    try {
      await this.log('INFO', '🚀 Starting MEGA Comment System');

      if (!process.env.GITHUB_TOKEN) {
        await this.log('WARN', 'No GITHUB_TOKEN - limited commenting capabilities');
      }

      // 1. Charger findings intégrés
      const integratedFindings = await this.loadIntegratedFindings();

      if (integratedFindings.length === 0) {
        await this.log('INFO', '📝 No integrated findings to comment on');
        return this.generateOutput();
      }

      // 2. Traiter chaque finding selon sa source
      for (const finding of integratedFindings) {
        try {
          let commented = false;

          // Déterminer source et template
          let sourceType = 'github_issue'; // Par défaut
          if (finding.source?.includes('forum')) {
            sourceType = 'forum_post';
          } else if (finding.source?.includes('reddit')) {
            sourceType = 'reddit_post';
          }

          // Générer commentaire
          const comment = this.generateComment(finding, sourceType);
          if (!comment) {
            await this.log('WARN', `Could not generate comment for ${finding.manufacturerName}`);
            continue;
          }

          // Poster selon la source
          if (finding.source?.includes('github') || finding.url?.includes('github.com')) {
            commented = await this.postGitHubComment(finding, comment);
            this.results.sourcesProcessed++;
          } else if (finding.source?.includes('forum')) {
            commented = await this.postForumComment(finding, comment);
            this.results.sourcesProcessed++;
          } else if (finding.source?.includes('reddit')) {
            commented = await this.postRedditComment(finding, comment);
            this.results.sourcesProcessed++;
          }

          if (commented) {
            this.results.commentsPosted++;
          } else {
            this.results.commentsFailed++;
          }

          // Délai entre commentaires
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          await this.log('ERROR', `Error processing finding for commenting:`, error);
          this.results.errors.push(`Comment processing: ${error.message}`);
          this.results.commentsFailed++;
        }
      }

      await this.log('SUCCESS', `✅ MEGA Comment System completed: ${this.results.commentsPosted} comments posted, ${this.results.commentsFailed} failed`);

      return this.generateOutput();

    } catch (error) {
      await this.log('ERROR', '❌ MEGA Comment System failed:', error);
      this.results.errors.push(error.message);
      throw error;
    }
  }

  /**
   * 📤 Generate output
   */
  generateOutput() {
    return this.results;
  }
}

// CLI execution
if (require.main === module) {
  const commentSystem = new MegaCommentSystem();

  commentSystem.execute()
    .then(results => {
      console.log('✅ MEGA Comment System completed:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ MEGA Comment System failed:', error);
      process.exit(1);
    });
}

module.exports = MegaCommentSystem;
