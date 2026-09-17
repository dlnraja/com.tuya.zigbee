'use strict';

/**
 * QuietHoursGuard (P2566) — unbranded quiet-hours window check (Lutron/Aqara feel).
 * Pure math — shared by Path Light and flows. MASTER_ONLY.
 * UI: Quiet Hours.
 */

function parseHm(s) {
  if (!s || !/^\d{1,2}:\d{2}$/.test(String(s))) return null;
  const [h, m] = String(s).split(':').map(Number);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/**
 * @param {string} quietStart "HH:MM"
 * @param {string} quietEnd "HH:MM"
 * @param {Date} [date]
 * @returns {boolean}
 */
function isInQuietHours(quietStart, quietEnd, date = new Date()) {
  const qs = parseHm(quietStart);
  const qe = parseHm(quietEnd);
  if (qs == null || qe == null) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  if (qs === qe) return true; // full-day quiet
  if (qs < qe) return now >= qs && now < qe;
  return now >= qs || now < qe; // overnight
}

function minutesUntilQuietEnd(quietStart, quietEnd, date = new Date()) {
  if (!isInQuietHours(quietStart, quietEnd, date)) return 0;
  const qe = parseHm(quietEnd);
  const now = date.getHours() * 60 + date.getMinutes();
  if (qe == null) return 0;
  if (now < qe) return qe - now;
  return (24 * 60 - now) + qe;
}

module.exports = {
  isInQuietHours,
  minutesUntilQuietEnd,
  parseHm,
};
