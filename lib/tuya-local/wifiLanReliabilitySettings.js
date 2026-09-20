'use strict';

/**
 * P2619 — WiFi LAN reliability settings (complementary from andiwirz/com.tuyalocal).
 * WHY: Pet feeders / dehumidifiers briefly drop TCP; rapid SETs on 3.4/3.5 get silently dropped.
 * Append-only into compose via ComplementaryMerge — never wipe existing settings.
 */

const DEFAULT_COMMAND_GAP_MS = 100;
const DEFAULT_OFFLINE_GRACE_SECONDS = 60;

/** Settings fragments to UNION into Tuya-local wifi_* drivers (by id). */
const WIFI_LAN_RELIABILITY_SETTINGS = Object.freeze([
  {
    id: 'command_gap_ms',
    type: 'number',
    label: {
      en: 'Command Gap (ms)',
      fr: 'Écart entre commandes (ms)',
      nl: 'Opdracht-interval (ms)',
      de: 'Befehlsabstand (ms)',
    },
    value: DEFAULT_COMMAND_GAP_MS,
    min: 0,
    max: 10000,
    units: { en: 'ms' },
    hint: {
      en: 'Minimum gap between two LAN commands. Helps firmware that silently drops rapid SETs (protocol 3.4/3.5).',
      fr: 'Délai minimum entre deux commandes LAN. Évite les SET perdus sur protocole 3.4/3.5.',
    },
  },
  {
    id: 'offline_grace_seconds',
    type: 'number',
    label: {
      en: 'Offline Grace (seconds)',
      fr: 'Délai hors-ligne (s)',
      nl: 'Offline-grace (s)',
      de: 'Offline-Karenz (s)',
    },
    value: DEFAULT_OFFLINE_GRACE_SECONDS,
    min: 0,
    max: 600,
    units: { en: 's' },
    hint: {
      en: 'Delay before marking unavailable / firing disconnect flows after a brief TCP drop (pet feeders, dehumidifiers).',
      fr: 'Délai avant indisponible / flux déconnecté après une brève coupure TCP (pet feeders, déshumidificateurs).',
    },
  },
]);

function resolveCommandGapMs(settings) {
  const raw = settings && settings.command_gap_ms;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_COMMAND_GAP_MS;
  return Math.min(10000, Math.floor(n));
}

function resolveOfflineGraceMs(settings) {
  const raw = settings && settings.offline_grace_seconds;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_OFFLINE_GRACE_SECONDS * 1000;
  return Math.min(600, Math.floor(n)) * 1000;
}

module.exports = {
  DEFAULT_COMMAND_GAP_MS,
  DEFAULT_OFFLINE_GRACE_SECONDS,
  WIFI_LAN_RELIABILITY_SETTINGS,
  resolveCommandGapMs,
  resolveOfflineGraceMs,
};
