'use strict';

/**
 * P2619 / P2642 — WiFi LAN reliability settings (complementary from andiwirz/com.tuyalocal).
 * WHY: Pet feeders / dehumidifiers briefly drop TCP; rapid SETs on 3.4/3.5 get silently dropped;
 *      some firmware needs fire-and-forget SET (no ACK wait).
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

/** P2642 — fire-and-forget SET fragment (append via ComplementaryMerge by id). */
const FIRE_AND_FORGET_SETTING = Object.freeze({
  id: 'fire_and_forget',
  type: 'checkbox',
  label: {
    en: 'Fire and Forget',
    fr: 'Envoi sans accusé',
    de: 'Fire and Forget',
    nl: 'Fire and Forget',
  },
  value: false,
  hint: {
    en: 'Do not wait for SET acknowledgement (protocol 3.4/3.5 or devices that reset after a pulse).',
    fr: 'Ne pas attendre l’accusé SET (protocole 3.4/3.5 ou relais qui coupent après une impulsion).',
  },
});

/** Full UNION list for compose append (P2619 + P2642). */
const WIFI_LAN_RELIABILITY_SETTINGS_ALL = Object.freeze([
  ...WIFI_LAN_RELIABILITY_SETTINGS,
  FIRE_AND_FORGET_SETTING,
]);

function resolveCommandGapMs(settings) {
  const raw = settings && settings.command_gap_ms;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {return DEFAULT_COMMAND_GAP_MS;}
  return Math.min(10000, Math.floor(n));
}

function resolveOfflineGraceMs(settings) {
  const raw = settings && settings.offline_grace_seconds;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {return DEFAULT_OFFLINE_GRACE_SECONDS * 1000;}
  return Math.min(600, Math.floor(n)) * 1000;
}

/**
 * 2026-10-10 — battery Wi-Fi sleep window (opt-in, default 0 = off). Battery Wi-Fi sensors wake, report
 * and drop TCP; a sleeping device is not an offline device. Same idea as the battery/sleepy handling of
 * tuya-local and localtuya (devices that are only reachable while awake).
 */
const SLEEP_WINDOW_SETTING = Object.freeze({
  id: 'wifi_sleep_window_minutes',
  type: 'number',
  label: { en: 'Battery sleep window (minutes)', fr: 'Fenêtre de veille batterie (minutes)', nl: 'Batterij-slaapvenster (minuten)', de: 'Batterie-Schlaffenster (Minuten)' },
  value: 0,
  min: 0,
  max: 1440,
  units: { en: 'min' },
  hint: {
    en: '0 = off. For battery Wi-Fi devices that disconnect between reports: stay available for this long after the last report.',
    fr: '0 = désactivé. Pour les appareils Wi-Fi sur batterie qui se déconnectent entre deux rapports : rester disponible ce temps après le dernier rapport.',
  },
});

function resolveSleepWindowMs(settings) {
  const n = Number(settings && settings.wifi_sleep_window_minutes);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(1440, Math.floor(n)) * 60000;
}

function resolveFireAndForget(settings) {
  if (!settings) {return false;}
  return settings.fire_and_forget === true || settings.fire_and_forget === 'true';
}

module.exports = {
  DEFAULT_COMMAND_GAP_MS,
  DEFAULT_OFFLINE_GRACE_SECONDS,
  WIFI_LAN_RELIABILITY_SETTINGS,
  WIFI_LAN_RELIABILITY_SETTINGS_ALL,
  FIRE_AND_FORGET_SETTING,
  resolveCommandGapMs,
  resolveOfflineGraceMs,
  resolveFireAndForget,
  SLEEP_WINDOW_SETTING,
  resolveSleepWindowMs,
};
