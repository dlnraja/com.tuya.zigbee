/**
 * HOMEY COMMUNITY FORUM SCRAPER
 * 
 * Source: https://community.homey.app/t/140352
 * Scrapes user device interviews and diagnostic reports
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class HomeyForumScraper {
  constructor() {
    this.baseUrl = 'https://community.homey.app';
    this.topicId = '140352';
    this.outputPath = path.join(__dirname, '../../../data/sources/homey-community');
    this.manufacturerIds = new Set();
    this.devices = [];
    this.userReports = [];
  }

  async scrape() {
    console.log('🔍 Homey Forum Scraper - Starting...');
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      
      // Scrape topic pages
      await this.scrapeForumTopic();
      
      // Extract manufacturer IDs from user posts
      this.extractManufacturerIds();
      
      await this.saveResults();
      
      console.log('✅ Homey Forum scraped');
      console.log(`   - User reports: ${this.userReports.length}`);
      console.log(`   - Manufacturer IDs: ${this.manufacturerIds.size}`);
      
      return {
        success: true,
        devices: this.devices,
        manufacturerIds: Array.from(this.manufacturerIds),
        userReports: this.userReports
      };
      
    } catch (error) {
      console.error('❌ Homey Forum scraping failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async scrapeForumTopic() {
    // Forum JSON API
    const url = `${this.baseUrl}/t/${this.topicId}.json`;
    
    try {
      const content = await this.fetchUrl(url);
      const data = JSON.parse(content);
      this.parseForumData(data);
    } catch (error) {
      console.log('Forum API fetch failed:', error.message);
    }
  }

  parseForumData(data) {
    if (data.post_stream && data.post_stream.posts) {
      data.post_stream.posts.forEach(post => {
        // Extract manufacturer IDs from post content
        const matches = post.cooked.match(/_TZ[E23][0-9]{3}_[a-z0-9]+/gi);
        if (matches) {
          matches.forEach(id => this.manufacturerIds.add(id));
        }
        
        // Extract TS model IDs
        const tsMatches = post.cooked.match(/TS[0-9]{4}/gi);
        if (tsMatches) {
          tsMatches.forEach(id => this.manufacturerIds.add(id));
        }
        
        this.userReports.push({
          date: post.created_at,
          username: post.username,
          content_preview: post.cooked.substring(0, 200)
        });
      });
    }
  }

  extractManufacturerIds() {
    // Already extracted during parsing
  }

  fetchUrl(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) resolve(data);
          else reject(new Error(`HTTP ${res.statusCode}`));
        });
      }).on('error', reject);
    });
  }

  async saveResults() {
    await fs.writeFile(
      path.join(this.outputPath, 'manufacturer-ids.json'),
      JSON.stringify(Array.from(this.manufacturerIds), null, 2)
    );
    
    await fs.writeFile(
      path.join(this.outputPath, 'user-reports.json'),
      JSON.stringify(this.userReports, null, 2)
    );
    
    const summary = {
      timestamp: new Date().toISOString(),
      source: 'Homey Community Forum',
      url: `${this.baseUrl}/t/${this.topicId}`,
      statistics: {
        manufacturer_ids: this.manufacturerIds.size,
        user_reports: this.userReports.length
      }
    };
    
    await fs.writeFile(
      path.join(this.outputPath, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
  }
}

if (require.main === module) {
  const scraper = new HomeyForumScraper();
  scraper.scrape().then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = HomeyForumScraper;
