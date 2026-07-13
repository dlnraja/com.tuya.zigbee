#!/usr/bin/env node
'use strict';

/**
 * P26.6.3 — Build Temporal Cross-Reference
 *
 * Combines forum topics + GH issues with timestamps.
 * Finds patterns:
 * - Bugs reported in forum vs when fixed in GH
 * - Time between bug report and fix
 * - Recurring themes over time
 * - Button-related issues cross-referenced
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';

const forum = JSON.parse(fs.readFileSync(path.join(STATE_DIR, 'forum-topics-detailed.json'), 'utf8'));
const issues = JSON.parse(fs.readFileSync(path.join(STATE_DIR, 'all-issues-timestamped.json'), 'utf8'));

// Filter for button-related
const BUTTON_KEYWORDS = ['button', 'TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS0046', 'TS004F', 'press', 'click', 'flow card', 'trigger', 'wireless switch', 'scene', 'smart knob', 'rotary', 'fingerprint', 'press', 'flow_trigger', 'genScenes'];

const buttonForum = forum.filter(t =>
  BUTTON_KEYWORDS.some(kw => t.title.toLowerCase().includes(kw.toLowerCase()))
);

const buttonIssues = issues.filter(i =>
  BUTTON_KEYWORDS.some(kw =>
    i.title.toLowerCase().includes(kw.toLowerCase()) ||
    (i.body && i.body.toLowerCase().includes(kw.toLowerCase()))
  )
);

// Build cross-reference
const crossRef = {
  meta: {
    generatedAt: new Date().toISOString(),
    totalForumTopics: forum.length,
    totalIssues: issues.length,
    buttonForumTopics: buttonForum.length,
    buttonIssues: buttonIssues.length,
  },
  forum: buttonForum.map(t => ({
    id: t.id,
    title: t.title,
    createdAt: t.createdAt,
    lastPostedAt: t.lastPostedAt,
    postsCount: t.postsCount,
    age_days: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 86400000),
  })),
  issues: buttonIssues.map(i => ({
    number: i.number,
    title: i.title,
    state: i.state,
    createdAt: i.createdAt,
    closedAt: i.closedAt,
    labels: (i.labels || []).map(l => l.name),
    timeToFix_days: i.closedAt ? Math.floor((new Date(i.closedAt).getTime() - new Date(i.createdAt).getTime()) / 86400000) : null,
  })),
  patterns: {
    // Bugs that took longest to fix
    slowestFixes: [],
    // Recurring themes (issue keywords count)
    recurringThemes: {},
    // Activity by year
    activityByYear: {},
  },
};

// Slowest fixes
crossRef.patterns.slowestFixes = buttonIssues
  .filter(i => i.timeToFix_days !== null)
  .sort((a, b) => b.timeToFix_days - a.timeToFix_days)
  .slice(0, 5);

// Recurring themes
for (const i of buttonIssues) {
  for (const kw of BUTTON_KEYWORDS) {
    if (i.title.toLowerCase().includes(kw.toLowerCase())) {
      crossRef.patterns.recurringThemes[kw] = (crossRef.patterns.recurringThemes[kw] || 0) + 1;
    }
  }
}

// Activity by year
for (const i of buttonIssues) {
  const year = i.createdAt.substring(0, 4);
  crossRef.patterns.activityByYear[year] = (crossRef.patterns.activityByYear[year] || 0) + 1;
}
for (const t of buttonForum) {
  const year = t.createdAt.substring(0, 4);
  crossRef.patterns.activityByYear[year] = (crossRef.patterns.activityByYear[year] || 0) + 1;
}

// Temporal correlation
const TEMPORAL_CORRELATIONS = [];
// Find pairs of (forum post date, issue date) within 30 days
for (const t of buttonForum) {
  for (const i of buttonIssues) {
    const dt = Math.abs(new Date(t.createdAt).getTime() - new Date(i.createdAt).getTime());
    if (dt < 30 * 86400000) {
      TEMPORAL_CORRELATIONS.push({
        forumId: t.id,
        forumTitle: t.title,
        forumDate: t.createdAt,
        issueNumber: i.number,
        issueTitle: i.title,
        issueDate: i.createdAt,
        gapDays: Math.floor(dt / 86400000),
      });
    }
  }
}
crossRef.temporalCorrelations = TEMPORAL_CORRELATIONS
  .sort((a, b) => a.gapDays - b.gapDays)
  .slice(0, 30);

// Save
fs.writeFileSync(
  path.join(STATE_DIR, 'temporal-cross-reference.json'),
  JSON.stringify(crossRef, null, 2)
);

console.log('=== Temporal Cross-Reference ===\n');
console.log(`Forum topics (button): ${buttonForum.length}`);
console.log(`GitHub issues (button): ${buttonIssues.length}`);
console.log(`Total correlations: ${TEMPORAL_CORRELATIONS.length}`);

console.log('\n=== Slowest Fixes (GH issues) ===');
for (const i of crossRef.patterns.slowestFixes) {
  console.log(`  #${i.number} ${i.title} (${i.timeToFix_days} days, ${i.state})`);
}

console.log('\n=== Recurring Themes ===');
const themes = Object.entries(crossRef.patterns.recurringThemes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
for (const [k, v] of themes) {
  console.log(`  ${k}: ${v}`);
}

console.log('\n=== Activity by Year ===');
const years = Object.keys(crossRef.patterns.activityByYear).sort();
for (const y of years) {
  const count = crossRef.patterns.activityByYear[y];
  console.log(`  ${y}: ${'#'.repeat(Math.min(count, 60))} (${count})`);
}

console.log('\n=== Top 10 Temporal Correlations (forum+issue within 30 days) ===');
for (const c of crossRef.patterns && crossRef.temporalCorrelations.slice(0, 10) || []) {
  console.log(`  ${c.forumDate.substring(0, 10)} Forum #${c.forumId} ↔ ${c.issueDate.substring(0, 10)} Issue #${c.issueNumber} (gap ${c.gapDays}d)`);
  console.log(`    Forum: ${c.forumTitle.substring(0, 70)}`);
  console.log(`    Issue: ${c.issueTitle.substring(0, 70)}`);
}

console.log(`\nOutput: ${path.join(STATE_DIR, 'temporal-cross-reference.json')}`);
