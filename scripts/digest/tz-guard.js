'use strict';
/**
 * scripts/digest/tz-guard.js — keep Paris wall-clock times across DST with free cron.
 * GitHub cron is UTC-only, so each job declares TWO crons (summer UTC+2 and winter UTC+1).
 * This guard looks at the cron string that fired (github.event.schedule, NOT the current
 * time, so delayed runs still pass) and lets only the one matching today's Paris offset run.
 *
 * Usage: node tz-guard.js --schedule="16 6 * * 1-5" --paris-hour=8
 * Writes run=true|false to $GITHUB_OUTPUT. Empty schedule (dispatch/events) => run=true.
 */
const fs = require('fs');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const schedule = (arg('schedule') || process.env.SCHEDULE || '').trim();
const want = Number(arg('paris-hour'));

function parisOffsetHours(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' }).formatToParts(d);
  const tz = (parts.find((p) => p.type === 'timeZoneName') || {}).value || 'GMT+1';
  return Number((tz.match(/GMT([+-]\d+)/) || [0, 1])[1]);
}

let run = true;
let why = 'not a schedule event';
if (schedule) {
  const hours = schedule.split(/\s+/)[1].split(',').map(Number);
  const off = parisOffsetHours();
  const local = hours.map((h) => (h + off + 24) % 24);
  run = Number.isNaN(want) ? true : local.includes(want);
  why = `cron "${schedule}" = ${local.join(',')}h Paris today (UTC+${off}); want ${want}h`;
}
console.log(`tz-guard: run=${run} (${why})`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\n`);
