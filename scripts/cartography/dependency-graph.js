#!/usr/bin/env node
/**
 * dependency-graph.js - Dependency Graph Cartography
 *
 * Maps all require() dependencies across the project, detects circular
 * dependencies, identifies unused modules, and generates a dependency
 * report as HTML + text.
 *
 * Usage: node scripts/cartography/dependency-graph.js [--output path] [--json]
 */

'use strict';

const fs = require('fs');
const pathMod = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = pathMod.join(ROOT, 'drivers');
const LIB_DIR = pathMod.join(ROOT, 'lib');
const SCRIPTS_DIR = pathMod.join(ROOT, 'scripts');

// ---------------------------------------------------------------------------
// AST-lite require() parser
// ---------------------------------------------------------------------------

/**
 * Extract all require() calls from source text using regex.
 * Handles: require('...'), require("..."), require(`...`)
 * Skips: commented lines, require.resolve
 */
function extractRequires(source, filePath) {
  const requires = [];
  const lines = source.split('\n');

  // Regex to match require() calls - captures the module path
  const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  // Ignore require.resolve
  const resolveRegex = /require\.resolve\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    // Skip require.resolve
    if (resolveRegex.test(line)) continue;

    let match;
    requireRegex.lastIndex = 0;
    while ((match = requireRegex.exec(line)) !== null) {
      const modPath = match[1];

      // Skip Node.js built-in modules
      if (isBuiltin(modPath)) continue;

      // Resolve relative path
      let resolvedPath = modPath;
      let resolvedAbsolute = null;
      let isRelative = false;

      if (modPath.startsWith('.')) {
        isRelative = true;
        resolvedAbsolute = resolveModulePath(filePath, modPath);
        if (resolvedAbsolute) {
          resolvedPath = pathMod.relative(ROOT, resolvedAbsolute).replace(/\\/g, '/');
        }
      }

      requires.push({
        module: modPath,
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

function resolveModulePath(fromFile, modPath) {
  const dir = pathMod.dirname(fromFile);
  const candidates = [
    pathMod.resolve(dir, modPath),
    pathMod.resolve(dir, modPath + '.js'),
    pathMod.resolve(dir, modPath, 'index.js'),
    pathMod.resolve(dir, modPath + '.json')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

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

// ---------------------------------------------------------------------------
// Graph Builder
// ---------------------------------------------------------------------------

function buildDependencyGraph() {
  const graph = {
    nodes: new Map(),   // filePath -> { requires: [], requiredBy: [] }
    allFiles: new Set(),
    requires: []        // flat list of all require statements
  };

  function scanFile(filePath) {
    const relativePath = pathMod.relative(ROOT, filePath).replace(/\\/g, '/');
    graph.allFiles.add(relativePath);

    if (!graph.nodes.has(relativePath)) {
      graph.nodes.set(relativePath, { requires: [], requiredBy: [] });
    }

    let source;
    try {
      source = fs.readFileSync(filePath, 'utf8');
    } catch { return; }

    const requires = extractRequires(source, filePath);
    graph.requires.push(...requires);

    const node = graph.nodes.get(relativePath);
    for (const req of requires) {
      node.requires.push(req);

      // Track reverse dependency
      if (req.resolvedPath) {
        const targetRelative = pathMod.relative(ROOT, req.resolvedPath).replace(/\\/g, '/');
        if (!graph.nodes.has(targetRelative)) {
          graph.nodes.set(targetRelative, { requires: [], requiredBy: [] });
        }
        graph.nodes.get(targetRelative).requiredBy.push({
          file: relativePath,
          line: req.line,
          module: req.module
        });
      }
    }
  }

  function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.homeycompose') continue;
      const full = pathMod.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(full);
      } else if (entry.name.endsWith('.js')) {
        scanFile(full);
      }
    }
  }

  // Scan all source directories
  walkDir(LIB_DIR);
  walkDir(DRIVERS_DIR);
  if (fs.existsSync(SCRIPTS_DIR)) walkDir(SCRIPTS_DIR);

  // Also scan root files
  const rootFiles = ['app.js'];
  for (const f of rootFiles) {
    const full = pathMod.join(ROOT, f);
    if (fs.existsSync(full)) scanFile(full);
  }

  return graph;
}

// ---------------------------------------------------------------------------
// Circular Dependency Detection (DFS-based)
// ---------------------------------------------------------------------------

function detectCircularDependencies(graph) {
  const circulars = [];
  const WHITE = 0; // unvisited
  const GRAY = 1;  // in progress
  const BLACK = 2; // done

  const color = {};
  const parent = {};

  for (const node of graph.nodes.keys()) {
    color[node] = WHITE;
  }

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
        // Found a cycle
        const cycleStart = traversalPath.indexOf(target);
        if (cycleStart !== -1) {
          const cycle = traversalPath.slice(cycleStart);
          cycle.push(target); // close the cycle
          circulars.push({
            cycle,
            length: cycle.length,
            files: cycle.map(f => f)
          });
        }
      } else if (color[target] === WHITE) {
        dfs(target, [...traversalPath]);
      }
    }

    color[node] = BLACK;
  }

  for (const node of graph.nodes.keys()) {
    if (color[node] === WHITE) {
      dfs(node, []);
    }
  }

  return circulars;
}

// ---------------------------------------------------------------------------
// Unused Module Detection
// ---------------------------------------------------------------------------

function findUnusedModules(graph) {
  const unused = [];

  for (const [filePath, node] of graph.nodes) {
    // A module is unused if nothing requires it, AND it's not a root entry point
    if (node.requiredBy.length === 0) {
      const isEntryPoint = filePath === 'app.js' ||
        filePath.startsWith('drivers/') && filePath.endsWith('device.js') ||
        filePath.startsWith('drivers/') && filePath.endsWith('driver.js');
      const isIndexFile = filePath.endsWith('/index.js');
      const hasRequires = node.requires.length > 0; // has its own dependencies

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

// ---------------------------------------------------------------------------
// Dependency Stats
// ---------------------------------------------------------------------------

function computeStats(graph) {
  const stats = {
    totalFiles: graph.allFiles.size,
    totalRequireStatements: graph.requires.length,
    uniqueInternalModules: new Set(),
    uniqueExternalModules: new Set(),
    mostRequired: {},
    heaviestFiles: [],
    avgRequiresPerFile: 0
  };

  // Count unique modules
  for (const req of graph.requires) {
    if (req.isRelative) {
      if (req.resolvedPath) {
        const rel = pathMod.relative(ROOT, req.resolvedPath).replace(/\\/g, '/');
        stats.uniqueInternalModules.add(rel);

        stats.mostRequired[rel] = (stats.mostRequired[rel] || 0) + 1;
      }
    } else {
      stats.uniqueExternalModules.add(req.module);
    }
  }

  // Most required modules
  stats.topRequired = Object.entries(stats.mostRequired)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([mod, count]) => ({ module: mod, count }));

  // Heaviest files (most requires)
  for (const [filePath, node] of graph.nodes) {
    stats.heaviestFiles.push({
      path: filePath,
      requires: node.requires.length,
      requiredBy: node.requiredBy.length
    });
  }
  stats.heaviestFiles.sort((a, b) => b.requires - a.requires);
  stats.heaviestFiles = stats.heaviestFiles.slice(0, 20);

  stats.avgRequiresPerFile = stats.totalFiles > 0
    ? Math.round(stats.totalRequireStatements / stats.totalFiles * 100) / 100
    : 0;

  stats.uniqueInternalModules = stats.uniqueInternalModules.size;
  stats.uniqueExternalModules = stats.uniqueExternalModules.size;

  return stats;
}

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

function generateHTML(graph, circulars, unused, stats) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Build adjacency data for visualization (top N files)
  const topFiles = stats.heaviestFiles.slice(0, 30);
  const involvedFiles = new Set(topFiles.map(f => f.path));
  for (const circ of circulars) {
    for (const f of circ.files) involvedFiles.add(f);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Universal Tuya Zigbee - Dependency Graph</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
    background: #0a0e17; color: #c9d1d9; padding: 20px; line-height: 1.6;
  }
  h1 { color: #bc8cff; margin-bottom: 5px; }
  h2 { color: #79c0ff; margin: 24px 0 12px; border-bottom: 1px solid #21262d; padding-bottom: 6px; }
  .subtitle { color: #8b949e; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin: 16px 0; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
  .card-title { color: #58a6ff; font-weight: 600; margin-bottom: 8px; }
  .metric { font-size: 2em; font-weight: 700; color: #f0f6fc; }
  .metric-label { font-size: 0.85em; color: #8b949e; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #21262d; font-size: 0.88em; }
  th { color: #79c0ff; }
  .bar { height: 14px; background: #21262d; border-radius: 3px; overflow: hidden; margin: 2px 0; }
  .bar-fill { height: 100%; border-radius: 3px; background: #58a6ff; }
  .tag { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 0.75em; }
  .tag-err { background: #da3633; color: #fff; }
  .tag-warn { background: #9e6a03; color: #fff; }
  .tag-ok { background: #238636; color: #fff; }
  .tag-info { background: #1f6feb; color: #fff; }
  .cycle-box {
    background: #161b22; border: 1px solid #da3633; border-radius: 8px;
    padding: 12px; margin: 8px 0;
  }
  .cycle-arrow { color: #f85149; margin: 0 4px; }
  .module-path { font-family: monospace; color: #58a6ff; font-size: 0.88em; }
  .section { margin-bottom: 30px; }
  .unused-list { max-height: 400px; overflow-y: auto; }
  .dep-table-scroll { max-height: 500px; overflow-y: auto; }
  pre { background: #161b22; padding: 12px; border-radius: 6px; border: 1px solid #30363d; font-size: 0.85em; overflow-x: auto; }
</style>
</head>
<body>

<h1>Dependency Graph</h1>
<p class="subtitle">Universal Tuya Zigbee - Module Dependency Analysis | ${timestamp}</p>

<!-- Overview -->
<div class="section">
  <h2>Overview</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">Files Scanned</div>
      <div class="metric">${stats.totalFiles}</div>
    </div>
    <div class="card">
      <div class="card-title">require() Calls</div>
      <div class="metric">${stats.totalRequireStatements.toLocaleString()}</div>
      <div class="metric-label">avg ${stats.avgRequiresPerFile} per file</div>
    </div>
    <div class="card">
      <div class="card-title">Internal Modules</div>
      <div class="metric">${stats.uniqueInternalModules}</div>
      <div class="metric-label">unique internal modules required</div>
    </div>
    <div class="card">
      <div class="card-title">External Packages</div>
      <div class="metric">${stats.uniqueExternalModules}</div>
      <div class="metric-label">unique npm packages required</div>
    </div>
    <div class="card">
      <div class="card-title">Circular Dependencies</div>
      <div class="metric" style="color:${circulars.length > 0 ? '#f85149' : '#3fb950'}">${circulars.length}</div>
      <div class="metric-label">${circulars.length > 0 ? 'cycles detected' : 'clean'}</div>
    </div>
    <div class="card">
      <div class="card-title">Unused Modules</div>
      <div class="metric" style="color:${unused.length > 0 ? '#d29922' : '#3fb950'}">${unused.length}</div>
      <div class="metric-label">files not required by any other module</div>
    </div>
  </div>
</div>

<!-- Circular Dependencies -->
<div class="section">
  <h2>Circular Dependencies (${circulars.length})</h2>
  ${circulars.length === 0 ? '<p style="color:#3fb950;padding:10px 0">No circular dependencies detected.</p>' :
    circulars.map((c, i) => `
  <div class="cycle-box">
    <div style="margin-bottom:6px"><span class="tag tag-err">CYCLE ${i + 1}</span> <span style="color:#8b949e">Length: ${c.length}</span></div>
    <div style="font-family:monospace;font-size:0.88em">
      ${c.files.map((f, j) => `<span class="module-path">${f}</span>${j < c.files.length - 1 ? '<span class="cycle-arrow"> &rarr; </span>' : ''}`).join('')}
    </div>
  </div>`).join('')}
</div>

<!-- Most Required Modules -->
<div class="section">
  <h2>Most Required Internal Modules (Top 20)</h2>
  <table>
    <thead><tr><th>Module</th><th>Required By</th><th>Coverage</th></tr></thead>
    <tbody>
    ${stats.topRequired.map(m => `
      <tr>
        <td class="module-path">${m.module}</td>
        <td>${m.count}</td>
        <td>
          <div class="bar" style="width:200px;display:inline-block;vertical-align:middle">
            <div class="bar-fill" style="width:${(m.count / (stats.topRequired[0]?.count || 1) * 100)}%"></div>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

<!-- Heaviest Files (most dependencies) -->
<div class="section">
  <h2>Heaviest Files (Most Dependencies)</h2>
  <table>
    <thead><tr><th>File</th><th>Requires</th><th>Required By</th></tr></thead>
    <tbody>
    ${stats.heaviestFiles.map(f => `
      <tr>
        <td class="module-path">${f.path}</td>
        <td>${f.requires}</td>
        <td>${f.requiredBy}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

<!-- Unused Modules -->
<div class="section">
  <h2>Unused Modules (${unused.length})</h2>
  <div class="unused-list">
    ${unused.length === 0 ? '<p style="color:#3fb950">No unused modules detected.</p>' : `
    <table>
      <thead><tr><th>Module</th><th>Type</th><th>Own Requires</th></tr></thead>
      <tbody>
      ${unused.map(u => `
        <tr>
          <td class="module-path">${u.path}</td>
          <td>
            <span class="tag ${u.isLib ? 'tag-info' : u.isDriver ? 'tag-ok' : 'tag-warn'}">${u.isLib ? 'lib' : u.isDriver ? 'driver' : 'script'}</span>
          </td>
          <td>${u.requires}</td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  </div>
</div>

<!-- Dependency Table (all internal requires) -->
<div class="section">
  <h2>Full Dependency Table (Internal Only)</h2>
  <div class="dep-table-scroll">
    <table>
      <thead><tr><th>Source File</th><th>Requires</th><th>Line</th><th>Resolved</th></tr></thead>
      <tbody>
      ${graph.requires.filter(r => r.isRelative).slice(0, 500).map(r => `
        <tr>
          <td class="module-path" style="font-size:0.8em">${r.sourceFile}</td>
          <td style="font-size:0.8em;color:#c9d1d9">${r.module}</td>
          <td style="color:#8b949e">${r.line}</td>
          <td>${r.resolvedPath ? '<span class="tag tag-ok">OK</span>' : '<span class="tag tag-err">MISSING</span>'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${graph.requires.filter(r => r.isRelative).length > 500 ? `<p style="color:#8b949e;margin-top:8px">Showing 500 of ${graph.requires.filter(r => r.isRelative).length} internal requires</p>` : ''}
  </div>
</div>

<pre>
=== Dependency Graph Summary ===
Files Scanned: ${stats.totalFiles}
require() Calls: ${stats.totalRequireStatements}
Internal Modules: ${stats.uniqueInternalModules}
External Packages: ${stats.uniqueExternalModules}
Circular Dependencies: ${circulars.length}
Unused Modules: ${unused.length}
Generated: ${timestamp}
</pre>

</body>
</html>`;
}

function generateTextReport(graph, circulars, unused, stats) {
  const lines = [];
  lines.push('=== Dependency Graph Report ===');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`Files Scanned: ${stats.totalFiles}`);
  lines.push(`require() Calls: ${stats.totalRequireStatements}`);
  lines.push(`Internal Modules: ${stats.uniqueInternalModules}`);
  lines.push(`External Packages: ${stats.uniqueExternalModules}`);
  lines.push('');

  if (circulars.length > 0) {
    lines.push(`--- Circular Dependencies (${circulars.length}) ---`);
    for (let i = 0; i < circulars.length; i++) {
      lines.push(`  Cycle ${i + 1} (length ${circulars[i].length}):`);
      lines.push(`    ${circulars[i].files.join(' -> ')}`);
    }
    lines.push('');
  }

  lines.push('--- Top Required Modules ---');
  for (const m of stats.topRequired.slice(0, 15)) {
    lines.push(`  ${m.count}x  ${m.module}`);
  }
  lines.push('');

  if (unused.length > 0) {
    lines.push(`--- Unused Modules (${unused.length}) ---`);
    for (const u of unused.slice(0, 30)) {
      lines.push(`  [${u.isLib ? 'lib' : u.isDriver ? 'driver' : 'script'}] ${u.path}`);
    }
    if (unused.length > 30) lines.push(`  ... and ${unused.length - 30} more`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[DEP-GRAPH] Building dependency graph...');

  const args = process.argv.slice(2);
  let htmlOutput = pathMod.join(ROOT, 'scripts', 'cartography', 'dependency-output.html');
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) htmlOutput = args[++i];
    if (args[i] === '--json') jsonOutput = true;
  }

  // Build graph
  console.log('[DEP-GRAPH] Scanning all JS files for require() calls...');
  const graph = buildDependencyGraph();
  console.log(`[DEP-GRAPH] Scanned ${graph.allFiles.size} files, found ${graph.requires.length} require() calls`);

  // Detect circular dependencies
  console.log('[DEP-GRAPH] Detecting circular dependencies...');
  const circulars = detectCircularDependencies(graph);
  console.log(`[DEP-GRAPH] Found ${circulars.length} circular dependencies`);

  // Find unused modules
  console.log('[DEP-GRAPH] Finding unused modules...');
  const unused = findUnusedModules(graph);
  console.log(`[DEP-GRAPH] Found ${unused.length} unused modules`);

  // Compute stats
  const stats = computeStats(graph);

  // Generate output
  if (jsonOutput) {
    const jsonPath = htmlOutput.replace(/\.html$/, '.json');
    const jsonData = {
      stats,
      circulars,
      unused,
      topRequired: stats.topRequired,
      heaviestFiles: stats.heaviestFiles
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log(`[DEP-GRAPH] JSON: ${jsonPath}`);
  } else {
    console.log('[DEP-GRAPH] Generating HTML...');
    const html = generateHTML(graph, circulars, unused, stats);
    fs.writeFileSync(htmlOutput, html, 'utf8');
    console.log(`[DEP-GRAPH] HTML: ${htmlOutput}`);
  }

  // Always generate text
  const text = generateTextReport(graph, circulars, unused, stats);
  const textPath = htmlOutput.replace(/\.html$/, '.txt');
  fs.writeFileSync(textPath, text, 'utf8');
  console.log(`[DEP-GRAPH] Text: ${textPath}`);

  // Summary
  console.log(`[DEP-GRAPH] Summary:`);
  console.log(`  Files: ${stats.totalFiles}`);
  console.log(`  require() calls: ${stats.totalRequireStatements}`);
  console.log(`  Internal modules: ${stats.uniqueInternalModules}`);
  console.log(`  External packages: ${stats.uniqueExternalModules}`);
  console.log(`  Circular deps: ${circulars.length}`);
  console.log(`  Unused modules: ${unused.length}`);
}

main();
