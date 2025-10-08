#!/usr/bin/env node

/**
 * 🌐 Fetch Blakadder Device Database - Universal Tuya Zigbee
 * Scrapes device information from Blakadder's Tuya database
 */

import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BlakadderScraper {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../..');
    this.dataPath = path.join(this.projectRoot, 'data', 'external');
    this.baseUrl = 'https://blakadder.com/tuya';
    this.devices = [];
    this.stats = {
      total: 0,
      scraped: 0,
      errors: 0,
      skipped: 0
    };
  }

  /**
   * Main scraping process
   */
  async scrapeAll() {
    console.log('🌐 Starting Blakadder scraping...\n');
    
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataPath, { recursive: true });
      
      // Get device list
      await this.getDeviceList();
      
      // Scrape individual devices
      await this.scrapeDevices();
      
      // Save results
      await this.saveResults();
      
      // Generate summary
      this.generateSummary();
      
      return this.stats.errors === 0;
      
    } catch (error) {
      console.error('❌ Scraping failed:', error);
      return false;
    }
  }

  /**
   * Get list of available devices
   */
  async getDeviceList() {
    try {
      console.log('📋 Getting device list from Blakadder...');
      
      const response = await axios.get(this.baseUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Find device links
      $('a[href*="/tuya/"]').each((i, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        
        if (href && text && href.includes('/tuya/')) {
          const deviceId = href.split('/tuya/')[1]?.split('.')[0];
          if (deviceId) {
            this.devices.push({
              id: deviceId,
              name: text,
              url: `https://blakadder.com${href}`,
              scraped: false
            });
          }
        }
      });
      
      this.stats.total = this.devices.length;
      console.log(`✅ Found ${this.devices.length} devices\n`);
      
    } catch (error) {
      throw new Error(`Failed to get device list: ${error.message}`);
    }
  }

  /**
   * Scrape individual device pages
   */
  async scrapeDevices() {
    console.log('🔍 Scraping individual device pages...\n');
    
    for (let i = 0; i < this.devices.length; i++) {
      const device = this.devices[i];
      
      try {
        console.log(`[${i + 1}/${this.devices.length}] Scraping ${device.id}...`);
        
        const deviceData = await this.scrapeDevice(device);
        if (deviceData) {
          device.data = deviceData;
          device.scraped = true;
          this.stats.scraped++;
          console.log(`  ✅ Scraped successfully`);
        } else {
          this.stats.skipped++;
          console.log(`  ⏭️  Skipped (no data)`);
        }
        
        // Rate limiting
        await this.delay(1000);
        
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}`);
        this.stats.errors++;
        device.error = error.message;
      }
    }
  }

  /**
   * Scrape a single device page
   */
  async scrapeDevice(device) {
    try {
      const response = await axios.get(device.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Extract device information
      const deviceData = {
        id: device.id,
        name: device.name,
        url: device.url,
        scraped_at: new Date().toISOString(),
        zigbee: {},
        tuya: {},
        capabilities: [],
        images: [],
        notes: []
      };
      
      // Extract Zigbee information
      $('h2:contains("Zigbee")').nextUntil('h2').each((i, element) => {
        const text = $(element).text().trim();
        if (text) {
          if (text.includes('Model:')) {
            deviceData.zigbee.model = text.split('Model:')[1]?.trim();
          } else if (text.includes('Manufacturer:')) {
            deviceData.zigbee.manufacturer = text.split('Manufacturer:')[1]?.trim();
          } else if (text.includes('Cluster:')) {
            deviceData.zigbee.clusters = deviceData.zigbee.clusters || [];
            deviceData.zigbee.clusters.push(text.split('Cluster:')[1]?.trim());
          }
        }
      });
      
      // Extract Tuya information
      $('h2:contains("Tuya")').nextUntil('h2').each((i, element) => {
        const text = $(element).text().trim();
        if (text) {
          if (text.includes('DP:')) {
            deviceData.tuya.dps = deviceData.tuya.dps || [];
            deviceData.tuya.dps.push(text.split('DP:')[1]?.trim());
          }
        }
      });
      
      // Extract capabilities
      $('h2:contains("Capabilities")').nextUntil('h2').each((i, element) => {
        const text = $(element).text().trim();
        if (text && text.includes('•')) {
          const capability = text.split('•')[1]?.trim();
          if (capability) {
            deviceData.capabilities.push(capability);
          }
        }
      });
      
      // Extract images
      $('img').each((i, element) => {
        const src = $(element).attr('src');
        const alt = $(element).attr('alt');
        if (src && alt && alt.toLowerCase().includes(device.id.toLowerCase())) {
          deviceData.images.push({
            src: src.startsWith('http') ? src : `https://blakadder.com${src}`,
            alt: alt
          });
        }
      });
      
      // Extract notes
      $('blockquote, .note, .warning').each((i, element) => {
        const text = $(element).text().trim();
        if (text) {
          deviceData.notes.push(text);
        }
      });
      
      return deviceData;
      
    } catch (error) {
      throw new Error(`Failed to scrape device ${device.id}: ${error.message}`);
    }
  }

  /**
   * Save scraped results
   */
  async saveResults() {
    try {
      console.log('\n💾 Saving scraped results...');
      
      const outputPath = path.join(this.dataPath, 'blakadder.raw.json');
      const output = {
        meta: {
          version: "3.4.0",
          scraped_at: new Date().toISOString(),
          source: "Blakadder Device Database",
          url: this.baseUrl,
          stats: this.stats
        },
        devices: this.devices.filter(d => d.scraped).map(d => d.data)
      };
      
      await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
      console.log(`✅ Results saved to ${outputPath}`);
      
    } catch (error) {
      throw new Error(`Failed to save results: ${error.message}`);
    }
  }

  /**
   * Generate summary
   */
  generateSummary() {
    console.log('\n📊 BLAKADDER SCRAPING SUMMARY');
    console.log('================================');
    console.log(`📁 Total Devices: ${this.stats.total}`);
    console.log(`✅ Successfully Scraped: ${this.stats.scraped}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`📈 Success Rate: ${Math.round((this.stats.scraped / this.stats.total) * 100)}%`);
  }

  /**
   * Utility methods
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new BlakadderScraper();
  scraper.scrapeAll()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default BlakadderScraper;
