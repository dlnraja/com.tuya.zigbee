/**
 * AI AUTOMATION RULES (v10.0)
 * 1. Anti-Degradation: AI bots MUST NOT remove a manufacturerName (MFS) from a driver.compose.json just because it is found in another driver. It must be kept in both, and collision handled at runtime or pairing logic.
 * 2. Enrichment: Any MFS conflict should be logged as MFS_COLLISION_WARNING instead of deleting footprints. This preserves backward compatibility for exotic variants.
 */
#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║   MASTER AUTOMATION PIPELINE — com.dlnraja.tuya.zigbee               ║
 * ║   Orchestrateur complet: validate → fix → check → commit → push        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Ce script est le point d'entrée unique pour TOUTE l'automatisation.
 * Il orchestre dans l'ordre:
 *
 *   PHASE 1 — HEALTH CHECK
 *     1a. Validation app.json dual-layer (Zigbee MF, WiFi exempt, Virtual exempt)
 *     1b. Validation JSON syntax tous les driver.compose.json
 *     1c. Vérification images (small.png / large.png)
 *     1d. Détection collisions fingerprints
 *
 *   PHASE 2 — AUTO-FIX
 *     2a. Fix manufacturerName vides depuis driver.compose.json / stable_app.json
 *     2b. Case-insensitive dedup des MFs
 *     2c. Sync driver.compose.json → app.json
 *
 *   PHASE 3 — VALIDATION FINALE
 *     3a. Re-run validation app.json
 *     3b. Rapport JSON complet
 *
 *   PHASE 4 — GIT (optionnel avec --commit)
 *     4a. git add -A
 *     4b. git commit avec message généré
 *     4c. git push origin master (avec --push)
 *
 * Usage:
 *   node scripts/master-automation.js [options]
 *
 * Options:
 *   --fix        Auto-fix les problèmes détectés
 *   --commit     Committer les corrections après fix
 *   --push       Pusher après commit (nécessite --commit)
 *   --strict     Exit 1 sur warnings aussi
 *   --verbose    Logs détaillés
 *   --report     Générer rapport JSON complet
 *   --dry-run    Simuler sans écrire
 *
 * @version 3.0.0 — Antigravity Master Build
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// ─── Configuration ───────────────────────────────────────────────────────────
const ROOT        = path.resolve(__dirname, '..');
const APP_JSON    = path.join(ROOT, 'app.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STABLE_JSON = path.join(ROOT, 'stable_app.json');
const REPORTS_DIR = path.join(ROOT, 'docs', 'reports');

const ARGS       = new Set(process.argv.slice(2));
const FIX        = ARGS.has('--fix');
const COMMIT     = ARGS.has('--commit');
const PUSH       = ARGS.has('--push');
const STRICT     = ARGS.has('--strict');
const VERBOSE    = ARGS.has('--verbose') || ARGS.has('-v');
const DRY_RUN    = ARGS.has('--dry-run');
const REPORT     = ARGS.has('--report') || true; // toujours actif

// ─── Console helpers ─────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',  red:    '\x1b[31m', green:  '\x1b[32m',
  yellow: '\x1b[33m', blue:   '\x1b[34m', cyan:   '\x1b[36m',
  bold:   '\x1b[1m',  dim:    '\x1b[2m',  magenta:'\x1b[35m'
};
const log  = (c, pfx, s) => console.log(c + pfx + s + C.reset);
const ok   = (s) => log(C.green,  '  ✅ ', s);
const fail = (s) => log(C.red,    '  ❌ ', s);
const warn = (s) => log(C.yellow, '  ⚠️  ', s);
const info = (s) => log(C.cyan,   '  ℹ️  ', s);
const hdr  = (s) => console.log(C.bold + C.blue + '\n┌─ ' + s + C.reset);
const sep  = ()  => console.log(C.dim + '  ' + '─'.repeat(60) + C.reset);

// ─── État global du rapport ───────────────────────────────────────────────────
const REPORT_DATA = {
  timestamp:   new Date().toISOString(),
  version:     '',
  phases:      {},
  errors:      [],
  warnings:    [],
  fixes:       [],
  stats:       {},
  conclusion:  'PENDING'
};

// ─── Utilitaires ─────────────────────────────────────────────────────────────
const WIFI_ID = (id) => {
  const s = (id||'').toLowerCase();
  return s.startsWith('wifi_') || s.includes('ewelink') || s.includes('sonoff') || s.includes('radiator_wifi');
};

function loadJSON(fpath) {
  try {
    return JSON.parse(fs.readFileSync(fpath));   // Buffer-based anti-OOM
  } catch (e) {
    return null;
  }
}

function classifyDriver(d) {
  if (!d) return 'unknown';
  const conn    = d.connectivity || [];
  const hasZigbee = !!d.zigbee;
  const isLan   = conn.some(c => ['lan','cloud'].includes(c));
  if (hasZigbee && isLan)   return 'hybrid';
  if (hasZigbee)             return 'zigbee';
  if (WIFI_ID(d.id))         return 'wifi';
  if (!conn.length && !hasZigbee) return 'virtual';
  return 'wifi'; // fallback pour drivers sans connectivity mais préfixe wifi
}

function hasMF(d) {
  return d.zigbee && Array.isArray(d.zigbee.manufacturerName) && d.zigbee.manufacturerName.length > 0;
}

// ─── PHASE 1a : Validation app.json dual-layer ───────────────────────────────
function phase1a_validateAppJson(app) {
  hdr('PHASE 1a — APP.JSON DUAL-LAYER VALIDATION');
  const drivers   = app.drivers || [];
  const errors    = [];
  const warnings  = [];

  // Top-level SDK3 requis
  const REQUIRED  = ['id','version','compatibility','sdk','name','description','category','permissions','images','author'];
  REQUIRED.forEach(k => { if (!app[k]) errors.push('TOP: champ manquant: ' + k); });
  if (app.sdk !== 3) errors.push('SDK doit être 3, trouvé: ' + app.sdk);
  if (!app.brandColor)           warnings.push('brandColor absent');
  if (!app.homeyCommunityTopicId)warnings.push('homeyCommunityTopicId absent');

  const stats = { total: drivers.length, zigbee:0, wifi:0, virtual:0, hybrid:0, ok:0, emptyMF:[] };

  drivers.forEach(d => {
    const type = classifyDriver(d);
    stats[type] = (stats[type] || 0) + 1;

    if (type === 'zigbee' || type === 'hybrid') {
      if (hasMF(d)) {
        stats.ok++;
      } else {
        stats.emptyMF.push({ id: d.id, type });
        errors.push('AGGREGATE_ERROR: ' + type + ' driver sans MF: ' + d.id);
      }
    }
  });

  let totalFP = 0;
  drivers.forEach(d => { if (d.zigbee && d.zigbee.manufacturerName) totalFP += d.zigbee.manufacturerName.length; });
  stats.totalFP = totalFP;
  stats.emptyMF.forEach(({ id, type }) => fail(type.toUpperCase() + ' sans MF: ' + id));
  if (stats.emptyMF.length === 0) ok('Tous les drivers Zigbee/Hybrid ont des MF statiques (' + (stats.zigbee + stats.hybrid) + ')');

  info('Zigbee: ' + stats.zigbee + ' | WiFi: ' + stats.wifi + ' | Hybrid: ' + stats.hybrid + ' | Virtual: ' + stats.virtual);

  REPORT_DATA.phases['1a'] = { errors, warnings, stats };
  REPORT_DATA.errors.push(...errors);
  REPORT_DATA.warnings.push(...warnings);
  REPORT_DATA.stats = stats;
  REPORT_DATA.version = app.version || '?';
  return errors.length === 0;
}

// ─── PHASE 1b : Syntax JSON compose ──────────────────────────────────────────
function phase1b_syntaxCheck() {
  hdr('PHASE 1b — SYNTAX JSON TOUS LES driver.compose.json');
  const broken = [];
  if (!fs.existsSync(DRIVERS_DIR)) { warn('drivers/ absent'); return true; }

  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
  });

  driverDirs.forEach(dId => {
    const composePath = path.join(DRIVERS_DIR, dId, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;
    try { JSON.parse(fs.readFileSync(composePath)); }
    catch(e) { broken.push({ id: dId, error: e.message }); }
  });

  if (broken.length > 0) {
    broken.forEach(b => fail('JSON invalide: ' + b.id + ' → ' + b.error.substring(0,80)));
  } else {
    ok('Tous les driver.compose.json sont valides (' + driverDirs.length + ')');
  }

  REPORT_DATA.phases['1b'] = { broken, total: driverDirs.length };
  REPORT_DATA.errors.push(...broken.map(b => 'JSON_SYNTAX: ' + b.id));
  return broken.length === 0;
}

// ─── PHASE 1c : Images check ─────────────────────────────────────────────────
function phase1c_imagesCheck() {
  hdr('PHASE 1c — IMAGES (small.png / large.png)');
  const missing = [];
  if (!fs.existsSync(DRIVERS_DIR)) return true;

  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
  });

  driverDirs.forEach(dId => {
    const imgDir = path.join(DRIVERS_DIR, dId, 'assets', 'images');
    const small  = path.join(imgDir, 'small.png');
    const large  = path.join(imgDir, 'large.png');
    if (!fs.existsSync(small)) missing.push(dId + '/small.png');
    if (!fs.existsSync(large)) missing.push(dId + '/large.png');
  });

  if (missing.length > 0) {
    if (VERBOSE) missing.forEach(m => warn('Image manquante: ' + m));
    else warn(missing.length + ' images manquantes (--verbose pour détails)');
  } else {
    ok('Toutes les images présentes (' + driverDirs.length * 2 + ')');
  }

  REPORT_DATA.phases['1c'] = { missing, total: driverDirs.length * 2 };
  if (missing.length > 0) REPORT_DATA.warnings.push('IMAGES: ' + missing.length + ' manquantes');
  return true; // non-bloquant
}

// ─── PHASE 1d : Collisions fingerprints ───────────────────────────────────────
function phase1d_collisionCheck(app) {
  hdr('PHASE 1d — COLLISIONS FINGERPRINTS');
  const drivers  = app.drivers || [];
  const mfIndex  = {}; // { "MF|PID" → [driverIds] }
  let collisions = 0;

  drivers.forEach(d => {
    if (!d.zigbee) return;
    const mfs = d.zigbee.manufacturerName || [];
    const pids_raw = d.zigbee.productId || [];
    const pids = Array.isArray(pids_raw) ? pids_raw : [pids_raw];

    mfs.forEach(mf => {
      if (!mf) return;
      if (pids.length === 0) {
        // MF seul comme fingerprint
        const key = mf.toUpperCase() + '|*';
        if (!mfIndex[key]) mfIndex[key] = [];
        mfIndex[key].push(d.id);
      } else {
        pids.forEach(pid => {
          const key = mf.toUpperCase() + '|' + pid.toUpperCase();
          if (!mfIndex[key]) mfIndex[key] = [];
          mfIndex[key].push(d.id);
        });
      }
    });
  });

  const collisionMap = {};
  Object.entries(mfIndex).forEach(([key, ids]) => {
    const uniqIds = [...new Set(ids)];
    if (uniqIds.length > 1) {
      collisions++;
      collisionMap[key] = uniqIds;
    }
  });

  if (collisions > 0) {
    warn('Collisions détectées: ' + collisions);
    if (VERBOSE) {
      Object.entries(collisionMap).slice(0, 10).forEach(([k, ids]) => {
        warn('  ' + k + ' → ' + ids.join(', '));
      });
    }
  } else {
    ok('Aucune collision fingerprint détectée');
  }

  REPORT_DATA.phases['1d'] = { collisions, collisionMap };
  if (collisions > 0) REPORT_DATA.warnings.push('COLLISIONS: ' + collisions);
  return true; // non-bloquant (collisions sont normales/intentionnelles)
}

// ─── PHASE 2 : AUTO-FIX ───────────────────────────────────────────────────────
function phase2_autoFix(app) {
  hdr('PHASE 2 — AUTO-FIX MANUFACTURERNAME VIDES');
  if (!FIX) { info('Mode fix désactivé. Utiliser --fix pour activer.'); return false; }

  const drivers = app.drivers || [];
  let stableMap = {};
  if (fs.existsSync(STABLE_JSON)) {
    const stable = loadJSON(STABLE_JSON);
    if (stable && stable.drivers) {
      stable.drivers.forEach(d => { stableMap[d.id] = d; });
    }
  }

  const fixes = [];

  drivers.forEach(d => {
    const type = classifyDriver(d);
    if (type !== 'zigbee' && type !== 'hybrid') return;
    if (hasMF(d)) return; // déjà OK

    const mfs = tryFixMFs(d.id, stableMap);
    if (mfs && mfs.length > 0) {
      if (!d.zigbee) d.zigbee = {};
      d.zigbee.manufacturerName = mfs;
      fixes.push({ id: d.id, type, count: mfs.length, source: 'auto' });
      ok('FIXÉ: ' + d.id + ' → ' + mfs.length + ' MFs');
    } else {
      fail('IMPOSSIBLE FIX: ' + d.id + ' (aucune source de MF trouvée)');
    }
  });

  if (fixes.length > 0 && !DRY_RUN) {
    fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2));
    ok('app.json mis à jour (' + fixes.length + ' drivers corrigés)');
  }

  REPORT_DATA.phases['2'] = { fixes, total: fixes.length };
  REPORT_DATA.fixes.push(...fixes);
  return fixes.length;
}

function tryFixMFs(driverId, stableMap) {
  // Source 1: driver.compose.json local
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    const c = loadJSON(composePath);
    const mfs = c && c.zigbee && c.zigbee.manufacturerName;
    if (mfs && mfs.length > 0) {
      return [...new Set(mfs.map(m => (m||'').trim()).filter(m => m))];
    }
  }
  // Source 2: stable_app.json
  const sd = stableMap[driverId];
  if (sd && sd.zigbee && sd.zigbee.manufacturerName && sd.zigbee.manufacturerName.length > 0) {
    return [...new Set(sd.zigbee.manufacturerName.map(m => (m||'').trim()).filter(m => m))];
  }
  return null;
}

// ─── PHASE 3 : VALIDATION FINALE ─────────────────────────────────────────────
function phase3_finalValidation(app) {
  hdr('PHASE 3 — VALIDATION FINALE');
  const pass = phase1a_validateAppJson(app);
  if (pass) ok('Validation finale: PASS — Zéro AggregateError');
  else fail('Validation finale: FAIL — ' + REPORT_DATA.errors.length + ' erreurs');
  return pass;
}

// ─── PHASE 4 : GIT COMMIT + PUSH ─────────────────────────────────────────────
function phase4_gitCommitPush(app, fixes) {
  hdr('PHASE 4 — GIT COMMIT & PUSH');

  if (!COMMIT) { info('Mode commit désactivé. Utiliser --commit pour activer.'); return; }
  if (DRY_RUN) { info('DRY-RUN: aucun commit effectué.'); return; }

  const version = app.version || '?';
  const msg = 'ci: auto-fix v' + version + ' — ' + fixes + ' drivers MF restaurés [auto]';

  try {
    const gitAdd = spawnSync('git', ['add', 'app.json', 'drivers/'], { cwd: ROOT, encoding: 'utf8' });
    if (gitAdd.status !== 0) { fail('git add failed: ' + gitAdd.stderr); return; }

    const gitCommit = spawnSync('git', ['commit', '-m', msg, '--no-verify'], { cwd: ROOT, encoding: 'utf8' });
    if (gitCommit.status !== 0 && !gitCommit.stdout.includes('nothing to commit')) {
      fail('git commit failed: ' + gitCommit.stderr);
      return;
    }
    ok('git commit: ' + msg);

    if (PUSH) {
      const gitPush = spawnSync('git', ['push', 'origin', 'master'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
      if (gitPush.status !== 0) {
        fail('git push failed: ' + (gitPush.stderr || '').substring(0, 200));
      } else {
        ok('git push origin master: OK');
      }
    }
  } catch(e) {
    fail('Git error: ' + e.message);
  }
}

// ─── RAPPORT JSON ─────────────────────────────────────────────────────────────
function saveReport() {
  try {
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const rpath = path.join(REPORTS_DIR, 'MASTER_AUTOMATION_REPORT.json');
    REPORT_DATA.conclusion = REPORT_DATA.errors.length === 0 ? 'PASS' : 'FAIL';
    fs.writeFileSync(rpath, JSON.stringify(REPORT_DATA, null, 2));
    info('Rapport sauvegardé: ' + rpath);
  } catch(e) { warn('Impossible de sauvegarder rapport: ' + e.message); }
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
async function main() {
  console.log(C.bold + C.magenta);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 MASTER AUTOMATION PIPELINE — com.dlnraja.tuya.zigbee   ║');
  console.log('║   Version: ' + new Date().toISOString().replace('T',' ').substring(0,19) + '                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝' + C.reset);

  const modes = [];
  if (FIX)     modes.push('--fix');
  if (COMMIT)  modes.push('--commit');
  if (PUSH)    modes.push('--push');
  if (STRICT)  modes.push('--strict');
  if (DRY_RUN) modes.push('--dry-run');
  if (VERBOSE) modes.push('--verbose');
  info('Modes actifs: ' + (modes.length ? modes.join(' ') : 'validation only'));

  // Charger app.json
  const app = loadJSON(APP_JSON);
  if (!app) { fail('app.json introuvable ou invalide. Arrêt.'); process.exit(1); }

  // ── Phase 1: Health checks ──
  const p1a = phase1a_validateAppJson(app);
  const p1b = phase1b_syntaxCheck();
  phase1c_imagesCheck();
  phase1d_collisionCheck(app);

  // ── Phase 2: Auto-fix si activé ──
  let fixCount = 0;
  if (!p1a && FIX) {
    fixCount = phase2_autoFix(app);
    // Recharger app.json après fix
    const appFixed = loadJSON(APP_JSON);
    if (appFixed) Object.assign(app, appFixed);
  } else if (!p1a) {
    info('Des erreurs ont été détectées. Lancer avec --fix pour les corriger automatiquement.');
  }

  // ── Phase 3: Validation finale ──
  const finalPass = phase3_finalValidation(app);

  // ── Phase 4: Git ──
  if (fixCount > 0) {
    phase4_gitCommitPush(app, fixCount);
  }

  // ── Rapport ──
  if (REPORT) saveReport();

  // ── Verdict final ──
  sep();
  const totalErrors = REPORT_DATA.errors.filter(e => !e.startsWith('TOP:')).length +
                      (p1a ? 0 : (REPORT_DATA.phases['1a']?.errors?.length || 0));

  if (finalPass && p1b) {
    console.log(C.bold + C.green + '\n  ✅ PIPELINE: SUCCÈS — PRÊT POUR PUBLISH' + C.reset);
    const fp = REPORT_DATA.stats.totalFP || '?';
  console.log(C.green + '  ' + (app.drivers||[]).length + ' drivers | ' + fp + ' fingerprints' + C.reset);
    process.exit(0);
  } else {
    console.log(C.bold + C.red + '\n  ❌ PIPELINE: ÉCHEC — ' + REPORT_DATA.errors.length + ' ERREURS' + C.reset);
    console.log(C.yellow + '  Lancer avec --fix pour corriger automatiquement.' + C.reset);
    process.exit(1);
  }
}

main().catch(e => { fail('FATAL: ' + e.message); console.error(e); process.exit(1); });

