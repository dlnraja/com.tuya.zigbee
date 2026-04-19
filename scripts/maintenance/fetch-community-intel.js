#!/usr/bin/env node
/**
 * 
 *   COMMUNITY INTEL SCRAPER v1.0                                             
 *   Fetches all open Issues, PRs, and Comments into a single intelligence     
 *   snapshot for AI analysis.                                                 
 * 
 */
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, 'data', 'community-intel.json');
const REPORT_FILE = path.join(ROOT, 'REPORTS', 'COMMUNITY-INTELLIGENCE.md');

function gh(cmd) {
  try {
    return execSync(`gh ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    console.error(`Error running gh ${cmd}: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log(' Starting Community Intelligence Gathering...');

  if (!fs.existsSync(path.join(ROOT, 'data'))) fs.mkdirSync(path.join(ROOT, 'data'));
  if (!fs.existsSync(path.join(ROOT, 'REPORTS'))) fs.mkdirSync(path.join(ROOT, 'REPORTS'));

  // 1. Fetch Issues
  console.log('   Fetching Open Issues...');
  const issuesRaw = gh('issue list --json number,title,body,createdAt,author --state open --limit 50');
  const issues = JSON.parse(issuesRaw || '[]');

  for (const issue of issues) {
    console.log(`    - Issue #${issue.number}: ${issue.title}`);
    const commentsRaw = gh(`issue view ${issue.number} --json comments`);
    issue.comments = JSON.parse(commentsRaw || '{"comments":[]}').comments;
  }

  // 2. Fetch PRs
  console.log('   Fetching Open Pull Requests...');
  const prsRaw = gh('pr list --json number,title,body,createdAt,author,state --state open --limit 20');
  const prs = JSON.parse(prsRaw || '[]');

  for (const pr of prs) {
    console.log(`    - PR #${pr.number}: ${pr.title}`);
    const commentsRaw = gh(`pr view ${pr.number} --json comments,reviews,mergeable,commits`);
    const details = JSON.parse(commentsRaw || '{}');
    pr.comments = details.comments || [];
    pr.reviews = details.reviews || [];
    pr.mergeable = details.mergeable;
    pr.commits = details.commits || [];
  }

  const intel = {
    timestamp: new Date().toISOString(),
    issues,
    prs
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(intel, null, 2));
  console.log(` Intelligence saved to ${path.relative(ROOT, OUTPUT_FILE)}`);

  // 3. Generate Markdown Report
  let md = `# Community Intelligence Report\n*Generated: ${intel.timestamp}*\n\n`;

  md += `## Open Issues (${issues.length})\n\n`;
  for (const i of issues) {
    md += `### [#${i.number}] ${i.title}\n`;
    md += `*Author: ${i.author.login} | Created: ${i.createdAt}*\n\n`;
    md += `**Body:**\n${i.body || '_No body_'}\n\n`;
    if (i.comments.length > 0) {
      md += `**Comments (${i.comments.length}):**\n`;
      for (const c of i.comments) {
        md += `> **${c.author.login}:** ${c.body.replace(/\n/g, '\n> ')}\n\n`;
      }
    }
    md += `---\n\n`;
  }

  md += `## Open Pull Requests (${prs.length})\n\n`;
  for (const p of prs) {
    md += `### [#${p.number}] ${p.title}\n`;
    md += `*Author: ${p.author.login} | Created: ${p.createdAt}*\n`;
    md += `**Status:** ${p.state} | **Mergeable:** ${p.mergeable}\n\n`;
    md += `**Body:**\n${p.body || '_No body_'}\n\n`;
    if (p.comments.length > 0) {
      md += `**Comments (${p.comments.length}):**\n`;
      for (const c of p.comments) {
        md += `> **${c.author.login}:** ${c.body.replace(/\n/g, '\n> ')}\n\n`;
      }
    }
    md += `---\n\n`;
  }

  fs.writeFileSync(REPORT_FILE, md);
  console.log(` Markdown report saved to ${path.relative(ROOT, REPORT_FILE)}`);
}

main().catch(console.error);
