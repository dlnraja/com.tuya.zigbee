'use strict';

/**
 * ProjectTimeline.js - Temporal Consciousness: Timeline Engine
 *
 * Tracks all project evolution over time: commits, PRs, issues, forum posts.
 * Stores evolution history in a local cache and provides time-windowed queries.
 *
 * Part of the Tuya Unified Zigbee Temporal Consciousness System (Layer T0).
 *
 * @module lib/temporal/ProjectTimeline
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_DIR = path.join(__dirname, '..', '..', '.ai', 'cache');
const TIMELINE_CACHE = path.join(CACHE_DIR, 'timeline-cache.json');
const DEFAULT_WINDOW_DAYS = 30;
const WINDOWS = [7, 30, 90, 180, 365];

// Commit classification patterns
const CLASSIFICATION_PATTERNS = {
  feature: {
    prefixes: ['feat:', 'feat(', 'feature:', 'add:', 'implement:', 'new:'],
    issuePatterns: [],
  },
  bugfix: {
    prefixes: ['fix:', 'fix(', 'bugfix:', 'hotfix:', 'patch:'],
    issuePatterns: [/issue\s*#?\d+/i, /bug\s*#?\d+/i, /#\d+/],
  },
  regression: {
    prefixes: ['revert:', 'revert ', 'regression:', 'rollback:'],
    issuePatterns: [/revert/i, /regression/i],
  },
  documentation: {
    prefixes: ['docs:', 'doc:', 'readme:', 'changelog:'],
    issuePatterns: [],
  },
  chore: {
    prefixes: ['chore:', 'ci:', 'build:', 'refactor:', 'style:', 'test:', 'perf:'],
    issuePatterns: [],
  },
  release: {
    prefixes: ['v9.', 'v8.', 'v7.', 'release:'],
    issuePatterns: [/v\d+\.\d+\.\d+/],
  },
  enrichment: {
    prefixes: ['enrichment:', 'enrich:', 'sync:', 'api discovery:'],
    issuePatterns: [],
  },
};

// Issue number extraction
const ISSUE_REGEX = /#(\d+)/g;
const FORUM_REGEX = /(?:forum|post)\s*#?(\d+)/gi;
const PR_REGEX = /(?:pull|pr)\s*#?(\d+)/gi;

class ProjectTimeline {
  /**
   * @param {object} [options]
   * @param {string} [options.repoRoot] - Repository root directory
   * @param {number} [options.cacheTTL] - Cache TTL in ms (default: 4h)
   */
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || path.join(__dirname, '..', '..');
    this.cacheTTL = options.cacheTTL || 4 * 60 * 60 * 1000; // 4 hours
    this._cache = null;
    this._loadCache();
  }

  // =========================================================================
  // CACHE MANAGEMENT
  // =========================================================================

  /**
   * Load the timeline cache from disk.
   * @private
   */
  _loadCache() {
    try {
      if (fs.existsSync(TIMELINE_CACHE)) {
        const raw = fs.readFileSync(TIMELINE_CACHE);
        this._cache = JSON.parse(raw);
        // Validate cache freshness
        const age = Date.now() - new Date(this._cache.generatedAt || 0).getTime();
        if (age > this.cacheTTL) {
          this._cache.stale = true;
        }
      }
    } catch (err) {
      // Cache corrupted - will regenerate
      this._cache = null;
    }

    if (!this._cache) {
      this._cache = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        stale: true,
        commits: [],
        classifications: {},
        regressions: [],
        issues: [],
        releases: [],
      };
    }
  }

  /**
   * Persist the timeline cache to disk.
   * @private
   */
  _saveCache() {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      this._cache.generatedAt = new Date().toISOString();
      this._cache.stale = false;
      fs.writeFileSync(TIMELINE_CACHE, JSON.stringify(this._cache, null, 2));
    } catch (err) {
      // Non-fatal: cache is a performance optimization
      if (typeof console !== 'undefined') {
        console.warn(`[ProjectTimeline] Cache write failed: ${err.message}`);
      }
    }
  }

  /**
   * Check if the cache is stale and needs refresh.
   * @returns {boolean}
   */
  isStale() {
    return this._cache.stale === true;
  }

  // =========================================================================
  // DATA COLLECTION (Git)
  // =========================================================================

  /**
   * Collect commit data from git log.
   * @param {number} [days=365] - How many days of history to collect
   * @returns {Array<object>} Commits with metadata
   */
  collectCommits(days = 365) {
    try {
      const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      const format = '%H|%ai|%an|%s';
      const cmd = `git log --format="${format}" --since="${since}" --no-merges`;
      const output = execSync(cmd, {
        cwd: this.repoRoot,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
      }).trim();

      if (!output) return [];

      const commits = output.split('\n').map((line) => {
        const [hash, date, author, ...msgParts] = line.split('|');
        const message = msgParts.join('|');
        return {
          hash: (hash || '').trim(),
          date: (date || '').trim(),
          author: (author || '').trim(),
          message: message.trim(),
          classification: this._classifyCommit(message),
          issues: this._extractIssues(message),
          type: this._detectCommitType(message),
        };
      });

      this._cache.commits = commits;
      return commits;
    } catch (err) {
      return this._cache.commits || [];
    }
  }

  /**
   * Collect release history from tags and version-bump commits.
   * @returns {Array<object>} Release entries
   */
  collectReleases() {
    try {
      const cmd = 'git log --format="%H|%ai|%s" --all --grep="^v9\\." --grep="^v8\\." --grep="bump version"';
      const output = execSync(cmd, {
        cwd: this.repoRoot,
        encoding: 'utf8',
        maxBuffer: 5 * 1024 * 1024,
        timeout: 15000,
      }).trim();

      if (!output) return [];

      const versionRegex = /v?(\d+\.\d+\.\d+)/;
      const releases = output.split('\n').map((line) => {
        const [hash, date, ...msgParts] = line.split('|');
        const message = msgParts.join('|');
        const match = message.match(versionRegex);
        return {
          hash: (hash || '').trim(),
          date: (date || '').trim(),
          version: match ? match[1] : 'unknown',
          message: message.trim(),
        };
      }).filter((r) => r.version !== 'unknown');

      // Extract driver/FP counts from release messages
      for (const release of releases) {
        const driverMatch = release.message.match(/(\d+)\s*drivers/i);
        const fpMatch = release.message.match(/(\d+)\s*FPs/i);
        release.drivers = driverMatch ? parseInt(driverMatch[1], 10) : null;
        release.fingerprints = fpMatch ? parseInt(fpMatch[1], 10) : null;
      }

      this._cache.releases = releases;
      return releases;
    } catch (err) {
      return this._cache.releases || [];
    }
  }

  /**
   * Collect PR merge history.
   * @param {number} [days=90]
   * @returns {Array<object>}
   */
  collectPRs(days = 90) {
    try {
      const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      const cmd = `git log --format="%H|%ai|%s" --since="${since}" --merges`;
      const output = execSync(cmd, {
        cwd: this.repoRoot,
        encoding: 'utf8',
        maxBuffer: 5 * 1024 * 1024,
        timeout: 15000,
      }).trim();

      if (!output) return [];

      const prRegex = /Merge pull request #(\d+)/;
      return output.split('\n').map((line) => {
        const [hash, date, ...msgParts] = line.split('|');
        const message = msgParts.join('|');
        const prMatch = message.match(prRegex);
        return {
          hash: (hash || '').trim(),
          date: (date || '').trim(),
          prNumber: prMatch ? parseInt(prMatch[1], 10) : null,
          message: message.trim(),
        };
      }).filter((pr) => pr.prNumber !== null);
    } catch (err) {
      return [];
    }
  }

  // =========================================================================
  // CLASSIFICATION ENGINE
  // =========================================================================

  /**
   * Classify a commit message into a category.
   * @param {string} message
   * @returns {string} Category name
   * @private
   */
  _classifyCommit(message) {
    const lower = message.toLowerCase();

    // Check each classification pattern (order matters: more specific first)
    for (const [category, config] of Object.entries(CLASSIFICATION_PATTERNS)) {
      for (const prefix of config.prefixes) {
        if (lower.startsWith(prefix) || lower.includes(` ${prefix}`)) {
          return category;
        }
      }
    }

    // Fallback: check for version patterns
    if (/^v?\d+\.\d+\.\d+/.test(message)) return 'release';

    return 'other';
  }

  /**
   * Extract issue/PR/forum references from a commit message.
   * @param {string} message
   * @returns {object} { issues: number[], forumPosts: number[], prs: number[] }
   * @private
   */
  _extractIssues(message) {
    const issues = [];
    const forumPosts = [];
    const prs = [];

    let match;
    // GitHub issues
    const issueCopy = message;
    while ((match = ISSUE_REGEX.exec(issueCopy)) !== null) {
      const num = parseInt(match[1], 10);
      if (num > 0 && num < 100000) issues.push(num);
    }

    // Forum posts
    FORUM_REGEX.lastIndex = 0;
    while ((match = FORUM_REGEX.exec(message)) !== null) {
      forumPosts.push(parseInt(match[1], 10));
    }

    // PRs
    PR_REGEX.lastIndex = 0;
    while ((match = PR_REGEX.exec(message)) !== null) {
      prs.push(parseInt(match[1], 10));
    }

    return { issues, forumPosts, prs };
  }

  /**
   * Detect the high-level type of a commit.
   * @param {string} message
   * @returns {string} 'human' | 'bot' | 'automated'
   * @private
   */
  _detectCommitType(message) {
    const lower = message.toLowerCase();
    const botIndicators = ['[skip ci]', 'changelog sync', 'diagnostics update', 'enrichment v', 'api discovery', 'resolved issues +'];
    for (const indicator of botIndicators) {
      if (lower.includes(indicator)) return 'bot';
    }
    if (lower.startsWith('chore:')) return 'automated';
    return 'human';
  }

  // =========================================================================
  // QUERY METHODS
  // =========================================================================

  /**
   * Get changes within a time window.
   * @param {number} [days=30] - Window in days
   * @returns {object} Aggregated changes
   */
  getChangesInWindow(days = DEFAULT_WINDOW_DAYS) {
    const cutoff = new Date(Date.now() - days * 86400000);
    const commits = (this._cache.commits || []).filter(
      (c) => new Date(c.date) >= cutoff
    );

    return {
      window: `${days} days`,
      totalCommits: commits.length,
      humanCommits: commits.filter((c) => c.type === 'human').length,
      botCommits: commits.filter((c) => c.type === 'bot').length,
      byCategory: this._groupBy(commits, 'classification'),
      uniqueAuthors: [...new Set(commits.map((c) => c.author))],
      issuesReferenced: this._flattenIssues(commits),
      topFiles: this._getChangedFiles(cutoff),
    };
  }

  /**
   * Get regressions detected in a time window.
   * Regressions = reverts, rollbacks, or commits mentioning "regression".
   * @param {number} [days=90]
   * @returns {Array<object>}
   */
  getRegressions(days = 90) {
    const cutoff = new Date(Date.now() - days * 86400000);
    return (this._cache.commits || []).filter((c) => {
      if (new Date(c.date) < cutoff) return false;
      return (
        c.classification === 'regression' ||
        /revert/i.test(c.message) ||
        /regression/i.test(c.message) ||
        /rollback/i.test(c.message)
      );
    });
  }

  /**
   * Get features added in a time window.
   * @param {number} [days=30]
   * @returns {Array<object>}
   */
  getFeaturesAdded(days = DEFAULT_WINDOW_DAYS) {
    const cutoff = new Date(Date.now() - days * 86400000);
    return (this._cache.commits || []).filter(
      (c) => new Date(c.date) >= cutoff && c.classification === 'feature'
    );
  }

  /**
   * Get bugs fixed in a time window.
   * @param {number} [days=30]
   * @returns {Array<object>}
   */
  getBugsFixed(days = DEFAULT_WINDOW_DAYS) {
    const cutoff = new Date(Date.now() - days * 86400000);
    return (this._cache.commits || []).filter(
      (c) => new Date(c.date) >= cutoff && c.classification === 'bugfix'
    );
  }

  /**
   * Get releases in a time window.
   * @param {number} [days=90]
   * @returns {Array<object>}
   */
  getReleases(days = 90) {
    const cutoff = new Date(Date.now() - days * 86400000);
    return (this._cache.releases || []).filter(
      (r) => new Date(r.date) >= cutoff
    );
  }

  /**
   * Generate a full temporal summary across all standard windows.
   * @returns {object}
   */
  getFullSummary() {
    const summary = {
      generatedAt: new Date().toISOString(),
      windows: {},
    };

    for (const days of WINDOWS) {
      const changes = this.getChangesInWindow(days);
      summary.windows[`${days}d`] = {
        commits: changes.totalCommits,
        human: changes.humanCommits,
        bot: changes.botCommits,
        features: this.getFeaturesAdded(days).length,
        bugfixes: this.getBugsFixed(days).length,
        regressions: this.getRegressions(days).length,
        releases: this.getReleases(days).length,
        categories: changes.byCategory,
      };
    }

    return summary;
  }

  // =========================================================================
  // FULL REFRESH
  // =========================================================================

  /**
   * Perform a full refresh of all timeline data from git.
   * @param {number} [days=365]
   * @returns {object} Summary of collected data
   */
  refresh(days = 365) {
    const commits = this.collectCommits(days);
    const releases = this.collectReleases();
    const prs = this.collectPRs(Math.min(days, 90));

    this._saveCache();

    return {
      commits: commits.length,
      releases: releases.length,
      prs: prs.length,
      cacheFile: TIMELINE_CACHE,
    };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  /**
   * Group an array of objects by a key.
   * @param {Array<object>} arr
   * @param {string} key
   * @returns {object}
   * @private
   */
  _groupBy(arr, key) {
    const groups = {};
    for (const item of arr) {
      const val = item[key] || 'unknown';
      if (!groups[val]) groups[val] = 0;
      groups[val]++;
    }
    return groups;
  }

  /**
   * Flatten all issue references from a list of commits.
   * @param {Array<object>} commits
   * @returns {number[]} Unique issue numbers
   * @private
   */
  _flattenIssues(commits) {
    const set = new Set();
    for (const c of commits) {
      if (c.issues && c.issues.issues) {
        for (const num of c.issues.issues) set.add(num);
      }
    }
    return [...set].sort((a, b) => a - b);
  }

  /**
   * Get most-changed files since a cutoff date.
   * @param {Date} cutoff
   * @param {number} [limit=20]
   * @returns {Array<{file: string, changes: number}>}
   * @private
   */
  _getChangedFiles(cutoff, limit = 20) {
    try {
      const since = cutoff.toISOString().split('T')[0];
      const cmd = `git log --since="${since}" --name-only --pretty=format: --no-merges`;
      const output = execSync(cmd, {
        cwd: this.repoRoot,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
      }).trim();

      if (!output) return [];

      const counts = {};
      for (const line of output.split('\n')) {
        const file = line.trim();
        if (file) {
          counts[file] = (counts[file] || 0) + 1;
        }
      }

      return Object.entries(counts)
        .map(([file, changes]) => ({ file, changes }))
        .sort((a, b) => b.changes - a.changes)
        .slice(0, limit);
    } catch (err) {
      return [];
    }
  }
}

module.exports = ProjectTimeline;
