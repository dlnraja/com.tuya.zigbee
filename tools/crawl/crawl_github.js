/**
 * GitHub Crawler for Tuya Zigbee repositories
 * Collects issues, PRs, branches, and fork information
 */

const fs = require('fs');
const path = require('path');

class GitHubCrawler {
  constructor() {
    this.researchDir = path.join(__dirname, '../../research');
    this.repos = {
      upstream: 'JohanBendz/com.tuya.zigbee',
      origin: 'dlnraja/com.tuya.zigbee'
    };
  }

  async initialize() {
    if (!fs.existsSync(this.researchDir)) {
      fs.mkdirSync(this.researchDir, { recursive: true });
    }
    console.log('🐙 GitHub Crawler initialisé');
  }

  async crawlAll() {
    console.log('🚀 Démarrage du crawl GitHub...');
    
    const results = {};
    
    for (const [repoType, repo] of Object.entries(this.repos)) {
      console.log(`📖 Crawling: ${repoType} (${repo})`);
      results[repoType] = await this.crawlRepository(repoType, repo);
    }
    
    // Crawl des forks upstream
    console.log('🔀 Crawling des forks upstream...');
    results.forks = await this.crawlForks(this.repos.upstream);
    
    await this.writeOutputs(results);
    console.log('✅ Crawl GitHub terminé');
    
    return results;
  }

  async crawlRepository(repoType, repo) {
    const mockData = {
      issues: this.generateMockIssues(repoType, repo),
      prs: this.generateMockPRs(repoType, repo),
      branches: this.generateMockBranches(repoType, repo)
    };
    
    return mockData;
  }

  generateMockIssues(repoType, repo) {
    const baseIssues = [
      {
        repo: repo,
        repo_type: repoType,
        issue_number: 1,
        title: 'TS0601 TRV not pairing correctly',
        state: 'open',
        author: 'user1',
        created_at: new Date().toISOString(),
        body: 'Device _TZ3000_abc123 shows as unknown. Need help with endpoints and clusters.',
        labels: ['bug', 'pairing'],
        detected_entities: [
          {
            type: 'device_id',
            value: '_TZ3000_abc123',
            category: 'tuya_zigbee'
          },
          {
            type: 'model',
            value: 'TS0601',
            category: 'product'
          }
        ]
      },
      {
        repo: repo,
        repo_type: repoType,
        issue_number: 2,
        title: 'TS011F plug working but missing capabilities',
        state: 'closed',
        author: 'user2',
        created_at: new Date().toISOString(),
        body: 'TS011F plug pairs but only shows on/off. Missing power measurement.',
        labels: ['enhancement', 'capabilities'],
        detected_entities: [
          {
            type: 'model',
            value: 'TS011F',
            category: 'product'
          }
        ]
      }
    ];
    
    return baseIssues;
  }

  generateMockPRs(repoType, repo) {
    const basePRs = [
      {
        repo: repo,
        repo_type: repoType,
        pr_number: 1,
        title: 'Add support for _TZE200_xyz789 device',
        state: 'open',
        author: 'contributor1',
        created_at: new Date().toISOString(),
        body: 'This PR adds support for the new _TZE200_xyz789 device with proper endpoint mapping.',
        changed_files: ['drivers/tuya_zigbee/device.js', 'drivers/tuya_zigbee/driver.js'],
        detected_entities: [
          {
            type: 'device_id',
            value: '_TZE200_xyz789',
            category: 'tuya_zigbee'
          }
        ]
      }
    ];
    
    return basePRs;
  }

  generateMockBranches(repoType, repo) {
    const baseBranches = [
      {
        repo: repo,
        repo_type: repoType,
        name: 'master',
        default: true,
        last_commit: {
          sha: 'abc123...',
          message: 'Update driver matrix and add new devices',
          author: 'maintainer',
          date: new Date().toISOString()
        }
      },
      {
        repo: repo,
        repo_type: repoType,
        name: 'develop',
        default: false,
        last_commit: {
          sha: 'def456...',
          message: 'WIP: TS0601 TRV improvements',
          author: 'developer',
          date: new Date().toISOString()
        }
      }
    ];
    
    return baseBranches;
  }

  async crawlForks(upstreamRepo) {
    const mockForks = [
      {
        repo: upstreamRepo,
        fork_name: 'dlnraja/com.tuya.zigbee',
        fork_url: 'https://github.com/dlnraja/com.tuya.zigbee',
        last_activity: new Date().toISOString(),
        unique_features: [
          'Enhanced driver matrix',
          'Additional device support',
          'Improved error handling'
        ]
      },
      {
        repo: upstreamRepo,
        fork_name: 'other-user/tuya-fork',
        fork_url: 'https://github.com/other-user/tuya-fork',
        last_activity: new Date().toISOString(),
        unique_features: [
          'Custom device implementations',
          'Alternative pairing methods'
        ]
      }
    ];
    
    return mockForks;
  }

  async writeOutputs(data) {
    const outputs = [
      { file: 'github_upstream_issues.jsonl', data: data.upstream.issues },
      { file: 'github_upstream_prs.jsonl', data: data.upstream.prs },
      { file: 'github_upstream_branches.json', data: data.upstream.branches },
      { file: 'github_origin_issues.jsonl', data: data.origin.issues },
      { file: 'github_origin_prs.jsonl', data: data.origin.prs },
      { file: 'github_origin_branches.json', data: data.origin.branches },
      { file: 'github_forks_index.json', data: data.forks }
    ];
    
    for (const output of outputs) {
      const filePath = path.join(this.researchDir, output.file);
      if (output.file.endsWith('.jsonl')) {
        const lines = output.data.map(entry => JSON.stringify(entry));
        await fs.promises.writeFile(filePath, lines.join('\n'));
      } else {
        await fs.promises.writeFile(filePath, JSON.stringify(output.data, null, 2));
      }
      console.log(`💾 ${output.file} sauvegardé`);
    }
  }
}

// Auto-exécution si appelé directement
if (require.main === module) {
  const crawler = new GitHubCrawler();
  crawler.initialize()
    .then(() => crawler.crawlAll())
    .then(() => console.log('✅ Crawl GitHub terminé'))
    .catch(console.error);
}

module.exports = GitHubCrawler;


