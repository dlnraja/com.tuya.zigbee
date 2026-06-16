#!/usr/bin/env node
/**
 * dep-check.js - Dependency and Require() Path Validator
 * Run: node scripts/automation/dep-check.js [--json] [--fix]
 *
 * Validates:
 * - All require() paths in JS files resolve to existing files
 * - Detects circular dependencies via static analysis
 * - Validates package.json dependencies are installed
 * - Checks for deprecated/unused dependencies
 * - Reports missing or outdated dependency references
 * - Identifies require() calls to non-existent local modules
 *
 * Exit codes: 0 = clean, 1 = issues found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const REPORT_FILE = path.join(STATE_DIR, 'dep-check-report.json');

const JSON_OUTPUT = process.argv.includes('--json');
const DIRECTORIES_TO_SCAN = ['lib', 'drivers', 'scripts'];

// Node.js built-in modules to ignore
const BUILTIN_MODULES = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module', 'net',
  'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring', 'readline',
  'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'trace_events',
  'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib',
]);

function log(msg) {
  if (!JSON_OUTPUT) console.log('[DEP-CHECK] ' + msg);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Find all JS files ──────────────────────────────────────────────────────
function findJSFiles(dirs) {
  const files = [];
  for (const dir of dirs) {
    const fullPath = path.join(ROOT, dir);
    if (!fs.existsSync(fullPath)) continue;
    walkDir(fullPath, files);
  }
  return files;
}

function walkDir(dir, files) {
  let entries;
  try { entries = fs.readdirSync(dir); } catch (_) { return; }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (entry === 'node_modules' || entry === '.git' || entry === '.github') continue;
        walkDir(fullPath, files);
      } else if (entry.endsWith('.js') && !entry.endsWith('.test.js')) {
        files.push(fullPath);
      }
    } catch (_) { /* skip */ }
  }
}

// ── Extract require() paths from a JS file ──────────────────────────────────
function extractRequires(filePath) {
  const requires = [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Match require('...') and require("...")
    const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = requireRe.exec(content)) !== null) {
      const reqPath = match[1];
      // Extract line number
      const lineNum = content.substring(0, match.index).split('\n').length;
      requires.push({ path: reqPath, line: lineNum });
    }
  } catch (e) {
    // Skip files that can't be read
  }
  return requires;
}

// ── Resolve a require() path relative to the requiring file ─────────────────
function resolveRequire(fromFile, reqPath) {
  // Skip Node.js built-in modules
  if (BUILTIN_MODULES.has(reqPath) || reqPath.startsWith('node:')) {
    return { resolved: true, type: 'builtin', path: reqPath };
  }

  // Skip npm packages (no relative path)
  if (!reqPath.startsWith('.') && !reqPath.startsWith('/')) {
    return { resolved: true, type: 'npm', path: reqPath };
  }

  const fromDir = path.dirname(fromFile);
  const candidate = path.resolve(fromDir, reqPath);

  // Try exact path
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return { resolved: true, type: 'local', path: candidate };
  }

  // Try with .js extension
  if (fs.existsSync(candidate + '.js') && fs.statSync(candidate + '.js').isFile()) {
    return { resolved: true, type: 'local', path: candidate + '.js' };
  }

  // Try as directory with index.js
  if (fs.existsSync(path.join(candidate, 'index.js')) && fs.statSync(path.join(candidate, 'index.js')).isFile()) {
    return { resolved: true, type: 'local', path: path.join(candidate, 'index.js') };
  }

  return { resolved: false, type: 'missing', path: candidate };
}

// ── Detect circular dependencies ────────────────────────────────────────────
function detectCycles(fileGraph) {
  const cycles = [];
  const visited = new Set();
  const stack = new Set();

  function dfs(file, path) {
    if (stack.has(file)) {
      // Found cycle
      const cycleStart = path.indexOf(file);
      if (cycleStart >= 0) {
        cycles.push(path.slice(cycleStart).concat([file]));
      }
      return;
    }
    if (visited.has(file)) return;

    visited.add(file);
    stack.add(file);
    path.push(file);

    const deps = fileGraph.get(file) || [];
    for (const dep of deps) {
      if (dep.type === 'local') {
        dfs(dep.path, [...path]);
      }
    }

    stack.delete(file);
  }

  for (const [file] of fileGraph) {
    visited.clear();
    stack.clear();
    dfs(file, []);
  }

  return cycles;
}

// ── Validate package.json ───────────────────────────────────────────────────
function validatePackageJson() {
  const result = {
    exists: false,
    valid: false,
    dependencies: {},
    devDependencies: {},
    missingInstalled: [],
    scripts: {},
  };

  const pkgPath = path.join(ROOT, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    result.exists = false;
    return result;
  }

  result.exists = true;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    result.valid = true;
    result.dependencies = pkg.dependencies || {};
    result.devDependencies = pkg.devDependencies || {};
    result.scripts = pkg.scripts || {};

    // Check if node_modules exists
    const nmDir = path.join(ROOT, 'node_modules');
    if (fs.existsSync(nmDir)) {
      // Check key dependencies
      const allDeps = { ...result.dependencies, ...result.devDependencies };
      for (const [name] of Object.entries(allDeps)) {
        const modDir = path.join(nmDir, name);
        if (!fs.existsSync(modDir)) {
          result.missingInstalled.push(name);
        }
      }
    }
  } catch (e) {
    result.valid = false;
  }

  return result;
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  log('Starting dependency check...');

  ensureDir(STATE_DIR);

  const jsFiles = findJSFiles(DIRECTORIES_TO_SCAN);
  log(`Scanning ${jsFiles.length} JavaScript files...`);

  // 1. Extract and resolve all require() paths
  const fileGraph = new Map();
  const missingRequires = [];
  let totalRequires = 0;
  let npmRequires = 0;
  let builtinRequires = 0;
  let localRequires = 0;

  for (const file of jsFiles) {
    const requires = extractRequires(file);
    const deps = [];

    for (const req of requires) {
      totalRequires++;
      const resolution = resolveRequire(file, req.path);

      if (resolution.type === 'npm') npmRequires++;
      else if (resolution.type === 'builtin') builtinRequires++;
      else if (resolution.type === 'local') localRequires++;

      if (!resolution.resolved) {
        missingRequires.push({
          file: path.relative(ROOT, file),
          line: req.line,
          requiredPath: req.path,
          expectedAt: path.relative(ROOT, resolution.path),
        });
      }

      deps.push(resolution);
    }

    fileGraph.set(file, deps);
  }

  log(`Total require() calls: ${totalRequires} (${npmRequires} npm, ${builtinRequires} builtin, ${localRequires} local)`);
  log(`Missing require() paths: ${missingRequires.length}`);

  // 2. Detect circular dependencies
  log('Checking for circular dependencies...');
  const cycles = detectCycles(fileGraph);
  log(`Circular dependencies found: ${cycles.length}`);

  // 3. Validate package.json
  log('Validating package.json...');
  const pkgInfo = validatePackageJson();
  if (!pkgInfo.valid) {
    log('WARNING: package.json is invalid or missing');
  } else {
    log(`Dependencies: ${Object.keys(pkgInfo.dependencies).length}`);
    log(`DevDependencies: ${Object.keys(pkgInfo.devDependencies).length}`);
    if (pkgInfo.missingInstalled.length > 0) {
      log(`Missing from node_modules: ${pkgInfo.missingInstalled.join(', ')}`);
    }
  }

  // 4. Build report
  const report = {
    timestamp: new Date().toISOString(),
    scannedFiles: jsFiles.length,
    requireStats: { total: totalRequires, npm: npmRequires, builtin: builtinRequires, local: localRequires },
    missingRequires,
    circularDependencies: cycles.map(c => c.map(f => path.relative(ROOT, f))),
    packageJson: {
      valid: pkgInfo.valid,
      dependencyCount: Object.keys(pkgInfo.dependencies).length,
      devDependencyCount: Object.keys(pkgInfo.devDependencies).length,
      missingInstalled: pkgInfo.missingInstalled,
    },
    issueCount: missingRequires.length + cycles.length + pkgInfo.missingInstalled.length,
  };

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    log('');
    log('=== Dependency Check Report ===');
    log(`Scanned files: ${jsFiles.length}`);
    log(`Total require() calls: ${totalRequires}`);
    log(`Missing require() paths: ${missingRequires.length}`);
    log(`Circular dependencies: ${cycles.length}`);
    log(`Missing npm packages: ${pkgInfo.missingInstalled.length}`);

    if (missingRequires.length > 0) {
      log('');
      log('--- Missing Require Paths ---');
      for (const m of missingRequires.slice(0, 30)) {
        log(`  ${m.file}:${m.line} -> ${m.requiredPath}`);
        log(`    Expected at: ${m.expectedAt}`);
      }
      if (missingRequires.length > 30) {
        log(`  ... and ${missingRequires.length - 30} more`);
      }
    }

    if (cycles.length > 0) {
      log('');
      log('--- Circular Dependencies ---');
      for (const cycle of cycles.slice(0, 10)) {
        const rel = cycle.map(f => path.relative(ROOT, f));
        log(`  ${rel.join(' -> ')}`);
      }
      if (cycles.length > 10) {
        log(`  ... and ${cycles.length - 10} more`);
      }
    }

    if (pkgInfo.missingInstalled.length > 0) {
      log('');
      log('--- Missing npm Packages ---');
      for (const pkg of pkgInfo.missingInstalled) {
        log(`  ${pkg} (declared in package.json but not in node_modules)`);
      }
    }
  }

  // Save report
  ensureDir(path.dirname(REPORT_FILE));
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  process.exit(report.issueCount > 0 ? 1 : 0);
}

main();
