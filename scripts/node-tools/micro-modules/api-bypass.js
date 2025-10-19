/**
 * MICRO-MODULE: API BYPASS
 * 
 * Contourne intelligemment les limites API et blocages
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export class APIBypass {
  constructor(options = {}) {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    this.proxies = options.proxies || [];
    this.delay = options.delay || 2000;
  }

  /**
   * Get random user agent
   */
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Method 1: GitHub via raw.githubusercontent.com (no API limit)
   */
  async fetchGitHubRaw(owner, repo, path, branch = 'master') {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.getRandomUserAgent() },
        timeout: 15000
      });
      return response.data;
    } catch (err) {
      // Fallback to main branch
      if (branch === 'master') {
        return await this.fetchGitHubRaw(owner, repo, path, 'main');
      }
      throw err;
    }
  }

  /**
   * Method 2: GitHub tree via web scraping (no API)
   */
  async scrapeGitHubTree(owner, repo, path = '') {
    const url = `https://github.com/${owner}/${repo}/tree/master/${path}`;
    
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.getRandomUserAgent() },
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      const files = [];
      
      $('div[role="row"]').each((i, el) => {
        const $el = $(el);
        const name = $el.find('a.js-navigation-open').text().trim();
        const type = $el.find('svg').attr('aria-label');
        
        if (name) {
          files.push({
            name,
            type: type === 'Directory' ? 'dir' : 'file',
            path: `${path}/${name}`.replace(/^\//, '')
          });
        }
      });
      
      return files;
    } catch (err) {
      console.warn(`Scrape GitHub tree failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Method 3: Archive.org Wayback Machine (historical data)
   */
  async fetchWaybackMachine(url) {
    try {
      // Get latest snapshot
      const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
      const response = await axios.get(apiUrl, { timeout: 10000 });
      
      if (response.data.archived_snapshots?.closest?.url) {
        const snapshotUrl = response.data.archived_snapshots.closest.url;
        const content = await axios.get(snapshotUrl, {
          headers: { 'User-Agent': this.getRandomUserAgent() },
          timeout: 15000
        });
        return content.data;
      }
    } catch (err) {
      console.warn(`Wayback Machine failed: ${err.message}`);
    }
    return null;
  }

  /**
   * Method 4: CORS proxy for blocked sites
   */
  async fetchViaCORSProxy(url) {
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];
    
    for (const proxyUrl of proxies) {
      try {
        const response = await axios.get(proxyUrl, {
          timeout: 15000,
          headers: { 'User-Agent': this.getRandomUserAgent() }
        });
        return response.data;
      } catch (err) {
        continue;
      }
    }
    
    throw new Error('All CORS proxies failed');
  }

  /**
   * Method 5: Cached Google results
   */
  async fetchGoogleCache(url) {
    try {
      const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
      const response = await axios.get(cacheUrl, {
        headers: { 'User-Agent': this.getRandomUserAgent() },
        timeout: 15000
      });
      return response.data;
    } catch (err) {
      console.warn(`Google cache failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Smart fetch with all fallbacks
   */
  async smartFetch(url, options = {}) {
    const methods = [
      // Method 1: Direct
      async () => {
        return await axios.get(url, {
          ...options,
          headers: { 
            'User-Agent': this.getRandomUserAgent(),
            ...options.headers 
          },
          timeout: 15000
        }).then(r => r.data);
      },
      
      // Method 2: CORS proxy
      async () => await this.fetchViaCORSProxy(url),
      
      // Method 3: Google cache
      async () => await this.fetchGoogleCache(url),
      
      // Method 4: Wayback Machine
      async () => await this.fetchWaybackMachine(url)
    ];
    
    for (const method of methods) {
      try {
        const result = await method();
        if (result) return result;
      } catch (err) {
        continue;
      }
      
      // Delay between attempts
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    throw new Error(`All fetch methods failed for: ${url}`);
  }
}

export default APIBypass;
