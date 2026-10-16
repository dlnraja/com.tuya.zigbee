#!/usr/bin/env node
'use strict';

/**
 * P2832 — Peer complementary enrich cron orchestrator (free / autonomous)
 *
 * WHY: Automate the complementary UNION pass we do by hand:
 *      Johan/Lidl compose rewrite (P2830) + Johan mega couples (P2572) + FP prune.
 * HOW: Spawn existing scripts only — no invent pid, no forum POST, no paid AI.
 * POUR QUI: BOTH reliability FP coverage (master cron; stable surgical later).
 * QUAND: GHA cron Mon/Thu + workflow_dispatch; soft dry in auto-enrich.
 * CONTRE QUOI: cartesian P2570 blast; wipe compose; forum POST; paid overage.
 *
 *   node tools/ci/p2832-peer-complementary-cron.js
 *   node tools/ci/p2832-peer-complementary-cron.js --apply
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply') || process.env.PEER_COMPOSE_APPLY === '1';
const SKIP_MEGA = process.argv.includes('--skip-mega') || process.env.PEER_COMPOSE_SKIP_MEGA === '1';
const SKIP_PRUNE = process.argv.includes('--skip-prune') || process.env.PEER_COMPOSE_SKIP_PRUNE === '1';
const OUT = path.join(ROOT, 'reports', `peer-complementary-cron-${new Date().toISOString().slice(0, 10)}`);

function run(label, args, opts = {}) {
  const soft = opts.soft !== false;
  console.log(`[P2832] ▶ ${label}`);
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 << 20,
    env: {
      ...process.env,
      AI_FORCE_LOCAL: 'true',
      AI_ALLOW_PAID: 'false',
      AI_ALLOW_REMOTE: 'false',
      FORUM_AUTO_POST: '0',
      SHADOW_FORUM: '1',
      DISCOURSE_WRITE: '0',
    },
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (out) console.log(out.split('\n').slice(-25).join('\n'));
  if (r.status !== 0 && !soft) {
    throw new Error(`${label} failed exit=${r.status}`);
  }
  return { label, status: r.status || 0, soft, tail: out.split('\n').slice(-8).join('\n') };
}

function main() {
  if (process.env.PEER_COMPOSE_ENRICH_DISABLED === 'true' || process.env.PEER_COMPOSE_ENRICH_DISABLED === '1') {
    console.log('[P2832] kill switch PEER_COMPOSE_ENRICH_DISABLED — exit 0');
    process.exit(0);
  }

  console.log(`[P2832] Peer complementary cron — ${APPLY ? 'APPLY' : 'DRY'} (free, silent, no invent)`);
  fs.mkdirSync(OUT, { recursive: true });

  const steps = [];

  // 1) Peer Homey apps compose → our drivers (P2830)
  steps.push(
    run(
      'P2830 peer compose',
      [
        path.join('tools', 'ci', 'p2830-peer-apps-compose-complementary.js'),
        ...(APPLY ? ['--apply'] : []),
      ],
      { soft: true },
    ),
  );

  // 2) Johan mega complementary couples (P2572 — already refuses mfr-only cartesian)
  if (!SKIP_MEGA) {
    steps.push(
      run(
        'P2572 Johan mega',
        [
          path.join('tools', 'ci', 'p2572-johan-mega-complementary.js'),
          ...(APPLY ? ['--apply'] : []),
        ],
        { soft: true },
      ),
    );
  }

  // NOTE: P2570 dump-wide apply is intentionally NOT in this cron (pid cartesian blast).
  // Maintainers may run: npm run enrich:johan:apply -- --force-medium after audit.

  // 3) Collision prune (registry/mfs hint — complementary strip of wrong homes only)
  if (!SKIP_PRUNE && APPLY) {
    steps.push(
      run('prune-fp --apply', [path.join('tools', 'ci', 'prune-fp-collision-bleed.js'), '--apply'], {
        soft: true,
      }),
    );
  }
  if (!SKIP_PRUNE) {
    steps.push(
      run('prune-fp --check', [path.join('tools', 'ci', 'prune-fp-collision-bleed.js'), '--check'], {
        soft: true,
      }),
    );
  }

  // 4) Contre quoi gates (soft in cron — hard in CI check:p283x)
  steps.push(
    run(
      'check:p2830',
      ['--test', path.join('test', 'critical', 'p2830-peer-apps-compose-complementary.test.js')],
      { soft: true },
    ),
  );

  const report = {
    id: 'P2832',
    mode: APPLY ? 'apply' : 'dry-run',
    generatedAt: new Date().toISOString(),
    dualApp: 'BOTH',
    policy: {
      complementaryOnly: true,
      neverInventPid: true,
      forumPost: false,
      paidAi: false,
      skipP2570Cartesian: true,
      freeSourcesOnly: true,
    },
    steps,
  };
  fs.writeFileSync(path.join(OUT, 'REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(
    path.join(OUT, 'REPORT.md'),
    [
      '# P2832 Peer complementary cron',
      '',
      `Mode: **${report.mode}** · ${report.generatedAt}`,
      '',
      ...steps.map((s) => `- ${s.label}: exit=${s.status}${s.soft ? ' (soft)' : ''}`),
      '',
      'Silent enrich only. No forum POST. No invent pid. No paid AI.',
      '',
    ].join('\n'),
  );

  console.log(`[P2832] report → ${OUT}`);
  const hardFail = steps.some((s) => !s.soft && s.status !== 0);
  process.exit(hardFail ? 1 : 0);
}

main();
