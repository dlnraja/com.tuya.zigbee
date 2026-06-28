#!/usr/bin/env node
/*
 * Fast redacted Git-history audit.
 *
 * This intentionally reports only secret classes, paths, and commit/object IDs.
 * It never prints matched secret values.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const MAX_SAMPLES = 25;

const SECRET_DIFF_REGEX = [
  'gh[pousrx]_[A-Za-z0-9_]{36,}',
  'github_pat_[A-Za-z0-9_]{20,}_[A-Za-z0-9_]{40,}',
  'AKIA[0-9A-Z]{16}',
  'AIza[0-9A-Za-z_-]{35}',
  'xox[baprs]-[A-Za-z0-9-]{10,}',
  '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----',
  'eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]+',
  'Bearer[[:space:]]+[A-Za-z0-9._-]{24,}',
  '(mongodb|postgres|mysql|redis|amqp)://[^:[:space:]]+:[^@[:space:]]+@[^/[:space:]]+',
  'homey[_-]?pat[_-]?[A-Za-z0-9_-]{20,}',
  'tuya[_-]?(secret|token|api[_-]?secret)',
].join('|');

const PRIVATE_PATHS = [
  ['github-state', /^\.github\/state\/(?!\.gitkeep$|README\.md$).+/],
  ['diagnostic-tarball', /^\.diag\/.+/],
  ['local-cache', /^\.cache\/.+/],
  ['diagnostics-json', /^diagnostics\/.*\.json$/],
  ['local-agent-fix-script', /^\.agents\/fix_.*\.js$/],
  ['screenshots', /^screenshots(?:\/|$)/],
  ['credential-file', /(^|\/)(?:\.env(?:\..*)?|credentials\.json|token\.json|oauth2\.keys\.json|client_secret.*\.json|secrets\.json|homey-auth\..*|\.npmrc|\.netrc)$/],
];

function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: opts.maxBuffer || 128 * 1024 * 1024,
    timeout: opts.timeout || 120000,
    stdio: ['ignore', 'pipe', opts.stderr || 'ignore'],
  });
}

function scanPrivateHistoricalPaths() {
  const lines = git(['rev-list', '--objects', '--all']).split(/\r?\n/).filter(Boolean);
  const counts = new Map();
  const samples = [];
  const seen = new Set();

  for (const line of lines) {
    const firstSpace = line.indexOf(' ');
    if (firstSpace === -1) continue;
    const object = line.slice(0, firstSpace);
    const file = line.slice(firstSpace + 1).replace(/\\/g, '/');
    if (!file) continue;

    for (const [type, pattern] of PRIVATE_PATHS) {
      if (!pattern.test(file)) continue;
      counts.set(type, (counts.get(type) || 0) + 1);
      const key = `${type}|${file}|${object}`;
      if (!seen.has(key) && samples.length < MAX_SAMPLES) {
        seen.add(key);
        samples.push({ type, path: file, object: object.slice(0, 12) });
      }
    }
  }

  return { counts: Object.fromEntries([...counts.entries()].sort()), samples };
}

function scanSecretDiffs() {
  let raw = '';
  let timedOut = false;
  try {
    raw = git([
      'log',
      '--all',
      '--regexp-ignore-case',
      '-G',
      SECRET_DIFF_REGEX,
      '--format=%H%x09%aI%x09%s',
      '--',
      '.',
      ':(exclude).diag/**',
      ':(exclude).cache/**',
      ':(exclude).github/state/**',
      ':(exclude)diagnostics/**',
      ':(exclude)dumps/**',
      ':(exclude)screenshots/**',
      ':(exclude)node_modules/**',
      ':(exclude)docs/**',
      ':(exclude)reports/**',
    ], { maxBuffer: 64 * 1024 * 1024, timeout: 120000 });
  } catch (err) {
    raw = err.stdout || '';
    if (err.signal === 'SIGTERM' || err.code === 'ETIMEDOUT') {
      timedOut = true;
    }
  }

  const commits = [];
  const seen = new Set();
  for (const line of raw.split(/\r?\n/)) {
    const [hash, date, ...subjectParts] = line.split('\t');
    if (!/^[0-9a-f]{40}$/i.test(hash) || seen.has(hash)) continue;
    seen.add(hash);
    commits.push({
      hash: hash.slice(0, 12),
      date,
      subject: subjectParts.join('\t').slice(0, 180),
    });
    if (commits.length >= MAX_SAMPLES) break;
  }
  return { commits, timedOut };
}

function main() {
  const privatePaths = scanPrivateHistoricalPaths();
  const secretScan = scanSecretDiffs();
  const secretCommits = secretScan.commits;
  const privatePathCount = Object.values(privatePaths.counts).reduce((a, b) => a + b, 0);

  const result = {
    privatePathCount,
    privatePathSummary: privatePaths.counts,
    privatePathSamples: privatePaths.samples,
    secretPatternCommitCount: secretCommits.length,
    secretPatternScanTimedOut: secretScan.timedOut,
    secretPatternCommitSamples: secretCommits,
    clean: privatePathCount === 0 && secretCommits.length === 0,
    note: 'Values are redacted by design; rotate credentials if any secret-pattern commit is real.',
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.clean ? 0 : 1);
}

main();
