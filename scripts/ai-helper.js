#!/usr/bin/env node
'use strict';

/**
 * AI Helper - Utility for AI-assisted diagnostics and improvement suggestions
 * Used by GitHub Actions to analyze logs, suggest fixes, and enrich data
 * 
 * v7.5.4: Initial implementation
 */

const fs = require('fs');
const path = require('path');

class AIHelper {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
  }

  /**
   * Analyze error patterns from diagnostic logs
   */
  analyzeErrorPatterns(logs) {
    const patterns = {};
    for (const log of logs) {
      const key = this._extractPattern(log);
      if (key) {
        patterns[key] = (patterns[key] || 0) + 1;
      }
    }
    return Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([pattern, count]) => ({ pattern, count, severity: this._classifySeverity(pattern) }));
  }

  /**
   * Suggest fixes for common error patterns
   */
  suggestFixes(errorPatterns) {
    const suggestions = [];
    for (const { pattern, count, severity } of errorPatterns) {
      const fix = this._getKnownFix(pattern);
      if (fix) {
        suggestions.push({ pattern, count, severity, fix });
      }
    }
    return suggestions;
  }

  /**
   * Extract error pattern from log line
   */
  _extractPattern(log) {
    if (!log || typeof log !== 'string') return null;
    // Remove timestamps, PIDs, and variable data
    return log
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '')
      .replace(/pid=\d+/gi, '')
      .replace(/0x[0-9a-f]+/gi, '')
      .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '<IP>')
      .trim()
      .substring(0, 200);
  }

  /**
   * Classify error severity
   */
  _classifySeverity(pattern) {
    if (/crash|fatal|cannot find module|invalid_state/i.test(pattern)) return 'critical';
    if (/error|failed|timeout/i.test(pattern)) return 'high';
    if (/warn|deprecated/i.test(pattern)) return 'medium';
    return 'low';
  }

  /**
   * Get known fix for common patterns
   */
  _getKnownFix(pattern) {
    const fixes = {
      'Cannot find module': 'Check require() path and ensure file exists in build',
      'invalid_state': 'Ensure markReady() is called in onInit()',
      'Cannot access `this.homey.app`': 'App destroyed before cleanup - check onUninit()',
      'MODULE_NOT_FOUND': 'Circular dependency or missing file - check require chain',
      'MaxListenersExceeded': 'Increase EventEmitter.defaultMaxListeners or fix leak',
      'setUnavailable': 'Device may be phantom - check subDeviceId',
      'NaN': 'Use safeParse/safeDivide/safeMultiply from tuyaUtils',
    };
    for (const [key, fix] of Object.entries(fixes)) {
      if (pattern.includes(key)) return fix;
    }
    return null;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const helper = new AIHelper({ dryRun: args.includes('--dry-run'), verbose: args.includes('--verbose') });
  
  if (args.includes('--analyze')) {
    const logFile = args[args.indexOf('--analyze') + 1];
    if (logFile && fs.existsSync(logFile)) {
      const logs = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
      const patterns = helper.analyzeErrorPatterns(logs);
      const suggestions = helper.suggestFixes(patterns);
      console.log(JSON.stringify({ patterns, suggestions }, null, 2));
    } else {
      console.error('Usage: node ai-helper.js --analyze <logfile>');
      process.exit(1);
    }
  } else {
    console.log('AI Helper v7.5.4 - Usage: node ai-helper.js --analyze <logfile> [--dry-run] [--verbose]');
  }
}

module.exports = AIHelper;