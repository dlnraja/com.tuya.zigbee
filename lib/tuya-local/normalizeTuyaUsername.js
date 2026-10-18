'use strict';

/**
 * P2476 — Normalize Smart Life / Tuya Smart username (email OR phone).
 * Contre quoi: phone-only accounts rejected when UI forces type=email.
 */

function digitsOnly(value) {
  return String(value || '').replace(/\D+/g, '');
}

/**
 * @param {string} username
 * @param {string|number} [countryCode]
 * @returns {{ username: string, kind: 'email'|'phone', countryCode: string|null }}
 */
function normalizeTuyaUsername(username, countryCode) {
  const raw = String(username || '').trim();
  if (!raw) {
    return { username: '', kind: 'email', countryCode: null };
  }
  if (raw.includes('@')) {
    return { username: raw.toLowerCase(), kind: 'email', countryCode: null };
  }

  const cc = digitsOnly(countryCode) || null;
  let phone = digitsOnly(raw);
  // Strip leading 00 international prefix
  if (phone.startsWith('00')) phone = phone.slice(2);
  // If user typed +33… already in digitsOnly as 33…
  if (cc && phone.startsWith(cc) && phone.length > cc.length + 4) {
    return { username: phone, kind: 'phone', countryCode: cc };
  }
  if (cc && phone && !phone.startsWith(cc)) {
    phone = `${cc}${phone.replace(/^0+/, '')}`;
  }
  return { username: phone || raw, kind: 'phone', countryCode: cc };
}

module.exports = {
  normalizeTuyaUsername,
  digitsOnly,
};
