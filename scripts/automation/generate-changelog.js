#!/usr/bin/env node
'use strict';
// v9.0.40: Auto Changelog Generator
// Analyzes git commits and generates .homeychangelog.json
// Designed for the TITAN Protocol monthly audit workflow

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.join(__dirname, '..', '..', '.homeychangelog.json');

/**
 * Get commits since a given date
 * @param {string} since - Date string (e.g., '2026-05-01')
 * @returns {Array<{hash, date, message, type, scope}>}
 */
function getCommitsSince(since) {
  try {
    const raw = execSync(
      `git log --since="${since}" --format="%H|%aI|%s" --no-merges`,
      { encoding: 'utf8', cwd: path.join(__dirname, '..', '..') }
    ).trim();

    if (!raw) return [];

    return raw.split('\n').map(line => {
      const [hash, date, ...msgParts] = line.split('|');
      const message = msgParts.join('|');

      // Parse conventional commit format
      const match = message.match(/^(\w+)(?:\(([^)]+)\))?[!]?:\s*(.+)/);
      const type = match ? match[1] : 'other';
      const scope = match ? match[2] : null;
      const description = match ? match[3] : message;

      return {
        hash: hash.substring(0, 7),
        date: date.substring(0, 10),
        message,
        type,
        scope,
        description,
      };
    });
  } catch (e) {
    return [];
  }
}

/**
 * Categorize commits by type
 */
function categorizeCommits(commits) {
  const categories = {
    feat: [],     // New features
    fix: [],      // Bug fixes
    docs: [],     // Documentation
    chore: [],    // Maintenance
    refactor: [], // Refactoring
    perf: [],     // Performance
    test: [],     // Tests
    ci: [],       // CI/CD
    other: [],    // Uncategorized
  };

  for (const commit of commits) {
    const cat = categories[commit.type] ? commit.type : 'other';
    categories[cat].push(commit);
  }

  return categories;
}

/**
 * Generate changelog entry for a version
 */
function generateVersionEntry(commits, version) {
  const categories = categorizeCommits(commits);

  const entry = {
    version,
    date: new Date().toISOString().substring(0, 10),
    summary: `${commits.length} commits`,
    changes: {},
  };

  if (categories.feat.length > 0) {
    entry.changes.features = categories.feat.map(c => c.description);
  }
  if (categories.fix.length > 0) {
    entry.changes.fixes = categories.fix.map(c => c.description);
  }
  if (categories.docs.length > 0) {
    entry.changes.docs = categories.docs.map(c => c.description);
  }
  if (categories.chore.length > 0) {
    entry.changes.maintenance = categories.chore.map(c => c.description);
  }
  if (categories.refactor.length > 0) {
    entry.changes.refactoring = categories.refactor.map(c => c.description);
  }
  if (categories.perf.length > 0) {
    entry.changes.performance = categories.perf.map(c => c.description);
  }

  return entry;
}

/**
 * Main
 */
function main() {
  const since = process.argv[2] || '30 days ago';
  const version = process.argv[3] || 'auto';

  console.log(`📝 Generating changelog since: ${since}`);

  const commits = getCommitsSince(since);
  console.log(`   Found ${commits.length} commits`);

  if (commits.length === 0) {
    console.log('   No commits found. Exiting.');
    return;
  }

  // Read existing changelog
  let changelog = { versions: [] };
  if (fs.existsSync(CHANGELOG_PATH)) {
    try {
      const content = fs.readFileSync(CHANGELOG_PATH, 'utf8');
      const parsed = JSON.parse(content);
      changelog = parsed && parsed.versions ? parsed : { versions: [] };
    } catch (e) {
      console.log('   ⚠️ Existing changelog corrupted, creating new one');
    }
  }

  // Generate new entry
  const entry = generateVersionEntry(commits, version);

  // Add to changelog (newest first)
  changelog.versions.unshift(entry);

  // Keep only last 12 versions
  changelog.versions = changelog.versions.slice(0, 12);

  // Write
  fs.writeFileSync(CHANGELOG_PATH, JSON.stringify(changelog, null, 2));
  console.log(`   ✅ Changelog updated: ${CHANGELOG_PATH}`);
  console.log(`   Version: ${entry.version}`);
  console.log(`   Changes: ${Object.values(entry.changes).flat().length}`);
}

main();
