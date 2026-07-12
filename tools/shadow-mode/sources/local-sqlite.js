/**
 * sources/local-sqlite.js
 *
 * Pulls tickets/errors from local Codex SQLite databases:
 *   - ~/.codex/state_5.sqlite (13 threads + spawn_edges)
 *   - ~/.codex/logs_2.sqlite (14,101 logs)
 *
 * Filters for ERROR level logs and uses them as "implicit tickets" — issues
 * that the AI agent encountered during a session.
 *
 * App cible: BOTH master + stable.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const CODEX_DIR = path.join(os.homedir(), '.codex');
const STATE_DB = path.join(CODEX_DIR, 'state_5.sqlite');
const LOGS_DB = path.join(CODEX_DIR, 'logs_2.sqlite');

function pullFromCodexSqlite() {
  const tickets = [];

  // Read error logs from logs_2.sqlite
  if (fs.existsSync(LOGS_DB)) {
    try {
      const db = new DatabaseSync(LOGS_DB, { readOnly: true });
      const rows = db.prepare(`
        SELECT ts, level, message
        FROM logs
        WHERE level = 'ERROR'
        LIMIT 200
      `).all();

      for (const r of rows) {
        const m = r.message.match(/apply_patch verification failed on (\S+) for method (\S+)/);
        if (m) {
          tickets.push({
            id: `codex-log-${r.ts}-${m[1]}`,
            source: 'codex-sqlite-logs_2',
            title: `apply_patch failure on ${m[1]} (method ${m[2]})`,
            body: r.message,
            mfr: null,
            deviceIds: [m[1]],
            status: 'open',
          });
        } else if (/MODULE_NOT_FOUND/.test(r.message)) {
          tickets.push({
            id: `codex-modulenotfound-${r.ts}`,
            source: 'codex-sqlite-logs_2',
            title: 'MODULE_NOT_FOUND during investigation',
            body: r.message,
            mfr: null,
            deviceIds: [],
            status: 'open',
          });
        } else if (/rg:.*cannot find the file/i.test(r.message)) {
          tickets.push({
            id: `codex-rg-${r.ts}`,
            source: 'codex-sqlite-logs_2',
            title: 'ripgrep path error',
            body: r.message,
            mfr: null,
            deviceIds: [],
            status: 'open',
          });
        }
      }
      db.close();
    } catch (e) {
      // ignore
    }
  }

  // Read sessions from state_5.sqlite
  if (fs.existsSync(STATE_DB)) {
    try {
      const db = new DatabaseSync(STATE_DB, { readOnly: true });
      const sessions = db.prepare(`
        SELECT id, title, model, total_tokens
        FROM threads
        WHERE total_tokens > 1000000
        ORDER BY total_tokens DESC
        LIMIT 50
      `).all();

      for (const s of sessions) {
        if (/zigbee|tuya|homey|valve|calibration/i.test(s.title || '')) {
          tickets.push({
            id: `codex-session-${s.id}`,
            source: 'codex-sqlite-state_5',
            title: `Heavy Codex session: ${s.title || '(no title)'}`,
            body: `Model: ${s.model}, tokens: ${s.total_tokens.toLocaleString()}. Possible source of cross-context contamination.`,
            mfr: null,
            deviceIds: [],
            status: 'monitored',
          });
        }
      }
      db.close();
    } catch (e) {
      // ignore
    }
  }

  return tickets;
}

module.exports = { pullFromCodexSqlite };
