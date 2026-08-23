#!/usr/bin/env node
'use strict';

/**
 * gmail-auth-cascade.js (P2226)
 *
 * Intelligent Gmail access cascade for IDE + CI:
 *
 *   L0  Cursor Gmail plugin (IDE/agent only — not available in GitHub Actions)
 *   L1  IMAP via GitHub secrets GMAIL_EMAIL + GMAIL_APP_PASSWORD
 *       (also accepts HOMEY_EMAIL + HOMEY_PASSWORD / app-password style)
 *   L2  OAuth via GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN
 *   L3  Local state reader (.github/state diagnostics already fetched)
 *
 * WHY: If the Cursor plugin fails/auth expires, CI and local scripts must keep
 * harvesting Homey diagnostics through the pre-plugin GitHub-secret paths.
 *
 *   node .github/scripts/gmail-auth-cascade.js
 *   node .github/scripts/gmail-auth-cascade.js --json
 *   node .github/scripts/gmail-auth-cascade.js --probe-live   # tries IMAP then OAuth (no body dump)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE = path.join(ROOT, '.github', 'state');

function boolEnv(name, fallback = false) {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(String(v).trim());
}

function redactEmail(e) {
  const s = String(e || '');
  if (!s.includes('@')) return s ? '***' : '';
  const [u, d] = s.split('@');
  return `${u.slice(0, 2)}***@${d}`;
}

function probeCredentials() {
  const email = process.env.GMAIL_EMAIL || process.env.HOMEY_EMAIL || '';
  const appPass = process.env.GMAIL_APP_PASSWORD || process.env.HOMEY_PASSWORD || '';
  const hasImap = Boolean(email && appPass);
  const hasOAuth = Boolean(
    process.env.GMAIL_CLIENT_ID
    && process.env.GMAIL_CLIENT_SECRET
    && process.env.GMAIL_REFRESH_TOKEN
  );
  const pluginHint = boolEnv('CURSOR_GMAIL_OK', false)
    || boolEnv('GMAIL_PLUGIN_OK', false)
    || process.env.CURSOR_GMAIL_STATUS === 'ready';

  const reportPath = path.join(STATE, 'diagnostics-report.json');
  const statePath = path.join(STATE, 'diagnostics-state.json');
  const hasLocal = fs.existsSync(reportPath) || fs.existsSync(statePath);

  return {
    generatedAt: new Date().toISOString(),
    policy: 'Plugin IDE-only; CI uses secrets cascade IMAP→OAuth→local',
    layers: {
      L0_cursor_plugin: {
        role: 'IDE / Cursor agent only',
        availableInCI: false,
        hintedOk: pluginHint,
        note: 'Agent probes plugin-gmail MCP; on failure set nothing and fall through to L1–L3',
      },
      L1_imap_secrets: {
        role: 'Primary CI / local live fetch',
        ready: hasImap,
        email: hasImap ? redactEmail(email) : null,
        secrets: ['GMAIL_EMAIL', 'GMAIL_APP_PASSWORD'],
        aliases: ['HOMEY_EMAIL', 'HOMEY_PASSWORD'],
      },
      L2_oauth_secrets: {
        role: 'Fallback when IMAP app-password breaks',
        ready: hasOAuth,
        secrets: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'],
      },
      L3_local_state: {
        role: 'Offline / last-resort from prior CI harvests',
        ready: hasLocal,
        paths: ['.github/state/diagnostics-report.json', '.github/state/diagnostics-state.json'],
      },
    },
    recommended: hasImap ? 'L1_imap' : hasOAuth ? 'L2_oauth' : hasLocal ? 'L3_local' : 'configure_secrets',
    ciReady: hasImap || hasOAuth || hasLocal,
  };
}

async function probeLive(summary) {
  const live = { imap: null, oauth: null, local: null };
  if (summary.layers.L1_imap_secrets.ready) {
    try {
      const imap = require('./gmail-imap-reader');
      const batch = await imap.readViaIMAP({ maxResults: 3 });
      live.imap = {
        ok: Array.isArray(batch),
        count: Array.isArray(batch) ? batch.length : 0,
        sampleSubj: Array.isArray(batch) && batch[0] ? String(batch[0].subj || '').slice(0, 80) : null,
      };
    } catch (err) {
      live.imap = { ok: false, error: String(err.message || err).slice(0, 120) };
    }
  }
  if ((!live.imap || !live.imap.ok) && summary.layers.L2_oauth_secrets.ready) {
    try {
      const oauth = require('./gmail-oauth-reader');
      const batch = await oauth.readViaOAuth({ maxResults: 3 });
      live.oauth = {
        ok: Array.isArray(batch),
        count: Array.isArray(batch) ? batch.length : 0,
      };
    } catch (err) {
      live.oauth = { ok: false, error: String(err.message || err).slice(0, 120) };
    }
  }
  if (summary.layers.L3_local_state.ready) {
    try {
      const { readLocally } = require('./gmail-local-reader');
      const batch = readLocally({ limit: 5 });
      live.local = {
        ok: Array.isArray(batch) && batch.length >= 0,
        count: Array.isArray(batch) ? batch.length : 0,
      };
    } catch (err) {
      live.local = { ok: false, error: String(err.message || err).slice(0, 120) };
    }
  }
  return live;
}

function writeState(summary) {
  fs.mkdirSync(STATE, { recursive: true });
  const out = path.join(STATE, 'gmail-auth-cascade.json');
  fs.writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
  return out;
}

async function main() {
  const json = process.argv.includes('--json');
  const probe = process.argv.includes('--probe-live');
  const summary = probeCredentials();

  if (probe) {
    summary.live = await probeLive(summary);
    const anyLive = Boolean(
      summary.live?.imap?.ok
      || summary.live?.oauth?.ok
      || summary.live?.local?.ok
    );
    summary.liveOk = anyLive;
  }

  const statePath = writeState(summary);

  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log('=== Gmail auth cascade (P2226) ===');
    console.log('L0 Cursor plugin (IDE):', summary.layers.L0_cursor_plugin.hintedOk ? 'hinted OK' : 'not signaled — use secrets if needed');
    console.log('L1 IMAP secrets:', summary.layers.L1_imap_secrets.ready ? `ready (${summary.layers.L1_imap_secrets.email})` : 'missing');
    console.log('L2 OAuth secrets:', summary.layers.L2_oauth_secrets.ready ? 'ready' : 'missing');
    console.log('L3 Local state:', summary.layers.L3_local_state.ready ? 'ready' : 'missing');
    console.log('Recommended:', summary.recommended);
    console.log('CI ready:', summary.ciReady);
    if (summary.live) {
      console.log('Live probe:', JSON.stringify(summary.live));
    }
    console.log('State:', statePath);
  }

  // Soft exit: missing secrets is warning unless --strict
  if (process.argv.includes('--strict') && !summary.ciReady) process.exit(2);
  if (probe && process.argv.includes('--strict') && !summary.liveOk) process.exit(2);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = {
  probeCredentials,
  probeLive,
};
