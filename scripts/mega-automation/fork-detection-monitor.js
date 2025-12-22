#!/usr/bin/env node

/**
 * 🌴 FORK DETECTION & MONITORING SYSTEM v1.0.0
 *
 * Détecte et surveille automatiquement:
 * - TOUS les forks actifs de JohanBendz/com.tuya.zigbee
 * - Nouveaux commits/PR/issues dans chaque fork
 * - Synchronisation bidirectionnelle
 * - Stats communauté et contributions
 */

const fs = require('fs').promises;
const path = require('path');
const { Octokit } = require('@octokit/rest');

class ForkDetectionMonitor {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      request: { timeout: 30000 }
    });

    this.config = {
      sourceRepo: {
        owner: 'JohanBendz',
        name: 'com.tuya.zigbee'
      },
      targetRepo: {
        owner: 'dlnraja',
        name: 'com.tuya.zigbee'
      },
      monitoring: {
        activeDaysThreshold: 30,    // Fork considéré actif si commit < 30j
        minStarsForPriority: 1,     // Forks prioritaires avec ≥1 étoiles
        maxForksToMonitor: 50,      // Limite surveillance
        syncInterval: 3600000       // 1h entre synchronisations
      },
      dataFile: path.join(process.cwd(), 'project-data', 'ACTIVE_FORKS.json')
    };

    this.stats = {
      totalForks: 0,
      activeForks: 0,
      priorityForks: 0,
      newCommits: 0,
      newPRs: 0,
      newIssues: 0,
      syncedContributions: 0
    };
  }

  /**
   * 🔍 Découverte complète des forks
   */
  async discoverAllForks() {
    try {
      console.log('🔍 Discovering all forks of JohanBendz/com.tuya.zigbee...');

      const allForks = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const { data: forks } = await this.octokit.rest.repos.listForks({
          owner: this.config.sourceRepo.owner,
          repo: this.config.sourceRepo.name,
          sort: 'newest',
          per_page: perPage,
          page: page
        });

        if (forks.length === 0) break;

        allForks.push(...forks);
        page++;

        if (forks.length < perPage) break; // Dernière page
      }

      this.stats.totalForks = allForks.length;
      console.log(`📊 Total forks discovered: ${allForks.length}`);

      return allForks;

    } catch (error) {
      console.error('❌ Error discovering forks:', error.message);
      return [];
    }
  }

  /**
   * ⚡ Analyser activité fork
   */
  async analyzeForkActivity(fork) {
    try {
      const analysis = {
        owner: fork.owner.login,
        name: fork.name,
        fullName: fork.full_name,
        stars: fork.stargazers_count,
        forks: fork.forks_count,
        size: fork.size,
        language: fork.language,
        createdAt: fork.created_at,
        updatedAt: fork.updated_at,
        pushedAt: fork.pushed_at,
        isActive: false,
        isPriority: false,
        recentCommits: [],
        openPRs: 0,
        openIssues: 0,
        lastActivity: null
      };

      // Vérifier commits récents
      const since = new Date(Date.now() - this.config.monitoring.activeDaysThreshold * 24 * 60 * 60 * 1000);

      try {
        const { data: commits } = await this.octokit.rest.repos.listCommits({
          owner: fork.owner.login,
          repo: fork.name,
          since: since.toISOString(),
          per_page: 10
        });

        analysis.recentCommits = commits;
        analysis.isActive = commits.length > 0;
        analysis.lastActivity = commits.length > 0 ? commits[0].commit.committer.date : null;

      } catch (error) {
        // Repo privé, supprimé, ou sans accès
        console.log(`⚠️ Cannot access commits for ${fork.full_name}: ${error.message}`);
        return analysis;
      }

      if (analysis.isActive) {
        // Compter PRs ouvertes
        try {
          const { data: prs } = await this.octokit.rest.pulls.list({
            owner: fork.owner.login,
            repo: fork.name,
            state: 'open',
            per_page: 100
          });
          analysis.openPRs = prs.length;
        } catch (error) {
          // Ignorer erreurs
        }

        // Compter issues ouvertes
        try {
          const { data: issues } = await this.octokit.rest.issues.list({
            owner: fork.owner.login,
            repo: fork.name,
            state: 'open',
            per_page: 100
          });
          // Exclure PRs (issues inclut PRs dans GitHub API)
          analysis.openIssues = issues.filter(issue => !issue.pull_request).length;
        } catch (error) {
          // Ignorer erreurs
        }
      }

      // Déterminer priorité
      analysis.isPriority = (
        analysis.isActive &&
        (analysis.stars >= this.config.monitoring.minStarsForPriority ||
          analysis.openPRs > 0 ||
          analysis.recentCommits.length > 3)
      );

      return analysis;

    } catch (error) {
      console.error(`❌ Error analyzing fork ${fork.full_name}:`, error.message);
      return null;
    }
  }

  /**
   * 🔄 Synchronisation bidirectionnelle
   */
  async syncForkContributions(forkAnalysis) {
    try {
      if (!forkAnalysis.isActive) return { synced: 0, contributions: [] };

      console.log(`🔄 Syncing contributions from ${forkAnalysis.fullName}...`);

      const contributions = [];

      // Analyser commits récents pour nouvelles contributions
      for (const commit of forkAnalysis.recentCommits) {
        const contribution = await this.analyzeCommitForContribution(
          forkAnalysis.owner,
          forkAnalysis.name,
          commit
        );

        if (contribution) {
          contributions.push(contribution);
        }
      }

      // Traiter contributions valides
      let syncedCount = 0;
      for (const contribution of contributions) {
        if (await this.integrateContribution(contribution)) {
          syncedCount++;
          this.stats.syncedContributions++;
        }
      }

      return { synced: syncedCount, contributions };

    } catch (error) {
      console.error(`❌ Error syncing fork ${forkAnalysis.fullName}:`, error.message);
      return { synced: 0, contributions: [] };
    }
  }

  /**
   * 📋 Analyser commit pour contribution
   */
  async analyzeCommitForContribution(owner, repo, commit) {
    try {
      // Récupérer détails du commit
      const { data: commitDetails } = await this.octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: commit.sha
      });

      const contribution = {
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.committer.date,
        forkOwner: owner,
        forkRepo: repo,
        files: commitDetails.files || [],
        type: 'unknown',
        value: 0,
        canIntegrate: false
      };

      // Classifier type de contribution
      const modifiedFiles = contribution.files.map(f => f.filename);

      if (modifiedFiles.some(f => f.includes('/drivers/') && f.endsWith('.json'))) {
        contribution.type = 'driver_config';
        contribution.value = 20;
      }

      if (modifiedFiles.some(f => f.includes('manufacturerName') || f.includes('productId'))) {
        contribution.type = 'device_fingerprints';
        contribution.value = 30;
      }

      if (modifiedFiles.some(f => f.endsWith('.png') || f.endsWith('.jpg'))) {
        contribution.type = 'device_images';
        contribution.value = 10;
      }

      if (modifiedFiles.some(f => f.includes('app.json') || f.includes('README'))) {
        contribution.type = 'documentation';
        contribution.value = 5;
      }

      // Vérifier si peut être intégré automatiquement
      contribution.canIntegrate = (
        contribution.value > 0 &&
        contribution.files.length <= 10 &&
        !contribution.message.toLowerCase().includes('wip') &&
        !contribution.message.toLowerCase().includes('test')
      );

      return contribution.value > 0 ? contribution : null;

    } catch (error) {
      console.error('❌ Error analyzing commit for contribution:', error.message);
      return null;
    }
  }

  /**
   * 🚀 Intégrer contribution
   */
  async integrateContribution(contribution) {
    try {
      if (!contribution.canIntegrate) return false;

      console.log(`🚀 Integrating contribution: ${contribution.type} from ${contribution.forkOwner}`);

      // Créer branch pour intégration
      const branchName = `auto-sync-${contribution.forkOwner}-${Date.now()}`;

      // Récupérer ref master du repo target
      const { data: masterRef } = await this.octokit.rest.git.getRef({
        owner: this.config.targetRepo.owner,
        repo: this.config.targetRepo.name,
        ref: 'heads/master'
      });

      // Créer nouvelle branch
      await this.octokit.rest.git.createRef({
        owner: this.config.targetRepo.owner,
        repo: this.config.targetRepo.name,
        ref: `refs/heads/${branchName}`,
        sha: masterRef.object.sha
      });

      // Appliquer changements fichier par fichier
      for (const file of contribution.files) {
        if (file.status === 'removed') continue;

        try {
          // Récupérer contenu du fichier du fork
          const { data: fileContent } = await this.octokit.rest.repos.getContents({
            owner: contribution.forkOwner,
            repo: contribution.forkRepo,
            path: file.filename,
            ref: contribution.sha
          });

          // Appliquer au repo target
          await this.octokit.rest.repos.createOrUpdateFileContents({
            owner: this.config.targetRepo.owner,
            repo: this.config.targetRepo.name,
            path: file.filename,
            message: `Auto-sync: ${contribution.message}\n\nFrom: ${contribution.forkOwner}/${contribution.forkRepo}\nCommit: ${contribution.sha}`,
            content: fileContent.content,
            branch: branchName
          });

        } catch (error) {
          console.error(`⚠️ Error integrating file ${file.filename}:`, error.message);
        }
      }

      // Créer PR pour review
      const { data: pr } = await this.octokit.rest.pulls.create({
        owner: this.config.targetRepo.owner,
        repo: this.config.targetRepo.name,
        title: `🔄 Auto-sync: ${contribution.type} from ${contribution.forkOwner}`,
        body: `🤖 **Automatic Fork Synchronization**

**Source**: ${contribution.forkOwner}/${contribution.forkRepo}
**Original Commit**: ${contribution.sha}
**Author**: ${contribution.author}
**Date**: ${contribution.date}

**Contribution Type**: ${contribution.type}
**Value Score**: ${contribution.value}
**Files Modified**: ${contribution.files.length}

**Original Message**:
${contribution.message}

---
*This PR was created automatically by the MEGA Fork Sync System.*
*Review and merge if the contribution is valuable.*`,
        head: branchName,
        base: 'master'
      });

      console.log(`✅ Created PR #${pr.number} for integration`);
      return true;

    } catch (error) {
      console.error('❌ Error integrating contribution:', error.message);
      return false;
    }
  }

  /**
   * 💾 Sauvegarder données forks
   */
  async saveForksData(forksData) {
    try {
      const dataDir = path.dirname(this.config.dataFile);
      await fs.mkdir(dataDir, { recursive: true });

      const data = {
        lastUpdate: new Date().toISOString(),
        stats: this.stats,
        config: this.config.monitoring,
        activeForks: forksData.filter(f => f && f.isActive),
        priorityForks: forksData.filter(f => f && f.isPriority),
        allForks: forksData.filter(f => f !== null)
      };

      await fs.writeFile(this.config.dataFile, JSON.stringify(data, null, 2));
      console.log(`💾 Saved ${data.allForks.length} forks data to ${this.config.dataFile}`);

    } catch (error) {
      console.error('❌ Error saving forks data:', error.message);
    }
  }

  /**
   * 📊 Générer rapport communauté
   */
  generateCommunityReport(forksData) {
    const activeForks = forksData.filter(f => f && f.isActive);
    const priorityForks = forksData.filter(f => f && f.isPriority);

    const report = {
      summary: {
        totalForks: this.stats.totalForks,
        activeForks: this.stats.activeForks,
        priorityForks: this.stats.priorityForks,
        totalCommits: this.stats.newCommits,
        totalPRs: this.stats.newPRs,
        totalIssues: this.stats.newIssues
      },
      topContributors: activeForks
        .sort((a, b) => b.recentCommits.length - a.recentCommits.length)
        .slice(0, 10)
        .map(f => ({
          owner: f.owner,
          commits: f.recentCommits.length,
          stars: f.stars,
          lastActivity: f.lastActivity
        })),
      mostActiveProjects: activeForks
        .sort((a, b) => (b.openPRs + b.openIssues) - (a.openPRs + a.openIssues))
        .slice(0, 10)
        .map(f => ({
          fullName: f.fullName,
          openPRs: f.openPRs,
          openIssues: f.openIssues,
          stars: f.stars
        }))
    };

    return report;
  }

  /**
   * 🚀 Exécution principale
   */
  async execute() {
    try {
      console.log('🌴 FORK DETECTION & MONITORING SYSTEM');
      console.log('=====================================');

      // Découvrir tous les forks
      const allForks = await this.discoverAllForks();

      if (allForks.length === 0) {
        console.log('⚠️ No forks found');
        return { stats: this.stats };
      }

      // Analyser activité de chaque fork
      console.log('⚡ Analyzing fork activity...');
      const forksData = [];

      for (const fork of allForks.slice(0, this.config.monitoring.maxForksToMonitor)) {
        const analysis = await this.analyzeForkActivity(fork);
        if (analysis) {
          forksData.push(analysis);

          if (analysis.isActive) {
            this.stats.activeForks++;
            this.stats.newCommits += analysis.recentCommits.length;
            this.stats.newPRs += analysis.openPRs;
            this.stats.newIssues += analysis.openIssues;
          }

          if (analysis.isPriority) {
            this.stats.priorityForks++;
          }
        }

        // Pause pour éviter rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Synchroniser contributions prioritaires
      console.log('🔄 Synchronizing priority fork contributions...');
      const priorityForks = forksData.filter(f => f.isPriority);

      for (const fork of priorityForks) {
        await this.syncForkContributions(fork);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Sauvegarder données
      await this.saveForksData(forksData);

      // Générer rapport
      const report = this.generateCommunityReport(forksData);

      // Affichage résultats
      console.log('\n📊 FORK MONITORING RESULTS');
      console.log('===========================');
      console.log(`🌴 Total forks: ${this.stats.totalForks}`);
      console.log(`⚡ Active forks: ${this.stats.activeForks}`);
      console.log(`⭐ Priority forks: ${this.stats.priorityForks}`);
      console.log(`📝 New commits: ${this.stats.newCommits}`);
      console.log(`🔀 New PRs: ${this.stats.newPRs}`);
      console.log(`🎤 New issues: ${this.stats.newIssues}`);
      console.log(`🔄 Synced contributions: ${this.stats.syncedContributions}`);

      return {
        stats: this.stats,
        report,
        forksData: forksData.filter(f => f !== null)
      };

    } catch (error) {
      console.error('❌ Fork Detection & Monitoring failed:', error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const monitor = new ForkDetectionMonitor();

  monitor.execute()
    .then(results => {
      console.log('🎉 Fork monitoring completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fork monitoring failed:', error);
      process.exit(1);
    });
}

module.exports = ForkDetectionMonitor;
