/**
 * MICRO-MODULE: SMART MATCHER
 * 
 * Algorithmes intelligents pour matching et comparaison
 */

export class SmartMatcher {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.8;
    this.cache = new Map();
  }

  /**
   * Levenshtein distance (similarity)
   */
  levenshtein(str1, str2) {
    const key = `${str1}:${str2}`;
    if (this.cache.has(key)) return this.cache.get(key);
    
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
    
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distance = matrix[len1][len2];
    this.cache.set(key, distance);
    return distance;
  }

  /**
   * Similarity score (0-1)
   */
  similarity(str1, str2) {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0;
    
    const distance = this.levenshtein(str1, str2);
    return 1 - (distance / maxLen);
  }

  /**
   * Fuzzy match manufacturer IDs
   */
  fuzzyMatchManufacturer(id1, id2) {
    // Exact match
    if (id1 === id2) return 1.0;
    
    // Pattern match (_TZ3000_abc vs _TZ3000_xyz)
    const pattern1 = id1.match(/^(_TZ[E0-9]{1}[0-9]{3}_)/);
    const pattern2 = id2.match(/^(_TZ[E0-9]{1}[0-9]{3}_)/);
    
    if (pattern1 && pattern2 && pattern1[1] === pattern2[1]) {
      // Same prefix, compare suffix
      const suffix1 = id1.replace(pattern1[1], '');
      const suffix2 = id2.replace(pattern2[1], '');
      return 0.7 + (0.3 * this.similarity(suffix1, suffix2));
    }
    
    // General similarity
    return this.similarity(id1, id2);
  }

  /**
   * Mass matching algorithm
   */
  massMatch(sources, targets, keyFn = (x) => x) {
    const matches = [];
    const unmatched = [];
    
    for (const target of targets) {
      const targetKey = keyFn(target);
      let bestMatch = null;
      let bestScore = 0;
      
      for (const source of sources) {
        const sourceKey = keyFn(source);
        const score = this.fuzzyMatchManufacturer(targetKey, sourceKey);
        
        if (score > bestScore && score >= this.threshold) {
          bestScore = score;
          bestMatch = source;
        }
      }
      
      if (bestMatch) {
        matches.push({
          target,
          source: bestMatch,
          score: bestScore,
          confidence: this.getConfidenceLevel(bestScore)
        });
      } else {
        unmatched.push(target);
      }
    }
    
    return { matches, unmatched };
  }

  /**
   * Get confidence level
   */
  getConfidenceLevel(score) {
    if (score === 1.0) return 'exact';
    if (score >= 0.95) return 'very_high';
    if (score >= 0.85) return 'high';
    if (score >= 0.75) return 'medium';
    return 'low';
  }

  /**
   * Pattern-based matching for Tuya IDs
   */
  matchTuyaPattern(id) {
    const patterns = {
      tz3000: /^_TZ3000_[a-z0-9]{8}$/,
      tze200: /^_TZE200_[a-z0-9]{8}$/,
      tze204: /^_TZE204_[a-z0-9]{8}$/,
      tze284: /^_TZE284_[a-z0-9]{8}$/,
      ts: /^TS[0-9]{4}[A-Z]?$/
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(id)) {
        return { type, valid: true };
      }
    }
    
    return { type: 'unknown', valid: false };
  }

  /**
   * Batch similarity check
   */
  batchSimilarity(items, threshold = null) {
    threshold = threshold || this.threshold;
    const similar = [];
    
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const score = this.similarity(items[i], items[j]);
        
        if (score >= threshold) {
          similar.push({
            item1: items[i],
            item2: items[j],
            score,
            confidence: this.getConfidenceLevel(score)
          });
        }
      }
    }
    
    return similar;
  }

  /**
   * Deduplicate based on similarity
   */
  deduplicate(items, keyFn = (x) => x) {
    const unique = [];
    const duplicates = [];
    
    for (const item of items) {
      const key = keyFn(item);
      let isDuplicate = false;
      
      for (const existingItem of unique) {
        const existingKey = keyFn(existingItem);
        const score = this.similarity(key, existingKey);
        
        if (score >= 0.95) {
          isDuplicate = true;
          duplicates.push({ item, duplicate_of: existingItem, score });
          break;
        }
      }
      
      if (!isDuplicate) {
        unique.push(item);
      }
    }
    
    return { unique, duplicates };
  }
}

export default SmartMatcher;
