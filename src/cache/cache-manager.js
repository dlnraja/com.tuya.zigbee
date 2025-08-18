const fs = require('fs');
const path = require('path');

class CacheManager {
  constructor(cacheDir = './src/cache') {
    this.cacheDir = cacheDir;
    this.ensureCacheDir();
  }
  
  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }
  
  set(key, value, ttl = 3600000) {
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    const cacheData = {
      value,
      timestamp: Date.now(),
      ttl
    };
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData));
  }
  
  get(key) {
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    if (!fs.existsSync(cacheFile)) return null;
    
    const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (Date.now() - cacheData.timestamp > cacheData.ttl) {
      fs.unlinkSync(cacheFile);
      return null;
    }
    
    return cacheData.value;
  }
  
  clear() {
    const files = fs.readdirSync(this.cacheDir);
    for (const file of files) {
      fs.unlinkSync(path.join(this.cacheDir, file));
    }
  }
}

module.exports = CacheManager;