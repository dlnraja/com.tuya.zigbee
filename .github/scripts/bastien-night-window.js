#!/usr/bin/env node
'use strict';
// P3366 clock helper (t1025u: no longer a publish gate; Bastien may upload at any hour).
// Kept so tests and tools can still read Europe/Paris hours. Before P3366 nothing enforced the old
// night rule: any push to
// bastien-home touching lib/** or a manual dispatch uploaded at once (build #256 was created at
// 22:48 Paris on 2026-11-21). A run outside the window is held as "deferred"; publish-self-heal
// (master, cron) re-dispatches it only inside the window. DST is handled by Intl (Europe/Paris).

const fs = require('fs');
const path = require('path');

const TZ = 'Europe/Paris';
const START_HOUR = 23; // inclusive
const END_HOUR = 6; // exclusive

function parisHour(date = new Date()) {
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(date);
  return Number.parseInt(h, 10);
}

function isNightWindow(date = new Date()) {
  const h = parisHour(date);
  return h >= START_HOUR || h < END_HOUR;
}

function main() {
  const now = process.env.NIGHT_WINDOW_NOW ? new Date(process.env.NIGHT_WINDOW_NOW) : new Date();
  const inside = isNightWindow(now);
  const hour = parisHour(now);
  const reason = inside
    ? `inside the Bastien night window (${hour}h Paris)`
    : `outside the Bastien night window 23h-06h Paris (${hour}h Paris): held, re-dispatched at night`;
  console.log(`[P3366] ${reason}`);
  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    fs.appendFileSync(out, `inside=${inside}\nhour=${hour}\nreason=${reason}\n`);
  }
  if (!inside && process.env.NIGHT_WINDOW_STATUS_FILE) {
    const f = process.env.NIGHT_WINDOW_STATUS_FILE;
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, `${JSON.stringify({ go: false, deferred: true, reason, at: now.toISOString() }, null, 2)}\n`);
  }
}

module.exports = { TZ, START_HOUR, END_HOUR, parisHour, isNightWindow };
if (require.main === module) main();
