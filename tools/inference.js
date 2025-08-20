#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

/**
 * Inference Engine - Compute confidence scores and generate proposals
 */
class InferenceEngine {
  constructor() {
    this.extractDir = 'research/extract';
    this.proposalsDir = 'research/proposals';
    this.sourcesConfig = this.loadConfig('research/configs/sources.yml');
    this.thresholdsConfig = this.loadConfig('research/configs/thresholds.yml');
  }

  loadConfig(file) {
    try {
      return yaml.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      console.error(`Failed to load ${file}:`, e.message);
      return {};
    }
  }

  /**
   * Main inference process
   */
  infer() {
    console.log('🧮 Running inference...');
    
    // Load facts
    const facts = this.loadFacts();
    console.log(`  Loaded ${facts.length} facts`);
    
    // Group by device fingerprint
    const devices = this.groupByDevice(facts);
    console.log(`  Found ${Object.keys(devices).length} unique devices`);
    
    // Compute confidence for each device
    const proposals = [];
    
    Object.entries(devices).forEach(([key, deviceFacts]) => {
      const score = this.computeConfidence(deviceFacts);
      const overlay = this.generateOverlay(deviceFacts, score);
      
      if (score >= this.thresholdsConfig.propose_threshold) {
        overlay.status = 'proposed';
        proposals.push(overlay);
        console.log(`  ✅ Proposed: ${key} (confidence: ${score.toFixed(2)})`);
      } else if (score >= this.thresholdsConfig.quarantine_threshold) {
        console.log(`  ⏸️  Quarantined: ${key} (confidence: ${score.toFixed(2)})`);
      } else {
        console.log(`  ❌ Rejected: ${key} (confidence: ${score.toFixed(2)})`);
      }
    });
    
    // Save proposals
    this.saveProposals(proposals);
    
    return proposals;
  }

  /**
   * Load facts from extract files
   */
  loadFacts() {
    const facts = [];
    
    if (!fs.existsSync(this.extractDir)) return facts;
    
    const files = fs.readdirSync(this.extractDir)
      .filter(f => f.endsWith('.jsonl'));
    
    files.forEach(file => {
      const lines = fs.readFileSync(path.join(this.extractDir, file), 'utf8')
        .split('\n')
        .filter(l => l.trim());
      
      lines.forEach(line => {
        try {
          facts.push(JSON.parse(line));
        } catch (e) {
          // Skip invalid lines
        }
      });
    });
    
    return facts;
  }

  /**
   * Group facts by device fingerprint
   */
  groupByDevice(facts) {
    const devices = {};
    
    facts.forEach(fact => {
      const key = `${fact.manufacturerName || 'unknown'}:${fact.productId || 'unknown'}`;
      if (!devices[key]) devices[key] = [];
      devices[key].push(fact);
    });
    
    return devices;
  }

  /**
   * Compute confidence score for a device
   */
  computeConfidence(facts) {
    if (!facts || facts.length === 0) return 0;
    
    // Base score: max weight of sources
    let baseScore = 0;
    const domains = new Set();
    const sources = [];
    
    facts.forEach(fact => {
      const domain = this.extractDomain(fact.source);
      domains.add(domain);
      sources.push(fact.url || fact.source);
      
      // Get weight for this source
      const weight = this.getSourceWeight(fact.source, fact.type);
      baseScore = Math.max(baseScore, weight);
    });
    
    let score = baseScore;
    
    // Consensus bonus (>=3 distinct domains)
    if (domains.size >= this.thresholdsConfig.diversity_bonus_threshold) {
      const bonus = parseFloat(this.sourcesConfig.bonuses?.multi_source_agreement || 0);
      score += bonus;
    }
    
    // DP evidence bonus
    const hasDpEvidence = facts.some(f => f.dpEvidence && Object.keys(f.dpEvidence).length > 0);
    if (hasDpEvidence) {
      const bonus = parseFloat(this.sourcesConfig.bonuses?.dp_log_evidence || 0);
      score += bonus;
    }
    
    // Recency decay
    const recencyDays = this.sourcesConfig.bonuses?.recency_boost_days || 180;
    facts.forEach(fact => {
      if (fact.date) {
        const age = this.getDaysAgo(fact.date);
        if (age > recencyDays) {
          const decay = (age - recencyDays) / 365 * 0.1; // Max 10% decay per year
          score -= decay;
        }
      }
    });
    
    // Penalties
    if (facts.length === 1) {
      const penalty = Math.abs(parseFloat(this.sourcesConfig.penalties?.single_source_only || 0));
      score -= penalty;
    }
    
    // Check for contradictions
    const hasContradiction = this.detectContradictions(facts);
    if (hasContradiction) {
      const penalty = Math.abs(parseFloat(this.sourcesConfig.penalties?.contradiction || 0));
      score -= penalty;
    }
    
    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get weight for a source
   */
  getSourceWeight(source, type) {
    // Check overrides first
    if (this.sourcesConfig.overrides?.[source]) {
      return this.sourcesConfig.overrides[source];
    }
    
    // Check domain overrides
    const domain = this.extractDomain(source);
    if (this.sourcesConfig.overrides?.[domain]) {
      return this.sourcesConfig.overrides[domain];
    }
    
    // Use type defaults
    const typeMap = {
      'forum_post': 'reputable_forum',
      'github_issue': 'upstream_repo',
      'product_page': 'large_retailer',
      'video_demo': 'video_demo'
    };
    
    const configType = typeMap[type] || 'unknown_site';
    return this.sourcesConfig.defaults?.[configType] || 0.25;
  }

  /**
   * Extract domain from source
   */
  extractDomain(source) {
    if (!source) return 'unknown';
    
    // Handle URLs
    if (source.includes('://')) {
      try {
        const url = new URL(source);
        return url.hostname;
      } catch (e) {
        // Not a valid URL
      }
    }
    
    // Handle domain-like strings
    if (source.includes('.')) {
      return source.split('/')[0];
    }
    
    return source;
  }

  /**
   * Calculate days ago from date string
   */
  getDaysAgo(dateStr) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    } catch (e) {
      return 0;
    }
  }

  /**
   * Detect contradictions in facts
   */
  detectContradictions(facts) {
    // Check for conflicting type hints
    const types = new Set();
    facts.forEach(f => {
      if (f.typeHints) {
        f.typeHints.forEach(t => types.add(t));
      }
    });
    
    // Contradictory types
    const contradictoryPairs = [
      ['plug', 'thermostat'],
      ['curtain', 'remote'],
      ['trv', 'sensor']
    ];
    
    for (const [type1, type2] of contradictoryPairs) {
      if (types.has(type1) && types.has(type2)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate overlay from facts
   */
  generateOverlay(facts, confidence) {
    const first = facts[0];
    
    // Infer type
    const type = this.inferType(facts);
    
    // Collect all DP evidence
    const dpMap = {};
    facts.forEach(f => {
      if (f.dpEvidence) {
        Object.entries(f.dpEvidence).forEach(([dp, mapping]) => {
          if (!dpMap[dp]) dpMap[dp] = [];
          dpMap[dp].push(mapping);
        });
      }
    });
    
    // Build consensus DP mappings
    const dp = {};
    Object.entries(dpMap).forEach(([dpId, mappings]) => {
      // Use most common mapping
      const counts = {};
      mappings.forEach(m => {
        counts[m] = (counts[m] || 0) + 1;
      });
      
      const bestMapping = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])[0][0];
      
      // Parse mapping
      if (bestMapping.includes('/')) {
        const [cap, divisor] = bestMapping.split('/');
        dp[dpId] = { cap, to: `num/${divisor}` };
      } else if (['onoff', 'locked', 'switch'].includes(bestMapping)) {
        dp[dpId] = { cap: bestMapping === 'switch' ? 'onoff' : bestMapping, to: 'bool' };
      } else {
        dp[dpId] = { cap: bestMapping, to: 'raw' };
      }
    });
    
    // Collect sources
    const sources = [...new Set(facts.map(f => f.url || f.source).filter(s => s))];
    
    return {
      status: 'proposed',
      confidence: parseFloat(confidence.toFixed(3)),
      sources: sources.slice(0, 5), // Max 5 sources
      productIds: [first.productId].filter(p => p),
      manufacturerName: first.manufacturerName,
      type,
      dp: Object.keys(dp).length > 0 ? dp : this.getDefaultDp(type),
      reports: this.getDefaultReports(type),
      notes: `Auto-inferred from ${facts.length} sources`
    };
  }

  /**
   * Infer device type from facts
   */
  inferType(facts) {
    const typeCounts = {};
    
    facts.forEach(f => {
      if (f.typeHints) {
        f.typeHints.forEach(hint => {
          typeCounts[hint] = (typeCounts[hint] || 0) + 1;
        });
      }
    });
    
    // Map to standard types
    const typeMap = {
      'plug': 'plug',
      'socket': 'plug',
      'switch': 'plug',
      'thermostat': 'climate-trv',
      'trv': 'climate-trv',
      'radiator': 'climate-trv',
      'curtain': 'cover-curtain',
      'blind': 'cover-curtain',
      'motor': 'cover-curtain',
      'remote': 'remote-scene',
      'scene': 'remote-scene',
      'button': 'remote-scene'
    };
    
    // Find most common type
    const sortedTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1]);
    
    if (sortedTypes.length > 0) {
      const hint = sortedTypes[0][0];
      return typeMap[hint] || 'generic';
    }
    
    return 'generic';
  }

  /**
   * Get default DP mappings for type
   */
  getDefaultDp(type) {
    const defaults = {
      'plug': {
        '1': { cap: 'onoff', to: 'bool' },
        '16': { cap: 'measure_power', to: 'num/10' },
        '17': { cap: 'meter_power', to: 'num/1000' }
      },
      'climate-trv': {
        '2': { cap: 'target_temperature', to: 'num/10' },
        '4': { cap: 'measure_temperature', to: 'num/10' },
        '7': { cap: 'locked', to: 'bool' },
        '45': { cap: 'alarm_battery', to: 'bool' }
      },
      'cover-curtain': {
        '1': { cap: 'windowcoverings_control', to: 'enum' },
        '2': { cap: 'windowcoverings_set', to: 'num/1' },
        '3': { cap: 'windowcoverings_state', to: 'num/1' }
      },
      'remote-scene': {}
    };
    
    return defaults[type] || {};
  }

  /**
   * Get default reports for type
   */
  getDefaultReports(type) {
    const defaults = {
      'plug': { power_interval_sec: 30, energy_interval_sec: 300 },
      'climate-trv': { temperature_interval_sec: 60, battery_interval_sec: 3600 },
      'cover-curtain': { position_interval_sec: 60 },
      'remote-scene': {}
    };
    
    return defaults[type] || {};
  }

  /**
   * Save proposals to files
   */
  saveProposals(proposals) {
    if (!fs.existsSync(this.proposalsDir)) {
      fs.mkdirSync(this.proposalsDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    proposals.forEach((proposal, index) => {
      const filename = `proposal_${timestamp}_${index}.json`;
      const filepath = path.join(this.proposalsDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(proposal, null, 2));
    });
    
    console.log(`  💾 Saved ${proposals.length} proposals`);
  }
}

// Export for CLI
module.exports = InferenceEngine;

// Run if called directly
if (require.main === module) {
  const engine = new InferenceEngine();
  engine.infer();
}
