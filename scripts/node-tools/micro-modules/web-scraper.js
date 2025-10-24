/**
 * MICRO-MODULE: WEB SCRAPER
 * 
 * Scraper modulaire pour extraire des données de différentes sources
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export class WebScraper {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.delay = options.delay || 1000;
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  }

  /**
   * Fetch URL with retry logic
   */
  async fetch(url, options = {}) {
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: this.timeout,
          headers: {
            'User-Agent': this.userAgent,
            ...options.headers
          },
          ...options
        });
        
        return response;
      } catch (err) {
        if (attempt === this.retries) {
          throw err;
        }
        
        await new Promise(resolve => setTimeout(resolve, this.delay * attempt));
      }
    }
  }

  /**
   * Extract manufacturer IDs from text
   */
  extractManufacturerIDs(text) {
    const patterns = [
      /_TZ[E0-9]{1}[0-9]{3}_[a-z0-9]+/gi,
      /TS[0-9]{4}[A-Z]?/gi,
      /_TZ[0-9]{4}_[a-z0-9]+/gi
    ];
    
    const ids = new Set();
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        ids.add(match[0]);
      }
    }
    
    return Array.from(ids);
  }

  /**
   * Scrape GitHub file
   */
  async scrapeGitHubFile(url) {
    const response = await this.fetch(url);
    return response.data;
  }

  /**
   * Scrape GitHub directory
   */
  async scrapeGitHubDir(apiUrl) {
    const response = await this.fetch(apiUrl, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    
    return response.data;
  }

  /**
   * Scrape with Cheerio
   */
  async scrapeWithCheerio(url, selector) {
    const response = await this.fetch(url);
    const $ = cheerio.load(response.data);
    
    const results = [];
    $(selector).each((i, el) => {
      results.push($(el).text().trim());
    });
    
    return results;
  }

  /**
   * Extract JSON from page
   */
  async scrapeJSON(url) {
    const response = await this.fetch(url);
    
    if (typeof response.data === 'object') {
      return response.data;
    }
    
    return JSON.parse(response.data);
  }
}

export default WebScraper;
