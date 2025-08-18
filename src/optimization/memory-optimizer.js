class MemoryOptimizer {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 1000;
  }
  
  optimizeMemoryUsage() {
    // Nettoyer le cache si nécessaire
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      const toRemove = entries.slice(0, Math.floor(entries.length / 2));
      
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
    
    // Forcer le garbage collection si disponible
    if (global.gc) {
      global.gc();
    }
  }
  
  setCacheSize(size) {
    this.maxCacheSize = size;
  }
}

module.exports = MemoryOptimizer;