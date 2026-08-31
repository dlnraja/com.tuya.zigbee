'use strict';

/**
 * RF channel coexistence helpers (2.4 GHz).
 *
 * Zigbee + Thread use IEEE 802.15.4 channel numbers (11–26).
 * Wi-Fi 2.4 GHz uses a DIFFERENT numbering scheme (1–13/14).
 * Comparing "Zigbee 15" vs "Wi-Fi 15" is a common user mistake — they are not the same.
 *
 * Frequencies (MHz, approximate centre / nominal 20 MHz Wi-Fi span):
 *   Zigbee/Thread ch N ≈ 2405 + 5*(N-11), ~2 MHz wide
 *   Wi-Fi ch 1  ≈ 2412 (2402–2422)
 *   Wi-Fi ch 6  ≈ 2437 (2427–2447)
 *   Wi-Fi ch 11 ≈ 2462 (2452–2472)
 *
 * Prefer Zigbee/Thread 15 / 20 / 25 when Wi-Fi uses 1 / 6 / 11 at 20 MHz.
 * Prefer Wi-Fi 20 MHz (not 40 MHz) on 2.4 GHz when coexistence matters.
 * Do not change Homey Zigbee/Thread channel lightly — devices may need Maintenance → Repair
 * (Zigbee) rather than remove/re-pair.
 */

const ZIGBEE_CHANNELS = Object.freeze([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]);

/** Primary consumer Wi-Fi channels (20 MHz). */
const WIFI_PRIMARY = Object.freeze([1, 6, 11]);

/**
 * Approximate Zigbee/Thread channels strongly overlapping a Wi-Fi 20 MHz primary.
 * Conservative engineering ranges used across Homey RF discussions.
 */
const WIFI20_OVERLAPS_ZIGBEE = Object.freeze({
  1: [11, 12, 13, 14],
  6: [16, 17, 18, 19],
  11: [21, 22, 23, 24],
});

/** Prefer these when Wi-Fi sits on 1/6/11 @ 20 MHz. */
const PREFERRED_ZIGBEE_CHANNELS = Object.freeze([15, 20, 25]);

function zigbeeCenterMhz(channel) {
  const ch = Number(channel);
  if (!Number.isFinite(ch) || ch < 11 || ch > 26) {return null;}
  return 2405 + 5 * (ch - 11);
}

function wifiCenterMhz(channel) {
  const ch = Number(channel);
  if (!Number.isFinite(ch) || ch < 1 || ch > 14) {return null;}
  return 2412 + 5 * (ch - 1);
}

function wifiNominalSpanMhz(channel, widthMhz = 20) {
  const center = wifiCenterMhz(channel);
  if (center == null) {return null;}
  const half = Number(widthMhz) / 2;
  return { low: center - half, high: center + half, center, widthMhz: Number(widthMhz) };
}

/**
 * Channels overlapped by a primary Wi-Fi channel (20 MHz table).
 * For 40 MHz, also merge the secondary (primary ± 4).
 */
function zigbeeChannelsOverlappedByWifi(wifiChannel, widthMhz = 20) {
  const primary = Number(wifiChannel);
  const set = new Set(WIFI20_OVERLAPS_ZIGBEE[primary] || []);
  if (Number(widthMhz) >= 40) {
    const secondary = primary >= 5 ? primary - 4 : primary + 4;
    for (const c of (WIFI20_OVERLAPS_ZIGBEE[secondary] || [])) {set.add(c);}
    // Edge: also pull neighbouring Zigbee channels near the widened span
    for (const c of ZIGBEE_CHANNELS) {
      const zc = zigbeeCenterMhz(c);
      const span = wifiNominalSpanMhz(primary, 40);
      if (zc != null && span && zc >= span.low - 2 && zc <= span.high + 2) {set.add(c);}
    }
  }
  return [...set].sort((a, b) => a - b);
}

function scoreWifiZigbeePair(wifiChannel, zigbeeChannel, widthMhz = 20) {
  const z = Number(zigbeeChannel);
  const overlapped = zigbeeChannelsOverlappedByWifi(wifiChannel, widthMhz);
  const overlap = overlapped.includes(z);
  const preferred = PREFERRED_ZIGBEE_CHANNELS.includes(z);
  let score = overlap ? 10 : (preferred ? 100 : 70);
  // Near-edge penalty (e.g. Zigbee 15 vs Wi-Fi 1): close but not in strong table
  const zc = zigbeeCenterMhz(z);
  const span = wifiNominalSpanMhz(wifiChannel, widthMhz);
  let nearEdge = false;
  if (zc != null && span) {
    const dist = Math.min(Math.abs(zc - span.low), Math.abs(zc - span.high), Math.abs(zc - span.center));
    if (!overlap && dist < 8) {
      nearEdge = true;
      score = Math.min(score, 40);
    }
  }
  let note = 'OK if Wi-Fi plan is known';
  if (overlap) {note = 'Strong overlap risk — prefer another Zigbee/Thread channel or move Wi-Fi';}
  else if (nearEdge) {note = 'Near Wi-Fi band edge — usable but larger separation is safer';}
  else if (preferred) {note = 'Good coexistence candidate vs common Wi-Fi 1/6/11';}
  return {
    score,
    overlap,
    nearEdge,
    preferred,
    wifiChannel: Number(wifiChannel),
    zigbeeChannel: z,
    widthMhz: Number(widthMhz),
    zigbeeMhz: zc,
    wifiSpan: span,
    note,
  };
}

function recommendZigbeeChannels(wifiChannels = [1, 6, 11], widthMhz = 20) {
  const wifiList = (Array.isArray(wifiChannels) ? wifiChannels : [wifiChannels]).map(Number);
  const blocked = new Set();
  for (const w of wifiList) {
    for (const z of zigbeeChannelsOverlappedByWifi(w, widthMhz)) {blocked.add(z);}
  }
  const ranked = ZIGBEE_CHANNELS.map((z) => {
    const scores = wifiList.map((w) => scoreWifiZigbeePair(w, z, widthMhz).score);
    const worst = Math.min(...scores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      channel: z,
      score: worst,
      avg: Math.round(avg),
      blocked: blocked.has(z),
      mhz: zigbeeCenterMhz(z),
    };
  }).sort((a, b) => b.avg - a.avg || b.score - a.score);

  // Canonical Homey advice when Wi-Fi uses the common 1/6/11 set (gaps between them).
  // When multiple Wi-Fi primaries are active at once, no single Zigbee channel is perfect —
  // still surface 15/20/25 as the industry gap channels.
  const preferred = [...PREFERRED_ZIGBEE_CHANNELS];
  const bestForCurrentWifi = ranked
    .filter((r) => !r.blocked && r.avg >= 50)
    .map((r) => r.channel);
  const avoid = ranked.filter((r) => r.blocked || r.score <= 10).map((r) => r.channel);

  return {
    preferred,
    bestForCurrentWifi,
    avoid,
    ranked,
    tips: [
      'Zigbee/Thread channel numbers ≠ Wi-Fi channel numbers (different numbering).',
      'Prefer Wi-Fi 20 MHz on 2.4 GHz when coexistence matters; 40 MHz widens overlap.',
      'Do not change Homey Zigbee/Thread channel casually — use Maintenance → Repair for Zigbee after a channel change when possible.',
      'RSSI alone is not link quality (noise, retries, asymmetry matter).',
    ],
  };
}

function formatCoexistenceTips(opts = {}) {
  const rec = recommendZigbeeChannels(opts.wifiChannels || [1, 6, 11], opts.widthMhz || 20);
  return [
    ...rec.tips,
    `Prefer Zigbee/Thread channels: ${rec.preferred.join(', ')}`,
    `Best vs current Wi-Fi plan: ${(rec.bestForCurrentWifi.slice(0, 6).join(', ') || rec.preferred.join(', '))}`,
    `Avoid strong overlap: ${rec.avoid.join(', ') || '(none strong)'}`,
  ];
}

module.exports = {
  ZIGBEE_CHANNELS,
  WIFI_PRIMARY,
  WIFI20_OVERLAPS_ZIGBEE,
  PREFERRED_ZIGBEE_CHANNELS,
  zigbeeCenterMhz,
  wifiCenterMhz,
  wifiNominalSpanMhz,
  zigbeeChannelsOverlappedByWifi,
  scoreWifiZigbeePair,
  recommendZigbeeChannels,
  formatCoexistenceTips,
};
