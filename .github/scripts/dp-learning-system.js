// .github/scripts/dp-learning-system.js
// Machine learning-inspired DP pattern recognition

const fs = require('fs');
const path = require('path');

class DPLearningSystem {
  constructor() {
    this.knownPatterns = this.loadPatterns();
    this.newObservations = [];
  }
  
  loadPatterns() {
    const patternsFile = path.join(__dirname, '../../data/dp-learned-patterns.json');
    if (fs.existsSync(patternsFile)) {
      return JSON.parse(fs.readFileSync(patternsFile, 'utf8'));
    }
    return {};
  }
  
  observeDP(dp, value, dataType, manufacturerName, driverType, capability) {
    const observation = {
      dp,
      value,
      dataType,
      manufacturerName,
      driverType,
      capability,
      timestamp: Date.now()
    };
    
    this.newObservations.push(observation);
    
    // Cluster similar observations
    const key = `${dp}_${dataType}_${driverType}`;
    if (!this.knownPatterns[key]) {
      this.knownPatterns[key] = {
        dp,
        dataType,
        driverType,
        observations: [],
        commonCapability: null,
        confidence: 0
      };
    }
    
    this.knownPatterns[key].observations.push(observation);
    
    // Auto-detect common capability
    const capabilities = this.knownPatterns[key].observations.map(o => o.capability);
    const capCounts = {};
    capabilities.forEach(c => {
      capCounts[c] = (capCounts[c] || 0) + 1;
    });
    
    const mostCommon = Object.keys(capCounts).reduce((a, b) => 
      capCounts[a] > capCounts[b] ? a : b
    );
    
    this.knownPatterns[key].commonCapability = mostCommon;
    this.knownPatterns[key].confidence = safeDivide(capCounts[mostCommon], capabilities.length);
  }
  
  predictCapability(dp, dataType, driverType) {
    const key = `${dp}_${dataType}_${driverType}`;
    const pattern = this.knownPatterns[key];
    
    if (pattern && pattern.confidence > 0.8) {
      return {
        capability: pattern.commonCapability,
        confidence: pattern.confidence
      };
    }
    
    return null;
  }
  
  savePatterns() {
    const patternsFile = path.join(__dirname, '../../data/dp-learned-patterns.json');
    fs.writeFileSync(patternsFile, JSON.stringify(this.knownPatterns, null, 2));
  }
}

module.exports = { DPLearningSystem };
