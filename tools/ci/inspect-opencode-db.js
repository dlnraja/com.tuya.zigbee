// inspect-opencode-db.js
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = path.join(process.env.USERPROFILE, '.local', 'share', 'opencode', 'opencode.db');
console.log('DB:', db);
console.log('Size:', (fs.statSync(db).size / 1024).toFixed(0), 'KB');

const sql = new DatabaseSync(db);
const tables = sql.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

const tokenPattern = /ghp_[a-zA-Z0-9]{20,}|github_pat_[a-zA-Z0-9_]{20,}|ghs_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,}/;

for (const t of tables) {
  try {
    const cols = sql.prepare('PRAGMA table_info(' + t.name + ')').all();
    const colNames = cols.map(c => c.name);
    const all = sql.prepare('SELECT * FROM ' + t.name + ' LIMIT 5').all();
    if (all.length) {
      console.log('  ' + t.name + ' [' + colNames.join(',') + ']');
      for (const row of all) {
        const s = JSON.stringify(row);
        if (tokenPattern.test(s)) {
          const m = s.match(tokenPattern);
          console.log('    !!! TOKEN FOUND:', m[0].substring(0, 10) + '***');
        }
        // Show short summary
        const summary = {};
        for (const c of colNames) {
          const v = row[c];
          if (typeof v === 'string' && v.length > 100) summary[c] = v.substring(0, 80) + '...';
          else summary[c] = v;
        }
        console.log('    sample:', JSON.stringify(summary).substring(0, 200));
      }
    }
  } catch (e) {
    console.log('  ' + t.name + ': error -', e.message);
  }
}
