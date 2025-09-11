#!/usr/bin/env node
'use strict';

/**
 * Offline Reliability Scoring Engine
 * Système de scoring pour la validation des appareils Tuya Zigbee
 * 
 * @author Dylan Rajasekaram (dlrnaja)
 * @version 2.0.0
 */

const SOURCE_WEIGHTS = {
  official_manufacturer: 0.90,
  official_platform: 0.88,
  upstream_repo: 0.85,
  reputable_forum: 0.75,
  local_pairing_log: 0.89,
  local_event_log: 0.88,
  retailer: 0.65,
  blog_video: 0.60
};

const BONUSES = {
  diversity_consensus: 0.10,
  dp_evidence: 0.15,
  recent_data: 0.05
};

const PENALTIES = {
  contradictions: 0.20,
  single_source: 0.10,
  outdated_data: 0.15
};

/**
 * Enhanced function/class
 */
class ScoringEngine {
  constructor() {
    this.weights = SOURCE_WEIGHTS;
    this.bonuses = BONUSES;
    this.penalties = PENALTIES;
  }

  calculateDeviceScore(deviceData, sources) {
    if (!sources || sources.length === 0) return 0;
    let baseScore = this._calculateBaseScore(sources);
    baseScore = this._applyBonuses(baseScore, sources, deviceData);
    baseScore = this._applyPenalties(baseScore, sources, deviceData);
    return Math.max(0, Math.min(1, baseScore));
  }

  _calculateBaseScore(sources) {
    let totalScore = 0;
    let totalWeight = 0;
    sources.forEach(source => {
      const weight = this.weights[source.type] || 0.60;
      totalScore += weight;
      totalWeight += weight;
    });
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  _applyBonuses(score, sources, deviceData) {
    let finalScore = score;
    if (this._hasDiversityConsensus(sources)) {
      finalScore += this.bonuses.diversity_consensus;
    }
    if (this._hasDPEvidence(deviceData)) {
      finalScore += this.bonuses.dp_evidence;
    }
    if (this._hasRecentData(sources)) {
      finalScore += this.bonuses.recent_data;
    }
    return finalScore;
  }

  _applyPenalties(score, sources, deviceData) {
    let finalScore = score;
    if (this._detectContradictions(sources)) {
      finalScore -= this.penalties.contradictions;
    }
    if (this._isSingleSourceNonLocal(sources)) {
      finalScore -= this.penalties.single_source;
    }
    if (this._hasOutdatedData(sources)) {
      finalScore -= this.penalties.outdated_data;
    }
    return finalScore;
  }

  _hasDiversityConsensus(sources) {
    const domains = new Set();
    sources.forEach(source => {
      if (source.url) {
        domains.add(this._extractDomain(source.url));
      }
    });
    return domains.size >= 3;
  }

  _hasDPEvidence(deviceData) {
    return deviceData && deviceData.dpEvidence && 
           Object.keys(deviceData.dpEvidence).length > 0;
  }

  _hasRecentData(sources) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return sources.some(source => {
      if (source.date) {
        const sourceDate = new Date(source.date);
        return sourceDate > sixMonthsAgo;
      }
      return false;
    });
  }

  _detectContradictions(sources) {
    const capabilitySets = sources.map(s => s.capabilityHints || []);
    if (capabilitySets.length < 2) return false;
    for (let i = 0; i < capabilitySets.length - 1; i++) {
      for (let j = i + 1; j < capabilitySets.length; j++) {
        const set1 = new Set(capabilitySets[i]);
        const set2 = new Set(capabilitySets[j]);
        if (set1.size > 0 && set2.size > 0) {
          const intersection = new Set([...set1].filter(x => set2.has(x)));
          if (intersection.size === 0) return true;
        }
      }
    }
    return false;
  }

  _isSingleSourceNonLocal(sources) {
    if (sources.length !== 1) return false;
    const source = sources[0];
    return !['local_pairing_log', 'local_event_log'].includes(source.type);
  }

  _hasOutdatedData(sources) {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return sources.some(source => {
      if (source.date) {
        const sourceDate = new Date(source.date);
        return sourceDate > twoYearsAgo;
      }
      return false;
    });
  }

  _extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return url;
    }
  }

  getRecommendedStatus(score) {
    if (score >= 0.85) return 'confirmed';
    if (score >= 0.60) return 'proposed';
    return 'tracking';
  }

  generateScoringReport(deviceData, sources, score) {
    const status = this.getRecommendedStatus(score);
    return {
      deviceId: deviceData.manufacturerName + '_' + deviceData.productId,
      score: score,
      status: status,
      confidence: this._getConfidenceLevel(score),
      sources: sources.length,
      domains: new Set(sources.map(s => this._extractDomain(s.url || 'unknown'))).size,
      hasDPEvidence: this._hasDPEvidence(deviceData),
      hasContradictions: this._detectContradictions(sources),
      recommendations: this._generateRecommendations(score, sources),
      timestamp: new Date().toISOString()
    };
  }

  _getConfidenceLevel(score) {
    if (score >= 0.90) return 'excellent';
    if (score >= 0.80) return 'very_good';
    if (score >= 0.70) return 'good';
    if (score >= 0.60) return 'fair';
    return 'poor';
  }

  _generateRecommendations(score, sources) {
    const recommendations = [];
    if (score < 0.85) {
      if (sources.length < 3) {
        recommendations.push('Ajouter plus de sources indépendantes');
      }
      if (!this._hasDPEvidence({})) {
        recommendations.push('Fournir des preuves DP explicites');
      }
      if (this._hasOutdatedData(sources)) {
        recommendations.push('Mettre à jour les données obsolètes');
      }
    }
    return recommendations;
  }
}

module.exports = ScoringEngine;