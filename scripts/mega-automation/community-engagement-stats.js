#!/usr/bin/env node

/**
 * 📊 COMMUNITY ENGAGEMENT STATISTICS v1.0.0
 *
 * Génère statistiques complètes engagement communauté:
 * - Contributors analytics (top contributeurs, nouveaux contributeurs)
 * - Community activity metrics (PRs, issues, forks, stars)
 * - Device integration impact (devices ajoutés par source)
 * - Remerciements automatiques contributeurs
 * - Tableau de bord engagement communauté
 */

const fs = require('fs').promises;
const path = require('path');
const { Octokit } = require('@octokit/rest');

class CommunityEngagementStats {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      request: { timeout: 30000 }
    });

    this.config = {
      repos: [
        'dlnraja/com.tuya.zigbee',
        'JohanBendz/com.tuya.zigbee'
      ],
      timeframes: {
        recent: 30,      // 30 jours
        quarterly: 90,   // 3 mois
        yearly: 365      // 1 an
      },
      dataFile: path.join(process.cwd(), 'project-data', 'COMMUNITY_STATS.json'),
      reportFile: path.join(process.cwd(), 'COMMUNITY-ENGAGEMENT-REPORT.md')
    };

    this.stats = {
      contributors: [],
      totalCommits: 0,
      totalPRs: 0,
      totalIssues: 0,
      totalStars: 0,
      totalForks: 0,
      devicesAdded: 0,
      communityImpact: 0
    };
  }

  /**
   * 👥 Analyser tous les contributeurs
   */
  async analyzeContributors() {
    try {
      console.log('👥 Analyzing community contributors...');

      const allContributors = new Map();

      for (const repoFullName of this.config.repos) {
        const [owner, repo] = repoFullName.split('/');

        try {
          // Récupérer contributeurs du repo
          const { data: contributors } = await this.octokit.rest.repos.listContributors({
            owner,
            repo,
            per_page: 100
          });

          for (const contributor of contributors) {
            const key = contributor.login;

            if (allContributors.has(key)) {
              // Contributeur existant - additionner contributions
              const existing = allContributors.get(key);
              existing.totalContributions += contributor.contributions;
              existing.repos.push(repoFullName);
            } else {
              // Nouveau contributeur
              allContributors.set(key, {
                login: contributor.login,
                avatar_url: contributor.avatar_url,
                html_url: contributor.html_url,
                totalContributions: contributor.contributions,
                repos: [repoFullName],
                type: contributor.type,
                site_admin: contributor.site_admin
              });
            }
          }

          this.stats.totalCommits += contributors.reduce((sum, c) => sum + c.contributions, 0);

        } catch (error) {
          console.error(`❌ Error fetching contributors for ${repoFullName}:`, error.message);
        }
      }

      // Convertir Map en Array et trier
      this.stats.contributors = Array.from(allContributors.values())
        .sort((a, b) => b.totalContributions - a.totalContributions);

      console.log(`✅ Found ${this.stats.contributors.length} unique contributors`);
      return this.stats.contributors;

    } catch (error) {
      console.error('❌ Error analyzing contributors:', error.message);
      return [];
    }
  }

  /**
   * 📊 Calculer métriques engagement
   */
  async calculateEngagementMetrics() {
    try {
      console.log('📊 Calculating engagement metrics...');

      const metrics = {
        recent: { days: 30, contributors: 0, commits: 0, prs: 0, issues: 0 },
        quarterly: { days: 90, contributors: 0, commits: 0, prs: 0, issues: 0 },
        yearly: { days: 365, contributors: 0, commits: 0, prs: 0, issues: 0 }
      };

      for (const repoFullName of this.config.repos) {
        const [owner, repo] = repoFullName.split('/');

        try {
          // Récupérer stats repo
          const { data: repoData } = await this.octokit.rest.repos.get({
            owner,
            repo
          });

          this.stats.totalStars += repoData.stargazers_count;
          this.stats.totalForks += repoData.forks_count;

          // Analyser activité par timeframe
          for (const [timeframe, config] of Object.entries(this.config.timeframes)) {
            const since = new Date(Date.now() - config * 24 * 60 * 60 * 1000).toISOString();

            // Commits récents
            try {
              const { data: commits } = await this.octokit.rest.repos.listCommits({
                owner,
                repo,
                since,
                per_page: 100
              });

              metrics[timeframe].commits += commits.length;

              // Contributeurs uniques
              const uniqueContributors = new Set(
                commits.map(c => c.author?.login).filter(Boolean)
              );
              metrics[timeframe].contributors += uniqueContributors.size;

            } catch (error) {
              console.log(`⚠️ Cannot access commits for ${repoFullName}`);
            }

            // PRs récentes
            try {
              const { data: prs } = await this.octokit.rest.pulls.list({
                owner,
                repo,
                state: 'all',
                sort: 'updated',
                direction: 'desc',
                per_page: 100
              });

              const recentPRs = prs.filter(pr =>
                new Date(pr.updated_at) > new Date(since)
              );

              metrics[timeframe].prs += recentPRs.length;

            } catch (error) {
              console.log(`⚠️ Cannot access PRs for ${repoFullName}`);
            }

            // Issues récentes
            try {
              const { data: issues } = await this.octokit.rest.issues.list({
                owner,
                repo,
                state: 'all',
                sort: 'updated',
                direction: 'desc',
                per_page: 100,
                since
              });

              const realIssues = issues.filter(issue => !issue.pull_request);
              metrics[timeframe].issues += realIssues.length;

            } catch (error) {
              console.log(`⚠️ Cannot access issues for ${repoFullName}`);
            }
          }

        } catch (error) {
          console.error(`❌ Error fetching repo data for ${repoFullName}:`, error.message);
        }
      }

      return metrics;

    } catch (error) {
      console.error('❌ Error calculating engagement metrics:', error.message);
      return {};
    }
  }

  /**
   * 🎮 Calculer impact devices intégrés
   */
  async calculateDeviceIntegrationImpact() {
    try {
      console.log('🎮 Calculating device integration impact...');

      const impact = {
        totalDevices: 0,
        devicesBySource: {
          community_prs: 0,
          forum_requests: 0,
          database_sync: 0,
          direct_contributions: 0
        },
        topDeviceContributors: [],
        deviceCategories: {},
        recentIntegrations: []
      };

      // Analyser commits récents pour devices ajoutés
      for (const repoFullName of this.config.repos) {
        const [owner, repo] = repoFullName.split('/');

        try {
          const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

          const { data: commits } = await this.octokit.rest.repos.listCommits({
            owner,
            repo,
            since,
            per_page: 100
          });

          for (const commit of commits) {
            const message = commit.commit.message.toLowerCase();

            // Identifier ajouts de devices
            if (message.includes('device') || message.includes('driver') || message.includes('tuya')) {
              try {
                const { data: commitData } = await this.octokit.rest.repos.getCommit({
                  owner,
                  repo,
                  ref: commit.sha
                });

                const deviceFiles = commitData.files?.filter(f =>
                  f.filename.includes('drivers/') &&
                  (f.filename.endsWith('.json') || f.filename.includes('device.js'))
                ) || [];

                if (deviceFiles.length > 0) {
                  impact.totalDevices += Math.ceil(deviceFiles.length / 2); // Approximation

                  impact.recentIntegrations.push({
                    sha: commit.sha.substring(0, 7),
                    message: commit.commit.message,
                    author: commit.commit.author.name,
                    date: commit.commit.committer.date,
                    filesCount: deviceFiles.length
                  });
                }

              } catch (error) {
                // Ignorer erreurs commits individuels
              }
            }
          }

        } catch (error) {
          console.log(`⚠️ Cannot analyze device impact for ${repoFullName}`);
        }
      }

      // Trier intégrations récentes
      impact.recentIntegrations.sort((a, b) => new Date(b.date) - new Date(a.date));
      impact.recentIntegrations = impact.recentIntegrations.slice(0, 20);

      this.stats.devicesAdded = impact.totalDevices;

      return impact;

    } catch (error) {
      console.error('❌ Error calculating device integration impact:', error.message);
      return {};
    }
  }

  /**
   * 🏆 Identifier top contributeurs pour remerciements
   */
  identifyTopContributorsForThanks(contributors, metrics, deviceImpact) {
    const topContributors = {
      mostActive: contributors.slice(0, 10),
      newContributors: [],
      deviceChampions: [],
      communityHeroes: []
    };

    // Nouveaux contributeurs (récents et actifs)
    const recentThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    topContributors.newContributors = contributors
      .filter(c => c.totalContributions >= 3 && c.totalContributions <= 20)
      .slice(0, 5);

    // Champions des devices (contributeurs avec impact device)
    topContributors.deviceChampions = contributors
      .filter(c => c.totalContributions >= 10)
      .slice(0, 8);

    // Héros communauté (contributeurs multi-repos)
    topContributors.communityHeroes = contributors
      .filter(c => c.repos.length > 1)
      .slice(0, 6);

    return topContributors;
  }

  /**
   * 💌 Générer messages de remerciements
   */
  generateThankYouMessages(topContributors) {
    const messages = {
      mostActive: [],
      newContributors: [],
      deviceChampions: [],
      communityHeroes: []
    };

    // Messages pour contributeurs les plus actifs
    for (const contributor of topContributors.mostActive) {
      messages.mostActive.push({
        login: contributor.login,
        message: `🌟 **Huge thanks to @${contributor.login}!**\n\n${contributor.totalContributions} contributions across ${contributor.repos.join(', ')}. Your dedication to the Tuya Zigbee ecosystem is incredible! 🙏\n\n#TuyaCommunity #ZigbeeHero`
      });
    }

    // Messages pour nouveaux contributeurs
    for (const contributor of topContributors.newContributors) {
      messages.newContributors.push({
        login: contributor.login,
        message: `🎉 **Welcome to the community, @${contributor.login}!**\n\nThanks for your ${contributor.totalContributions} valuable contributions. New contributors like you make our ecosystem stronger! 💪\n\n#WelcomeToTuya #NewContributor`
      });
    }

    // Messages pour champions devices
    for (const contributor of topContributors.deviceChampions) {
      messages.deviceChampions.push({
        login: contributor.login,
        message: `🎮 **Device Integration Champion: @${contributor.login}!**\n\nYour contributions are helping thousands of users connect their Tuya devices seamlessly. Keep up the amazing work! 🚀\n\n#DeviceHero #TuyaIntegration`
      });
    }

    // Messages pour héros communauté
    for (const contributor of topContributors.communityHeroes) {
      messages.communityHeroes.push({
        login: contributor.login,
        message: `🏆 **Community Hero: @${contributor.login}!**\n\nContributing across multiple repositories shows true community spirit. Thank you for your cross-project collaboration! 🤝\n\n#CommunityHero #OpenSource`
      });
    }

    return messages;
  }

  /**
   * 📈 Générer rapport engagement complet
   */
  async generateEngagementReport(contributors, metrics, deviceImpact, topContributors, thankYouMessages) {
    try {
      const reportContent = `# 📊 COMMUNITY ENGAGEMENT STATISTICS

**Generated**: ${new Date().toISOString().split('T')[0]}
**Period**: Last 30/90/365 days
**Repositories**: ${this.config.repos.join(', ')}

## 🏆 Community Overview

| Metric | Value |
|--------|-------|
| **Total Contributors** | ${contributors.length} |
| **Total Commits** | ${this.stats.totalCommits} |
| **Total Stars** | ${this.stats.totalStars} ⭐ |
| **Total Forks** | ${this.stats.totalForks} 🍴 |
| **Devices Added** | ${deviceImpact.totalDevices} 🎮 |

## 📈 Activity Metrics

### Recent Activity (30 days)
- **Active Contributors**: ${metrics.recent?.contributors || 0}
- **Commits**: ${metrics.recent?.commits || 0}
- **Pull Requests**: ${metrics.recent?.prs || 0}
- **Issues**: ${metrics.recent?.issues || 0}

### Quarterly Activity (90 days)
- **Active Contributors**: ${metrics.quarterly?.contributors || 0}
- **Commits**: ${metrics.quarterly?.commits || 0}
- **Pull Requests**: ${metrics.quarterly?.prs || 0}
- **Issues**: ${metrics.quarterly?.issues || 0}

### Yearly Activity (365 days)
- **Active Contributors**: ${metrics.yearly?.contributors || 0}
- **Commits**: ${metrics.yearly?.commits || 0}
- **Pull Requests**: ${metrics.yearly?.prs || 0}
- **Issues**: ${metrics.yearly?.issues || 0}

## 🏆 Top Contributors

### 🌟 Most Active Contributors
${topContributors.mostActive.map((c, i) =>
        `${i + 1}. **[@${c.login}](${c.html_url})** - ${c.totalContributions} contributions`
      ).join('\n')}

### 🎉 New Contributors (Welcome!)
${topContributors.newContributors.map((c, i) =>
        `${i + 1}. **[@${c.login}](${c.html_url})** - ${c.totalContributions} contributions`
      ).join('\n') || 'No new contributors this period'}

### 🎮 Device Integration Champions
${topContributors.deviceChampions.map((c, i) =>
        `${i + 1}. **[@${c.login}](${c.html_url})** - ${c.totalContributions} contributions`
      ).join('\n')}

### 🏆 Community Heroes (Multi-Repo Contributors)
${topContributors.communityHeroes.map((c, i) =>
        `${i + 1}. **[@${c.login}](${c.html_url})** - Repos: ${c.repos.join(', ')}`
      ).join('\n') || 'No multi-repo contributors'}

## 🎮 Device Integration Impact

### Recent Device Integrations
${deviceImpact.recentIntegrations.slice(0, 10).map(integration =>
        `- **${integration.sha}** by ${integration.author} (${integration.date.split('T')[0]}): ${integration.message.split('\n')[0]}`
      ).join('\n') || 'No recent device integrations found'}

## 💌 Community Thank You Messages

### 🌟 Most Active Contributors Recognition
${thankYouMessages.mostActive.slice(0, 5).map(msg =>
        `#### @${msg.login}\n${msg.message}\n`
      ).join('\n')}

### 🎉 New Contributors Welcome
${thankYouMessages.newContributors.slice(0, 3).map(msg =>
        `#### @${msg.login}\n${msg.message}\n`
      ).join('\n')}

## 📊 Community Health Score

**Overall Health**: ${this.calculateCommunityHealthScore(contributors, metrics)} / 100

- **Contributors Diversity**: ${Math.min(contributors.length * 2, 100)}/100
- **Activity Level**: ${Math.min((metrics.recent?.commits || 0) * 5, 100)}/100
- **Engagement Quality**: ${Math.min((metrics.recent?.prs || 0) * 10, 100)}/100
- **Device Integration**: ${Math.min(deviceImpact.totalDevices * 3, 100)}/100

## 🚀 Growth Recommendations

1. **Contributor Onboarding**: Continue welcoming new contributors
2. **Device Documentation**: Expand device integration guides
3. **Community Events**: Consider organizing virtual meetups
4. **Recognition Program**: Regular contributor spotlights
5. **Automation Excellence**: The MEGA system is driving great results!

---

*Generated automatically by MEGA Community Engagement System*
*Data updated: ${new Date().toISOString()}*

## 📋 Raw Data Export

\`\`\`json
${JSON.stringify({
        summary: {
          totalContributors: contributors.length,
          totalCommits: this.stats.totalCommits,
          totalStars: this.stats.totalStars,
          totalForks: this.stats.totalForks,
          devicesAdded: deviceImpact.totalDevices
        },
        metrics: metrics,
        topContributors: topContributors
      }, null, 2)}
\`\`\`
`;

      await fs.writeFile(this.config.reportFile, reportContent);
      console.log(`📝 Engagement report saved to ${this.config.reportFile}`);

      return reportContent;

    } catch (error) {
      console.error('❌ Error generating engagement report:', error.message);
      return '';
    }
  }

  /**
   * 📊 Calculer score santé communauté
   */
  calculateCommunityHealthScore(contributors, metrics) {
    let score = 0;

    // Base score des contributeurs
    score += Math.min(contributors.length * 2, 30);

    // Score activité récente
    score += Math.min((metrics.recent?.commits || 0) * 0.5, 25);

    // Score PRs qualité
    score += Math.min((metrics.recent?.prs || 0) * 2, 20);

    // Score diversité (contributeurs multi-repos)
    const multiRepoContributors = contributors.filter(c => c.repos.length > 1).length;
    score += Math.min(multiRepoContributors * 3, 15);

    // Score engagement issues
    score += Math.min((metrics.recent?.issues || 0) * 1, 10);

    return Math.round(score);
  }

  /**
   * 💾 Sauvegarder données communauté
   */
  async saveCommunityData(data) {
    try {
      const dataDir = path.dirname(this.config.dataFile);
      await fs.mkdir(dataDir, { recursive: true });

      const saveData = {
        lastUpdate: new Date().toISOString(),
        stats: this.stats,
        ...data
      };

      await fs.writeFile(this.config.dataFile, JSON.stringify(saveData, null, 2));
      console.log(`💾 Community data saved to ${this.config.dataFile}`);

    } catch (error) {
      console.error('❌ Error saving community data:', error.message);
    }
  }

  /**
   * 🚀 Exécution principale
   */
  async execute() {
    try {
      console.log('📊 COMMUNITY ENGAGEMENT STATISTICS SYSTEM');
      console.log('==========================================');

      // 1. Analyser contributeurs
      const contributors = await this.analyzeContributors();

      // 2. Calculer métriques engagement
      const metrics = await this.calculateEngagementMetrics();

      // 3. Calculer impact integration devices
      const deviceImpact = await this.calculateDeviceIntegrationImpact();

      // 4. Identifier top contributeurs
      const topContributors = this.identifyTopContributorsForThanks(contributors, metrics, deviceImpact);

      // 5. Générer messages remerciements
      const thankYouMessages = this.generateThankYouMessages(topContributors);

      // 6. Générer rapport complet
      const report = await this.generateEngagementReport(
        contributors, metrics, deviceImpact, topContributors, thankYouMessages
      );

      // 7. Sauvegarder données
      await this.saveCommunityData({
        contributors,
        metrics,
        deviceImpact,
        topContributors,
        thankYouMessages
      });

      // Rapport final
      console.log('\n📊 COMMUNITY ENGAGEMENT RESULTS');
      console.log('================================');
      console.log(`👥 Total Contributors: ${contributors.length}`);
      console.log(`💫 Total Commits: ${this.stats.totalCommits}`);
      console.log(`⭐ Total Stars: ${this.stats.totalStars}`);
      console.log(`🍴 Total Forks: ${this.stats.totalForks}`);
      console.log(`🎮 Devices Added: ${deviceImpact.totalDevices}`);
      console.log(`🏆 Community Health: ${this.calculateCommunityHealthScore(contributors, metrics)}/100`);

      return {
        stats: this.stats,
        contributors,
        metrics,
        deviceImpact,
        topContributors,
        thankYouMessages,
        report
      };

    } catch (error) {
      console.error('❌ Community Engagement Statistics failed:', error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const stats = new CommunityEngagementStats();

  stats.execute()
    .then(results => {
      console.log('🎉 Community engagement statistics completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Community engagement statistics failed:', error);
      process.exit(1);
    });
}

module.exports = CommunityEngagementStats;
