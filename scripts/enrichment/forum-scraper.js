'use strict';

/**
 * HOMEY FORUM SCRAPER v1.0
 *
 * Scrapes device information from Homey Community forum posts:
 * - Universal Tuya Zigbee (Ultimate) post
 * - Johan's Tuya Zigbee post
 * - Tuya Cloud post
 *
 * Extracts: manufacturer IDs, model IDs, device descriptions, user reports
 *
 * NOTE: Uses Discourse API (no Tuya Cloud API needed)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  forumBase: 'https://community.homey.app',
  topics: {
    ultimate: {
      id: 93498,
      name: 'Universal Tuya Zigbee (Ultimate)',
      slug: 'app-pro-universal-tuya-zigbee'
    },
    johan: {
      id: 20549,
      name: 'Johan Tuya Zigbee',
      slug: 'app-tuya-zigbee'
    }
  },
  patterns: {
    manufacturerId: /(_TZ[E0-9]{1,4}_[a-z0-9]+)/gi,
    modelId: /(TS[0-9]{3,4}[A-Z]?)/gi,
    deviceName: /device\s*[:=]?\s*["']?([^"'\n,]+)/gi,
    datapoint: /[dD][pP]\s*[=:]?\s*(\d{1,3})/g
  },
  outputDir: './data/forum'
};

class ForumScraper {
  constructor() {
    this.posts = [];
    this.devices = new Map();
    this.manufacturerIds = new Set();
    this.userReports = [];
  }

  // Fetch JSON from URL
  fetchJson(url) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Homey-Tuya-Enrichment/1.0',
          'Accept': 'application/json'
        }
      };

      https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ error: 'Failed to parse JSON', raw: data.substring(0, 500) });
          }
        });
      }).on('error', reject);
    });
  }

  // Extract device info from post content
  extractFromPost(post) {
    const content = post.cooked || post.raw || '';
    const extracted = {
      postId: post.id,
      postNumber: post.post_number,
      username: post.username,
      date: post.created_at,
      manufacturerIds: [],
      modelIds: [],
      datapoints: [],
      deviceMentions: []
    };

    // Extract manufacturer IDs
    const mfrMatches = content.match(CONFIG.patterns.manufacturerId) || [];
    mfrMatches.forEach(id => {
      extracted.manufacturerIds.push(id);
      this.manufacturerIds.add(id.toLowerCase());
    });

    // Extract model IDs
    const modelMatches = content.match(CONFIG.patterns.modelId) || [];
    extracted.modelIds = [...new Set(modelMatches)];

    // Extract datapoints
    let dpMatch;
    while ((dpMatch = CONFIG.patterns.datapoint.exec(content)) !== null) {
      extracted.datapoints.push(parseInt(dpMatch[1]));
    }
    CONFIG.patterns.datapoint.lastIndex = 0;

    // Check for device requests/issues
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('not working') ||
      lowerContent.includes('doesn\'t work') ||
      lowerContent.includes('device request') ||
      lowerContent.includes('please add')) {
      this.userReports.push({
        postId: post.id,
        type: lowerContent.includes('not working') ? 'issue' : 'request',
        manufacturerIds: extracted.manufacturerIds,
        modelIds: extracted.modelIds,
        excerpt: content.substring(0, 200).replace(/<[^>]*>/g, '')
      });
    }

    return extracted;
  }

  // Fetch all posts from a topic
  async fetchTopic(topicConfig) {
    console.log(`\n📖 Fetching: ${topicConfig.name}...`);

    const allPosts = [];
    let page = 0;
    let hasMore = true;

    while (hasMore && page < 50) { // Limit to 50 pages
      const url = `${CONFIG.forumBase}/t/${topicConfig.slug}/${topicConfig.id}.json?page=${page}`;

      try {
        const data = await this.fetchJson(url);

        if (data.error) {
          console.log(`   Error: ${data.error}`);
          break;
        }

        const posts = data.post_stream?.posts || [];

        if (posts.length === 0) {
          hasMore = false;
        } else {
          posts.forEach(post => {
            const extracted = this.extractFromPost(post);
            if (extracted.manufacturerIds.length > 0 || extracted.modelIds.length > 0) {
              allPosts.push(extracted);
            }
          });

          console.log(`   Page ${page + 1}: ${posts.length} posts (${allPosts.length} with device info)`);
          page++;

          // Rate limiting
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (err) {
        console.log(`   Error fetching page ${page}: ${err.message}`);
        hasMore = false;
      }
    }

    console.log(`   Total posts with device info: ${allPosts.length}`);
    console.log(`   Unique manufacturer IDs: ${this.manufacturerIds.size}`);

    return allPosts;
  }

  // Generate report
  generateReport() {
    const report = {
      generated: new Date().toISOString(),
      stats: {
        manufacturerIds: this.manufacturerIds.size,
        userReports: this.userReports.length,
        issueReports: this.userReports.filter(r => r.type === 'issue').length,
        deviceRequests: this.userReports.filter(r => r.type === 'request').length
      },
      manufacturerIds: Array.from(this.manufacturerIds).sort(),
      userReports: this.userReports,
      posts: this.posts
    };

    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const outputPath = path.join(CONFIG.outputDir, `forum-data-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 Report saved to: ${outputPath}`);

    return report;
  }

  // Main run
  async run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     HOMEY FORUM SCRAPER v1.0                              ║');
    console.log('║     (NO TUYA CLOUD API NEEDED)                            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    // Scrape each topic
    for (const [key, config] of Object.entries(CONFIG.topics)) {
      const posts = await this.fetchTopic(config);
      this.posts.push(...posts);
    }

    // Generate report
    const report = this.generateReport();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SCRAPING COMPLETE:');
    console.log(`  Manufacturer IDs found: ${report.stats.manufacturerIds}`);
    console.log(`  User issue reports: ${report.stats.issueReports}`);
    console.log(`  Device requests: ${report.stats.deviceRequests}`);
    console.log('═══════════════════════════════════════════════════════════');

    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const scraper = new ForumScraper();
  scraper.run().catch(console.error);
}

module.exports = ForumScraper;
