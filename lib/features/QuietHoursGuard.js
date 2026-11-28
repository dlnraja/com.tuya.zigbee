'use strict';

/**
 * QuietHoursGuard (P2566) - unbranded quiet-hours window check (Lutron/Aqara feel).
 * Pure math - shared by Path Light and flows. MASTER_ONLY.
 * UI: Quiet Hours.
 */

function parseHm(s) {
  if (s == null) {return null;}
  const trimmed = String(s).trim();
  if (!trimmed || !/^\d{1,2}:\d{2}$/.test(trimmed)) {return null;}
  const [h, m] = trimmed.split(':').map(Number);
  if (h > 23 || m > 59) {return null;}
  return (h * 60) + m;
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
  if (qs == null || qe == null) {return false;}
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const now = (d.getHours() * 60) + d.getMinutes();
  if (qs === qe) {return true;} // full-day quiet
  if (qs < qe) {return now >= qs && now < qe;}
  return now >= qs || now < qe; // overnight
}

function minutesUntilQuietEnd(quietStart, quietEnd, date = new Date()) {
  if (!isInQuietHours(quietStart, quietEnd, date)) {return 0;}
  const qe = parseHm(quietEnd);
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const now = (d.getHours() * 60) + d.getMinutes();
  if (qe == null) {return 0;}
  if (now < qe) {return qe - now;}
  return ((24 * 60) - now) + qe;
}

module.exports = {
  isInQuietHours,
  minutesUntilQuietEnd,
  parseHm,
};
