#!/usr/bin/env node
/**
 * generate-dependency-dashboard.js - Dependency Dashboard Generator
 *
 * Improved version of scripts/cartography/dependency-graph.js.
 * Generates an interactive HTML dashboard showing:
 * - Dependency graph overview (files, require() calls, modules)
 * - Circular dependency detection
 * - Unused module detection
 * - Most required internal modules
 * - Heaviest files by dependency count
 * - External package usage
 * - Dependency chain visualization
 *
 * Usage:
 *   node scripts/dashboard/generate-dependency-dashboard.js [--output path] [--json]
 */

'use strict';

const fs = require('fs');
const pathMod = require('path');
const { ROOT, DRIVERS_DIR, LIB_DIR, SCRIPTS_DIR, safeReadFile, walkJsFiles } = require('./shared-collector');
const T = require('./html-templates');

// ---------------------------------------------------------------------------
// AST-lite require() parser
// ---------------------------------------------------------------------------

function isBuiltin(modPath) {
  const builtins = [
    'fs', 'path', 'os', 'crypto', 'http', 'https', 'net', 'url', 'util',
    'stream', 'events', 'buffer', 'child_process', 'cluster', 'dgram',
    'dns', 'domain', 'module', 'readline', 'repl', 'string_decoder',
    'timers', 'tls', 'tty', 'v8', 'vm', 'worker_threads', 'zlib',
    'assert', 'async_hooks', 'console', 'constants', 'process', 'querystring'
  ];
  return builtins.includes(modPath);
}

function resolveModulePath(fromFile, modPathStr) {
  const dir = pathMod.dirname(fromFile);
  const candidates = [
    pathMod.resolve(dir, modPathStr),
    pathMod.resolve(dir, modPathStr + '.js'),
    pathMod.resolve(dir, modPathStr, 'index.js'),
    pathMod.resolve(dir, modPathStr + '.json')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function extractRequires(source, filePath) {
  const requires = [];
  const lines = source.split('\n');
  const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (/require\.resolve\s*\(/.test(line)) continue;

    let match;
    requireRegex.lastIndex = 0;
    while ((match = requireRegex.exec(line)) !== null) {
      const modPathStr = match[1];
      if (isBuiltin(modPathStr)) continue;

      let resolvedPath = modPathStr;
      let resolvedAbsolute = null;
      let isRelative = false;

      if (modPathStr.startsWith('.')) {
        isRelative = true;
        resolvedAbsolute = resolveModulePath(filePath, modPathStr);
        if (resolvedAbsolute) {
          resolvedPath = pathMod.relative(ROOT, resolvedAbsolute).replace(/\\/g, '/');
        }
      }

      requires.push({
        module: modPathStr,
        resolvedPath,
        resolvedAbsolute,
        isRelative,
        line: i + 1,
        sourceFile: pathMod.relative(ROOT, filePath).replace(/\\/g, '/')
      });
    }
  }
  return requires;
}

// ---------------------------------------------------------------------------
// Graph Builder
// ---------------------------------------------------------------------------

function buildDependencyGraph() {
  const graph = {
    nodes: new Map(),
    allFiles: new Set(),
    requires: []
  };

  function scanFile(filePath) {
    const relativePath = pathMod.relative(ROOT, filePath).replace(/\\/g, '/');
    graph.allFiles.add(relativePath);
    if (!graph.nodes.has(relativePath)) {
      graph.nodes.set(relativePath, { requires: [], requiredBy: [] });
    }

    let source;
    try { source = fs.readFileSync(filePath, 'utf8'); } catch { return; }

    const requires = extractRequires(source, filePath);
    graph.requires.push(...requires);

    const node = graph.nodes.get(relativePath);
    for (const req of requires) {
      node.requires.push(req);
      if (req.resolvedPath) {
        const targetRelative = pathMod.relative(ROOT, req.resolvedPath).replace(/\\/g, '/');
        if (!graph.nodes.has(targetRelative)) {
          graph.nodes.set(targetRelative, { requires: [], requiredBy: [] });
        }
        graph.nodes.get(targetRelative).requiredBy.push({
          file: relativePath, line: req.line, module: req.module
        });
      }
    }
  }

  function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', '.git', '.homeycompose'].includes(entry.name)) continue;
      const full = pathMod.join(dir, entry.name);
      if (entry.isDirectory()) walkDir(full);
      else if (entry.name.endsWith('.js')) scanFile(full);
    }
  }

  walkDir(LIB_DIR);
  walkDir(DRIVERS_DIR);
  if (fs.existsSync(SCRIPTS_DIR)) walkDir(SCRIPTS_DIR);
  const appJs = pathMod.join(ROOT, 'app.js');
  if (fs.existsSync(appJs)) scanFile(appJs);

  return graph;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

function detectCircularDependencies(graph) {
  const circulars = [];
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};

  for (const node of graph.nodes.keys()) color[node] = WHITE;

  function dfs(node, traversalPath) {
    color[node] = GRAY;
    traversalPath.push(node);

    const nodeData = graph.nodes.get(node);
    if (!nodeData) { traversalPath.pop(); color[node] = BLACK; return; }

    for (const req of nodeData.requires) {
      if (!req.isRelative || !req.resolvedPath) continue;
      const target = pathMod.relative(ROOT, req.resolvedPath).replace(/\\/g, '/');
      if (!graph.nodes.has(target)) continue;

      if (color[target] === GRAY) {
        const cycleStart = traversalPath.indexOf(target);
        if (cycleStart !== -1) {
          const cycle = traversalPath.slice(cycleStart);
          cycle.push(target);
          circulars.push({ cycle, length: cycle.length, files: [...cycle] });
        }
      } else if (color[target] === WHITE) {
        dfs(target, [...traversalPath]);
      }
    }
    color[node] = BLACK;
  }

  for (const node of graph.nodes.keys()) {
    if (color[node] === WHITE) dfs(node, []);
  }
  return circulars;
}

function findUnusedModules(graph) {
  const unused = [];
  for (const [filePath, node] of graph.nodes) {
    if (node.requiredBy.length === 0) {
      const isEntryPoint = filePath === 'app.js' ||
        (filePath.startsWith('drivers/') && (filePath.endsWith('device.js') || filePath.endsWith('driver.js')));
      const isIndexFile = filePath.endsWith('/index.js');
      if (!isEntryPoint && !isIndexFile) {
        unused.push({
          path: filePath,
          requires: node.requires.length,
          isLib: filePath.startsWith('lib/'),
          isDriver: filePath.startsWith('drivers/'),
          isScript: filePath.startsWith('scripts/')
        });
      }
    }
  }
  return unused.sort((a, b) => {
    if (a.isLib && !b.isLib) return -1;
    if (!a.isLib && b.isLib) return 1;
    return a.path.localeCompare(b.path);
  });
}

function computeStats(graph) {
  const stats = {
    totalFiles: graph.allFiles.size,
    totalRequireStatements: graph.requires.length,
    uniqueInternalModules: 0,
    uniqueExternalModules: 0,
    topRequired: [],
    heaviestFiles: [],
    avgRequiresPerFile: 0,
    externalPackages: []
  };

  const internalSet = new Set();
  const externalSet = new Set();
  const mostRequired = {};

  for (const req of graph.requires) {
    if (req.isRelative && req.resolvedPath) {
      const rel = pathMod.relative(ROOT, req.resolvedPath).replace(/\\/g, '/');
      internalSet.add(rel);
      mostRequired[rel] = (mostRequired[rel] || 0) + 1;
    } else if (!req.isRelative) {
      externalSet.add(req.module);
    }
  }

  stats.uniqueInternalModules = internalSet.size;
  stats.uniqueExternalModules = externalSet.size;
  stats.externalPackages = [...externalSet].sort();

  stats.topRequired = Object.entries(mostRequired)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([mod, count]) => ({ module: mod, count }));

  for (const [filePath, node] of graph.nodes) {
    stats.heaviestFiles.push({
      path: filePath,
      requires: node.requires.length,
      requiredBy: node.requiredBy.length
    });
  }
  stats.heaviestFiles.sort((a, b) => b.requires - a.requires);
  stats.heaviestFiles = stats.heaviestFiles.slice(0, 25);

  stats.avgRequiresPerFile = stats.totalFiles > 0
    ? Math.round(stats.totalRequireStatements / stats.totalFiles * 100) / 100
    : 0;

  return stats;
}

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

function generateDashboard(graph, circulars, unused, stats) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const sections = [];

  // Overview
  sections.push(T.section('Overview', `
    <div class="grid">
      ${T.metricCard('Files Scanned', stats.totalFiles)}
      ${T.metricCard('require() Calls', stats.totalRequireStatements.toLocaleString(), `avg ${stats.avgRequiresPerFile} per file`)}
      ${T.metricCard('Internal Modules', stats.uniqueInternalModules, 'unique internal modules required')}
      ${T.metricCard('External Packages', stats.uniqueExternalModules, 'unique npm packages required')}
      ${T.metricCard('Circular Dependencies', circulars.length, circulars.length > 0 ? 'cycles detected' : 'clean', circulars.length > 0 ? T.THEME.red : T.THEME.green)}
      ${T.metricCard('Unused Modules', unused.length, 'files not required by any other module', unused.length > 0 ? T.THEME.yellow : T.THEME.green)}
    </div>
  `));

  // Circular dependencies
  sections.push(T.section(`Circular Dependencies (${circulars.length})`, `
    ${circulars.length === 0 ? '<p style="color:' + T.THEME.green + '">No circular dependencies detected.</p>' :
      circulars.map((c, i) => `
      <div style="background:${T.THEME.cardBg};border:1px solid ${T.THEME.redDark};border-radius:8px;padding:12px;margin:8px 0">
        <div style="margin-bottom:6px"><span class="tag tag-red">CYCLE ${i + 1}</span> <span style="color:${T.THEME.textMuted}">Length: ${c.length}</span></div>
        <div style="font-family:monospace;font-size:0.88em">
          ${c.files.map((f, j) => `<span class="module-path">${T.escapeHtml(f)}</span>${j < c.files.length - 1 ? '<span style="color:' + T.THEME.red + '"> &rarr; </span>' : ''}`).join('')}
        </div>
      </div>`).join('')}
  `));

  // Most required modules
  sections.push(T.section('Most Required Internal Modules (Top 25)', T.dataTable(
    ['Module', 'Required By', 'Coverage'],
    stats.topRequired.map(m => [
      `<span class="module-path">${T.escapeHtml(m.module)}</span>`,
      m.count,
      T.progressBar(m.count, stats.topRequired[0]?.count || 1, T.THEME.blue, '200px')
    ]),
    { maxHeight: 500 }
  )));

  // Heaviest files
  sections.push(T.section('Heaviest Files (Most Dependencies)', T.dataTable(
    ['File', 'Requires', 'Required By'],
    stats.heaviestFiles.map(f => [
      `<span class="module-path">${T.escapeHtml(f.path)}</span>`,
      f.requires,
      f.requiredBy
    ]),
    { maxHeight: 500 }
  )));

  // External packages
  if (stats.externalPackages.length > 0) {
    sections.push(T.section(`External Packages (${stats.externalPackages.length})`, `
      <div style="max-height:300px;overflow-y:auto">
        ${stats.externalPackages.map(p => `<span class="tag tag-blue">${T.escapeHtml(p)}</span>`).join(' ')}
      </div>
    `));
  }

  // Unused modules
  sections.push(T.section(`Unused Modules (${unused.length})`, `
    ${unused.length === 0 ? '<p style="color:' + T.THEME.green + '">No unused modules detected.</p>' :
      T.dataTable(
        ['Module', 'Type', 'Own Requires'],
        unused.slice(0, 100).map(u => [
          `<span class="module-path">${T.escapeHtml(u.path)}</span>`,
          `<span class="tag ${u.isLib ? 'tag-blue' : u.isDriver ? 'tag-green' : 'tag-yellow'}">${u.isLib ? 'lib' : u.isDriver ? 'driver' : 'script'}</span>`,
          u.requires
        ]),
        { maxHeight: 400 }
      )}
    ${unused.length > 100 ? `<p style="color:${T.THEME.textMuted};margin-top:8px">Showing 100 of ${unused.length} unused modules</p>` : ''}
  `));

  return T.buildPage({
    title: 'Dependency Dashboard',
    subtitle: 'Universal Tuya Zigbee - Module Dependency Analysis',
    current: 'dependencies',
    sections,
    timestamp
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[DEP-DASHBOARD] Starting...');

  const args = process.argv.slice(2);
  let outputPath = pathMod.join(ROOT, 'scripts', 'dashboard', 'dependency-dashboard.html');
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) outputPath = args[++i];
    if (args[i] === '--json') jsonOutput = true;
  }

  console.log('[DEP-DASHBOARD] Building dependency graph...');
  const graph = buildDependencyGraph();
  console.log(`[DEP-DASHBOARD] Scanned ${graph.allFiles.size} files, ${graph.requires.length} require() calls`);

  console.log('[DEP-DASHBOARD] Detecting circular dependencies...');
  const circulars = detectCircularDependencies(graph);
  console.log(`[DEP-DASHBOARD] Found ${circulars.length} circular dependencies`);

  console.log('[DEP-DASHBOARD] Finding unused modules...');
  const unused = findUnusedModules(graph);
  console.log(`[DEP-DASHBOARD] Found ${unused.length} unused modules`);

  const stats = computeStats(graph);

  if (jsonOutput) {
    const jsonPath = outputPath.replace(/\.html$/, '.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      stats: { ...stats, externalPackages: undefined },
      circulars,
      unused: unused.slice(0, 50),
      topRequired: stats.topRequired,
      heaviestFiles: stats.heaviestFiles,
      externalPackages: stats.externalPackages
    }, null, 2), 'utf8');
    console.log(`[DEP-DASHBOARD] JSON: ${jsonPath}`);
  }

  console.log('[DEP-DASHBOARD] Generating HTML...');
  const html = generateDashboard(graph, circulars, unused, stats);
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`[DEP-DASHBOARD] HTML: ${outputPath}`);
  console.log(`[DEP-DASHBOARD] Done.`);
}

main();
