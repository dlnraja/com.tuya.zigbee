const fs = require('fs');
const path = require('path');

console.log('🧹 REORGANIZE_OPTIMIZE_V20 - Dry-run by default. Use --apply to move files.');

const APPLY = process.argv.includes('--apply');
const root = __dirname;

// Directories we expect
const dirs = {
  orchestrators: path.join(root, 'orchestrators'),
  scripts: path.join(root, 'scripts'),
  history: path.join(root, 'scripts', 'history'),
  enrichment: path.join(root, 'scripts', 'enrichment'),
  validation: path.join(root, 'scripts', 'validation'),
  validators: path.join(root, 'validators'),
  referentials: path.join(root, 'referentials'),
  scraping: path.join(root, 'scraping'),
  backup: path.join(root, 'backup'),
};

Object.values(dirs).forEach(d => fs.mkdirSync(d, { recursive: true }));

// Do not move anything inside these directories
const protectedDirs = new Set([
  'orchestrators','scripts','validators','referentials','scraping','backup','tools_moved','scripts_moved','reports'
]);

function planMoves() {
  const plans = [];
  const items = fs.readdirSync(root);
  for (const item of items) {
    const full = path.join(root, item);
    if (!item.endsWith('.js')) continue;
    if (fs.statSync(full).isDirectory()) continue;
    if (protectedDirs.has(item)) continue;

    const name = item.toLowerCase();
    let dest = null;

    if (name.includes('run_history') || name.includes('orchestrator') || name.includes('mega') || name.includes('evolved')) {
      dest = path.join(dirs.orchestrators, item);
    } else if (name.includes('history') || name.includes('branch') || name.includes('bypass_timeout')) {
      dest = path.join(dirs.history, item);
    } else if (name.includes('scrape') || name.includes('compare_enrich') || name.includes('enrich')) {
      // keep existing files under scraping/ as-is; only relocate root-level enrichment scripts
      dest = path.join(dirs.enrichment, item);
    } else if (name.includes('validate') || name.includes('validation')) {
      dest = path.join(dirs.validation, item);
    }

    if (dest && dest !== full) {
      plans.push({ from: full, to: dest });
    }
  }
  return plans;
}

const moves = planMoves();
if (moves.length === 0) {
  console.log('✅ Nothing to reorganize in ultimate_system root');
  process.exit(0);
}

console.log(`📦 Planned moves (${moves.length}):`);
for (const { from, to } of moves) {
  console.log(`- ${path.basename(from)} -> ${path.relative(root, to)}`);
}

if (!APPLY) {
  console.log('\n💡 Dry-run mode. Re-run with --apply to perform moves.');
  process.exit(0);
}

// Apply moves
for (const { from, to } of moves) {
  const destDir = path.dirname(to);
  fs.mkdirSync(destDir, { recursive: true });
  try {
    fs.renameSync(from, to);
    console.log(`✅ Moved ${path.basename(from)} -> ${path.relative(root, to)}`);
  } catch (e) {
    console.log(`⚠️ Failed to move ${from} -> ${to}: ${e.message}`);
  }
}

console.log('\n🎉 REORGANIZE_OPTIMIZE_V20 complete');
