/**
 * sources/local-files.js
 *
 * Pulls tickets from local files only:
 *   - master/docs/FORUM_ISSUES_*.md
 *   - master/docs/GITHUB_ISSUES_PR_ANALYSIS.md
 *   - master/docs/GITHUB_RESPONSES_FULL.md
 *   - master/CHANGELOG.md
 *   - master/.homeychangelog.json
 *   - master/data/bug-patterns.json
 *   - master/data/bug-fixes-report.json
 *
 * Returns array of ticket objects:
 *   { id, source, title, mfr, deviceIds, body, status }
 *
 * App cible: BOTH master + stable.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function pullFromLocalFiles(root) {
  const tickets = [];
  const files = [
    'docs/FORUM_ISSUES_ANALYSIS.md',
    'docs/FORUM_ISSUES_CONSOLIDATED.md',
    'docs/GITHUB_ISSUES_PR_ANALYSIS.md',
    'docs/GITHUB_RESPONSES_FULL.md',
    'docs/ISSUE_RESPONSES.md',
    'CHANGELOG.md',
    '.homeychangelog.json',
  ];

  for (const f of files) {
    const full = path.join(root, f);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, 'utf8');
    if (f.endsWith('.json')) {
      tickets.push(...extractTicketsFromJson(content, f));
    } else {
      tickets.push(...extractTicketsFromMarkdown(content, f));
    }
  }

  return tickets;
}

function extractTicketsFromJson(content, sourceFile) {
  // .homeychangelog.json is an array of {version, state, ...}
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data
        .filter((d) => d.state === 'processing_failed' || d.state === 'failed' || /transient/.test(d.message || ''))
        .map((d, i) => ({
          id: `changelog-${d.version || i}-${sourceFile}`,
          source: sourceFile,
          title: `Version ${d.version} — ${d.state}`,
          body: d.message || '',
          status: d.state,
          mfr: null,
          deviceIds: [],
        }));
    }
  } catch (e) {
    return [];
  }
  return [];
}

function extractTicketsFromMarkdown(content, sourceFile) {
  const tickets = [];
  // Look for GH #NNN, Forum #NNN, JB#NNN patterns
  const lines = content.split('\n');
  let currentTicket = null;

  for (const line of lines) {
    // Match issue/forum headers like "## #127 Tauno20 — WZ-M100"
    const headerMatch = line.match(/^#+\s*(#?\d+)\s*[—\-:]?\s*(.+)/);
    if (headerMatch) {
      if (currentTicket) tickets.push(currentTicket);
      currentTicket = {
        id: `${sourceFile}-${headerMatch[1]}-${headerMatch[2].substring(0, 50)}`,
        source: sourceFile,
        title: headerMatch[2].trim(),
        body: '',
        mfr: extractMfr(headerMatch[2] + ' ' + line),
        deviceIds: extractDeviceIds(headerMatch[2] + ' ' + line),
        status: 'open',
      };
    } else if (currentTicket) {
      // Accumulate body
      const mfrs = extractMfr(line);
      if (mfrs && !currentTicket.mfr) currentTicket.mfr = mfrs;
      const dids = extractDeviceIds(line);
      if (dids.length) currentTicket.deviceIds = [...currentTicket.deviceIds, ...dids];
      currentTicket.body += line + '\n';
    }
  }
  if (currentTicket) tickets.push(currentTicket);

  // Filter empty/closed
  return tickets.filter((t) => t.title && (t.mfr || t.deviceIds.length > 0 || t.body.length > 50));
}

function extractMfr(text) {
  // Match _TZ3000_xxx, _TZE200_xxx, etc.
  const m = text.match(/_(TZ\d|TZE\d|TYZB\d|TYST\d|Z[A-Z]{2})_[a-zA-Z0-9]+/);
  return m ? m[0] : null;
}

function extractDeviceIds(text) {
  // Match TS0601, TS0201, etc.
  const matches = text.match(/TS\d{4}[a-zA-Z]?/g);
  return matches ? [...new Set(matches)] : [];
}

module.exports = { pullFromLocalFiles };
