'use strict';

/**
 * SuggestionEngine - Non-Destructive Smart Adaptation
 * 
 * Instead of automatically removing/adding capabilities, this engine:
 * 1. Analyzes device clusters and capabilities
 * 2. Generates suggestions with confidence scores
 * 3. Logs recommendations to LogBuffer
 * 4. Sets needs_confirmation flag for manual review
 * 5. Optionally generates GitHub PR with proposed changes
 * 
 * CRITICAL: Never auto-removes capabilities without explicit confirmation
 */

class SuggestionEngine {
  constructor(homey, logBuffer) {
    this.homey = homey;
    this.logBuffer = logBuffer;
    this.suggestions = new Map(); // deviceId -> suggestions
  }
  
  /**
   * Analyze device and generate suggestions
   * @param {Object} device - ZigBee device instance
   * @param {Object} analysis - Cluster analysis from Smart-Adapt
   * @returns {Object} Suggestions with confidence scores
   */
  async analyzeDevice(device, analysis) {
    const deviceId = device.getData().id;
    const suggestions = {
      deviceId,
      deviceName: device.getName(),
      driver: device.driver?.id,
      timestamp: new Date().toISOString(),
      analysis,
      recommendations: [],
      confidence: 0,
      needsConfirmation: false,
      safeToApply: false
    };
    
    // Compare detected vs current capabilities
    const currentCaps = device.getCapabilities();
    const detectedRequired = analysis.required || [];
    const detectedOptional = analysis.optional || [];
    const detectedForbidden = analysis.forbidden || [];
    
    // Check for missing required capabilities
    detectedRequired.forEach(cap => {
      if (!currentCaps.includes(cap)) {
        suggestions.recommendations.push({
          type: 'ADD_CAPABILITY',
          capability: cap,
          reason: 'Required by hardware clusters',
          confidence: analysis.confidence || 0.5,
          safe: true, // Adding is usually safe
          priority: 'HIGH'
        });
      }
    });
    
    // Check for incorrect capabilities (forbidden)
    detectedForbidden.forEach(cap => {
      if (currentCaps.includes(cap)) {
        suggestions.recommendations.push({
          type: 'REMOVE_CAPABILITY',
          capability: cap,
          reason: 'Not supported by hardware clusters',
          confidence: analysis.confidence || 0.5,
          safe: false, // Removing is DANGEROUS!
          priority: 'CRITICAL',
          warning: '⚠️ DESTRUCTIVE: May break existing flows/automations'
        });
        suggestions.needsConfirmation = true; // FLAG FOR REVIEW
      }
    });
    
    // Check for optional capabilities
    detectedOptional.forEach(cap => {
      if (!currentCaps.includes(cap)) {
        suggestions.recommendations.push({
          type: 'ADD_OPTIONAL_CAPABILITY',
          capability: cap,
          reason: 'Supported but not enabled',
          confidence: analysis.confidence || 0.5,
          safe: true,
          priority: 'MEDIUM'
        });
      }
    });
    
    // Calculate overall confidence
    suggestions.confidence = this.calculateConfidence(suggestions, analysis);
    
    // Determine if safe to apply automatically
    suggestions.safeToApply = this.isSafeToApply(suggestions);
    
    // Store suggestions
    this.suggestions.set(deviceId, suggestions);
    
    // Log to buffer for MCP/AI analysis
    await this.logSuggestions(suggestions);
    
    return suggestions;
  }
  
  /**
   * Calculate overall confidence score
   * @param {Object} suggestions - Generated suggestions
   * @param {Object} analysis - Cluster analysis
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(suggestions, analysis) {
    let score = analysis.confidence || 0;
    
    // Reduce confidence if device info is incomplete
    if (analysis.manufacturer === 'Unknown' || analysis.model === 'Unknown') {
      score *= 0.7;
    }
    
    // Reduce confidence if there are destructive recommendations
    const hasDestructive = suggestions.recommendations.some(r => !r.safe);
    if (hasDestructive) {
      score *= 0.5;
    }
    
    // Increase confidence if all recommendations are additive
    const allAdditive = suggestions.recommendations.every(r => r.type.startsWith('ADD'));
    if (allAdditive && suggestions.recommendations.length > 0) {
      score = Math.min(1, score * 1.2);
    }
    
    return score;
  }
  
  /**
   * Determine if suggestions are safe to apply automatically
   * @param {Object} suggestions - Generated suggestions
   * @returns {boolean} True if safe
   */
  isSafeToApply(suggestions) {
    // Never auto-apply if confidence is low
    if (suggestions.confidence < 0.8) {
      return false;
    }
    
    // Never auto-apply if there are destructive recommendations
    const hasDestructive = suggestions.recommendations.some(r => !r.safe);
    if (hasDestructive) {
      return false;
    }
    
    // Never auto-apply if there are CRITICAL priority items
    const hasCritical = suggestions.recommendations.some(r => r.priority === 'CRITICAL');
    if (hasCritical) {
      return false;
    }
    
    // Safe if all recommendations are HIGH confidence additions
    const allSafe = suggestions.recommendations.every(r => 
      r.safe && r.confidence >= 0.8
    );
    
    return allSafe;
  }
  
  /**
   * Log suggestions to LogBuffer for MCP access
   * @param {Object} suggestions - Generated suggestions
   */
  async logSuggestions(suggestions) {
    if (!this.logBuffer) return;
    
    const message = [
      `SMART-ADAPT SUGGESTIONS for ${suggestions.deviceName}:`,
      `Confidence: ${(suggestions.confidence * 100).toFixed(0)}%`,
      `Safe to apply: ${suggestions.safeToApply ? 'YES' : 'NO'}`,
      `Needs confirmation: ${suggestions.needsConfirmation ? 'YES' : 'NO'}`,
      '',
      'Recommendations:',
      ...suggestions.recommendations.map((r, i) => 
        `  ${i + 1}. [${r.priority}] ${r.type}: ${r.capability} (${(r.confidence * 100).toFixed(0)}% confidence)`
      )
    ].join('\n');
    
    await this.logBuffer.push(
      suggestions.needsConfirmation ? 'WARN' : 'INFO',
      'SMART_ADAPT_SUGGESTION',
      message,
      suggestions.deviceName,
      { suggestions }
    );
  }
  
  /**
   * Apply suggestions with confirmation
   * @param {string} deviceId - Device ID
   * @param {Object} device - ZigBee device instance
   * @param {boolean} confirmed - User confirmed destructive changes
   * @returns {Object} Application result
   */
  async applySuggestions(deviceId, device, confirmed = false) {
    const suggestions = this.suggestions.get(deviceId);
    if (!suggestions) {
      return { success: false, error: 'No suggestions found' };
    }
    
    // Check if confirmation is required
    if (suggestions.needsConfirmation && !confirmed) {
      return {
        success: false,
        error: 'Confirmation required for destructive changes',
        suggestions
      };
    }
    
    const applied = [];
    const failed = [];
    
    for (const recommendation of suggestions.recommendations) {
      try {
        switch (recommendation.type) {
        case 'ADD_CAPABILITY':
        case 'ADD_OPTIONAL_CAPABILITY':
          if (!device.hasCapability(recommendation.capability)) {
            await device.addCapability(recommendation.capability);
            applied.push(recommendation);
              
            await this.logBuffer?.push(
              'INFO',
              'SMART_ADAPT_APPLIED',
              `Added capability: ${recommendation.capability}`,
              device.getName(),
              { recommendation }
            );
          }
          break;
            
        case 'REMOVE_CAPABILITY':
          // ONLY if confirmed and safe
          if (confirmed && device.hasCapability(recommendation.capability)) {
            await device.removeCapability(recommendation.capability);
            applied.push(recommendation);
              
            await this.logBuffer?.push(
              'WARN',
              'SMART_ADAPT_APPLIED',
              `⚠️ Removed capability: ${recommendation.capability} (USER CONFIRMED)`,
              device.getName(),
              { recommendation }
            );
          }
          break;
        }
      } catch (err) {
        failed.push({ recommendation, error: err.message });
        
        await this.logBuffer?.push(
          'ERROR',
          'SMART_ADAPT_ERROR',
          `Failed to apply: ${recommendation.type} ${recommendation.capability}: ${err.message}`,
          device.getName(),
          { recommendation, error: err.message }
        );
      }
    }
    
    return {
      success: true,
      applied,
      failed,
      suggestions
    };
  }
  
  /**
   * Get all suggestions
   * @returns {Array} All stored suggestions
   */
  getAllSuggestions() {
    return Array.from(this.suggestions.values());
  }
  
  /**
   * Get suggestions for specific device
   * @param {string} deviceId - Device ID
   * @returns {Object} Suggestions or null
   */
  getSuggestions(deviceId) {
    return this.suggestions.get(deviceId) || null;
  }
  
  /**
   * Clear suggestions for device
   * @param {string} deviceId - Device ID
   */
  clearSuggestions(deviceId) {
    this.suggestions.delete(deviceId);
  }
  
  /**
   * Generate GitHub PR description
   * @param {Object} suggestions - Suggestions to include in PR
   * @returns {string} Markdown PR description
   */
  generatePRDescription(suggestions) {
    const lines = [
      `# 🤖 Smart-Adapt Suggestions: ${suggestions.deviceName}`,
      '',
      `**Device ID:** \`${suggestions.deviceId}\``,
      `**Driver:** \`${suggestions.driver}\``,
      `**Confidence:** ${(suggestions.confidence * 100).toFixed(0)}%`,
      `**Safe to Apply:** ${suggestions.safeToApply ? '✅ YES' : '⚠️ NO - Requires Review'}`,
      '',
      '## 📊 Analysis',
      '',
      '```json',
      JSON.stringify(suggestions.analysis, null, 2),
      '```',
      '',
      '## 💡 Recommendations',
      ''
    ];
    
    suggestions.recommendations.forEach((r, i) => {
      lines.push(`### ${i + 1}. ${r.type}: \`${r.capability}\``);
      lines.push('');
      lines.push(`- **Priority:** ${r.priority}`);
      lines.push(`- **Confidence:** ${(r.confidence * 100).toFixed(0)}%`);
      lines.push(`- **Safe:** ${r.safe ? '✅ YES' : '⚠️ NO'}`);
      lines.push(`- **Reason:** ${r.reason}`);
      if (r.warning) {
        lines.push(`- **⚠️ Warning:** ${r.warning}`);
      }
      lines.push('');
    });
    
    lines.push('## 🔍 Review Checklist');
    lines.push('');
    lines.push('- [ ] Verify hardware actually supports these capabilities');
    lines.push('- [ ] Check if removing capabilities breaks existing flows');
    lines.push('- [ ] Test on real device before merging');
    lines.push('- [ ] Update driver documentation if needed');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*Generated automatically by SuggestionEngine*');
    lines.push(`*Timestamp: ${suggestions.timestamp}*`);
    
    return lines.join('\n');
  }
  
  /**
   * Export all suggestions for MCP/AI
   * @returns {Object} Structured export
   */
  exportForMCP() {
    return {
      version: '1.0.0',
      exported: new Date().toISOString(),
      suggestions: {
        total: this.suggestions.size,
        needingConfirmation: Array.from(this.suggestions.values())
          .filter(s => s.needsConfirmation).length,
        safeToApply: Array.from(this.suggestions.values())
          .filter(s => s.safeToApply).length,
        entries: Array.from(this.suggestions.values())
      },
      mcp: {
        protocol: 'smart-adapt-suggestions',
        readable: true,
        canAutoApply: false // Requires manual intervention
      }
    };
  }
}

module.exports = SuggestionEngine;
