/**
 * MICRO-MODULE: CACHE MANAGER
 * 
 * Gestion intelligente du cache pour éviter requêtes répétées
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class CacheManager {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || '.cache';
    this.ttl = options.ttl || 86400000; // 24h default
    this.enabled = options.enabled !== false;
  }

  /**
   * Generate cache key
   */
  generateKey(data) {
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Get cache file path
   */
  getCachePath(key) {
    return path.join(this.cacheDir, `${key}.json`);
  }

  /**
   * Check if cache exists and is valid
   */
  async has(key) {
    if (!this.enabled) return false;
    
    try {
      const cachePath = this.getCachePath(key);
      const stats = await fs.stat(cachePath);
      const age = Date.now() - stats.mtimeMs;
      
      return age < this.ttl;
    } catch (err) {
      return false;
    }
  }

  /**
   * Get from cache
   */
  async get(key) {
    if (!this.enabled) return null;
    
    try {
      const cachePath = this.getCachePath(key);
      const data = await fs.readFile(cachePath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Check TTL
      if (Date.now() - parsed.timestamp > this.ttl) {
        await this.delete(key);
        return null;
      }
      
      return parsed.data;
    } catch (err) {
      return null;
    }
  }

  /**
   * Set cache
   */
  async set(key, data) {
    if (!this.enabled) return;
    
    try {
      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      const cachePath = this.getCachePath(key);
      const cacheData = {
        timestamp: Date.now(),
        data
      };
      
      await fs.writeFile(cachePath, JSON.stringify(cacheData, null, 2), 'utf8');
    } catch (err) {
      console.warn(`Cache set failed: ${err.message}`);
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key) {
    if (!this.enabled) return;
    
    try {
      const cachePath = this.getCachePath(key);
      await fs.unlink(cachePath);
    } catch (err) {
      // Ignore errors
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    if (!this.enabled) return;
    
    try {
      const files = await fs.readdir(this.cacheDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
    } catch (err) {
      console.warn(`Cache clear failed: ${err.message}`);
    }
  }

  /**
   * Get cache stats
   */
  async stats() {
    if (!this.enabled) return { enabled: false };
    
    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      let totalSize = 0;
      let validCount = 0;
      let expiredCount = 0;
      
      for (const file of jsonFiles) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        
        const age = Date.now() - stats.mtimeMs;
        if (age < this.ttl) {
          validCount++;
        } else {
          expiredCount++;
        }
      }
      
      return {
        enabled: true,
        totalEntries: jsonFiles.length,
        validEntries: validCount,
        expiredEntries: expiredCount,
        totalSize: (totalSize / 1024).toFixed(2) + ' KB',
        ttl: this.ttl
      };
    } catch (err) {
      return { enabled: true, error: err.message };
    }
  }

  /**
   * Clean expired cache
   */
  async cleanExpired() {
    if (!this.enabled) return 0;
    
    try {
      const files = await fs.readdir(this.cacheDir);
      let cleaned = 0;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        const age = Date.now() - stats.mtimeMs;
        
        if (age >= this.ttl) {
          await fs.unlink(filePath);
          cleaned++;
        }
      }
      
      return cleaned;
    } catch (err) {
      console.warn(`Clean expired failed: ${err.message}`);
      return 0;
    }
  }

  /**
   * Cached fetch wrapper
   */
  async cachedFetch(key, fetchFn) {
    // Check cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return { data: cached, cached: true };
    }
    
    // Fetch fresh data
    const data = await fetchFn();
    
    // Store in cache
    await this.set(key, data);
    
    return { data, cached: false };
  }
}

export default CacheManager;
