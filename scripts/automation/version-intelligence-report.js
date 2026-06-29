'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const STATE_DIR = path.join(ROOT, '.github', 'state');
const REPORT_JSON = path.join(STATE_DIR, 'version-intelligence-report.json');
const REPORT_MD = path.join(ROOT, 'docs', 'WORKING_VERSIONS_REFERENCE.md');
const DASHBOARD_REPORT = path.join(STATE_DIR, 'dashboard-monitor-report.json');

const CATEGORIES = [
  ['publish_processing', /\b(publish|processing|aggregate|athom|dashboard|build|rate limit|request rate)\b/i],
  ['buttons_flows', /\b(button|ts004|flow|trigger|scene|remote|press|click)\b/i],
  ['battery_energy', /\b(battery|batteries|energy|powercfg|alarm_battery|measure_battery)\b/i],
  ['security_privacy', /\b(security|secret|token|privacy|redact|leak|credential|pat)\b/i],
  ['diagnostics_crash', /\b(diag|diagnostic|crash|stack overflow|destroyed|timer|timeout)\b/i],
  ['sdk3_lifecycle', /\b(sdk3|ondeleted|onuninit|lifecycle|capability|manager|homey)\b/i],
  ['fingerprints_pairing', /\b(fingerprint|manufacturer|productid|pairing|wildcard|device id|tuya|z2m|zha)\b/i],
  ['docs_rules', /\b(doc|readme|rule|guide|reference|changelog)\b/i],
];

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function gitLog() {
  const raw = execFileSync('git', [
    'log',
    '--reverse',
    '--date=iso-strict',
    '--pretty=format:%ad%x09%h%x09%s',
  ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

  return raw.split(/\r?\n/).filter(Boolean).map(line => {
    const [date, hash, ...subjectParts] = line.split('\t');
    const subject = subjectParts.join('\t');
    return {
      date,
      hash,
      subject,
      version: extractVersion(subject),
      categories: classify(subject),
    };
  });
}

function extractVersion(subject) {
  const match = String(subject || '').match(/\bv\.?\s*(\d+(?:\.\d+){1,3})\b/i)
    || String(subject || '').match(/\bv(\d+(?:\.\d+){1,3})\b/i);
  return match ? match[1] : null;
}

function classify(subject) {
  return CATEGORIES
    .filter(([, pattern]) => pattern.test(subject || ''))
    .map(([category]) => category);
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function latestByCategory(commits) {
  const latest = {};
  for (const commit of commits) {
    for (const category of commit.categories) latest[category] = commit;
  }
  return latest;
}

function versionCommitMap(commits) {
  const map = {};
  for (const commit of commits) {
    if (!commit.version) continue;
    if (!map[commit.version]) map[commit.version] = [];
    map[commit.version].push(commit);
  }
  return map;
}

function dashboardSnapshot() {
  const dashboard = readJson(DASHBOARD_REPORT, {});
  return {
    appId: dashboard.appId || null,
    timestamp: dashboard.timestamp || null,
    latestBuild: dashboard.latestBuild || null,
    latestWorkingVersion: dashboard.latestWorkingVersion || dashboard.latestGoodBuild || null,
    latestTestVersion: dashboard.latestTestVersion || null,
    versionTotals: dashboard.versionTotals || null,
    workingVersions: dashboard.workingVersions || [],
    testVersions: dashboard.testVersions || [],
    failedOnlyVersions: dashboard.failedOnlyVersions || [],
    failurePatterns: dashboard.failurePatterns || [],
  };
}

function markdownTable(rows, headers) {
  const output = [];
  output.push(`| ${headers.join(' | ')} |`);
  output.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    output.push(`| ${row.map(markdownCell).join(' | ')} |`);
  }
  return output.join('\n');
}

function markdownCell(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|')
    .trim();
}

function renderMarkdown(report) {
  const app = report.app;
  const dashboard = report.dashboard;
  const workingRows = dashboard.workingVersions.map(item => [
    item.version,
    item.latestBuildId || '',
    item.latestState || '',
    item.successfulBuilds,
    item.failedBuilds,
    item.lastSuccessfulAt || '',
    item.lastTestAt || '',
  ]);
  const failedRows = dashboard.failedOnlyVersions.map(item => [
    item.version,
    item.latestBuildId || '',
    item.latestFailureDetail || '',
    item.failedBuilds,
    item.lastSeenAt || '',
  ]);
  const categoryRows = Object.entries(report.commitCategories)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => {
      const latest = report.latestByCategory[category];
      return [category, count, latest ? `${latest.date} ${latest.hash} ${latest.subject}` : ''];
    });

  return [
    '# Working Versions Reference',
    '',
    `Generated: ${report.generatedAt}`,
    `App: ${app.id} v${app.version}`,
    '',
    '## Dashboard Summary',
    '',
    `Latest build: ${dashboard.latestBuild ? `#${dashboard.latestBuild.id} v${dashboard.latestBuild.version} ${dashboard.latestBuild.state}` : 'unavailable'}`,
    `Latest working version: ${dashboard.latestWorkingVersion ? `v${dashboard.latestWorkingVersion.version} (#${dashboard.latestWorkingVersion.latestBuildId || dashboard.latestWorkingVersion.id || '?'})` : 'unavailable'}`,
    `Latest test version: ${dashboard.latestTestVersion ? `v${dashboard.latestTestVersion.version} (#${dashboard.latestTestVersion.latestBuildId || dashboard.latestTestVersion.id || '?'})` : 'unavailable'}`,
    `Working versions found: ${dashboard.workingVersions.length}`,
    `Failed-only versions found: ${dashboard.failedOnlyVersions.length}`,
    '',
    '## Versions That Work',
    '',
    workingRows.length
      ? markdownTable(workingRows, ['Version', 'Latest Build', 'Latest State', 'Successful Builds', 'Failed Builds', 'Last Successful', 'Last Test'])
      : 'Dashboard report did not include working version history yet. Run `node scripts/automation/dashboard-monitor.js --json` first.',
    '',
    '## Failed-Only Versions',
    '',
    failedRows.length
      ? markdownTable(failedRows, ['Version', 'Latest Build', 'Latest Failure', 'Failed Builds', 'Last Seen'])
      : 'No failed-only versions in the current dashboard window.',
    '',
    '## Commit Message Themes Since First Commit',
    '',
    markdownTable(categoryRows, ['Theme', 'Commits', 'Latest Signal']),
    '',
    '## Regression Rules Reinforced',
    '',
    '- Treat the latest Homey dashboard state as authoritative; historical AggregateError builds must not trigger republish when a newer test build is healthy.',
    '- Keep battery support separated between `measure_battery` devices and mains-powered routers; do not combine conflicting battery capabilities.',
    '- Keep physical button flows registered as device trigger cards and covered by tests for TS004x/Moes variants.',
    '- Publish only the prepared payload, then wait for Athom processing and verify the resulting build state.',
    '- Keep secrets in GitHub/Homey secrets only; reports must stay redacted before upload or commit.',
  ].join('\n');
}

function main() {
  const app = readJson(path.join(ROOT, 'app.json'), {});
  const commits = gitLog();
  const byVersion = versionCommitMap(commits);
  const dashboard = dashboardSnapshot();
  const report = {
    generatedAt: new Date().toISOString(),
    app: {
      id: app.id || null,
      version: app.version || null,
    },
    commits: {
      total: commits.length,
      versionMentionCount: Object.keys(byVersion).length,
      first: commits[0] || null,
      latest: commits[commits.length - 1] || null,
    },
    commitCategories: countBy(commits.flatMap(commit => commit.categories), item => item),
    latestByCategory: latestByCategory(commits),
    dashboard,
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(REPORT_MD), { recursive: true });
  fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(REPORT_MD, `${renderMarkdown(report)}\n`);
  console.log(`Wrote ${path.relative(ROOT, REPORT_JSON)}`);
  console.log(`Wrote ${path.relative(ROOT, REPORT_MD)}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  classify,
  extractVersion,
  renderMarkdown,
};
