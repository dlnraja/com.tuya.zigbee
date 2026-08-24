'use strict';

/**
 * DiagContentEnricher — structured extraction from Homey diagnostic emails / stdout.
 *
 * WHY: Gmail fetch + local triage need the same sacred-couple, signal, and log-id parsing.
 * HOW: Regex + pairing heuristics on sanitized text (no PII echo).
 * POUR QUI: fetch-gmail-diagnostics, analyze-diag-locally, forum-actionable-processor.
 */

const KNOWN_SIGNALS = [
  { id: 'ias_zone_object_coerce', severity: 'high', re: /0x\[object Object\]|Zone status change:\s*0x\[object/i, fix: 'IASZoneEnhanced coerce (≥9.0.621)' },
  { id: 'battery_spike_sos', severity: 'high', re: /Set battery:\s*\d+%[\s\S]{0,400}Set battery:\s*\d+%/i, fix: 'SOS battery debounce (button_emergency_sos)' },
  { id: 'invalid_flow_card', severity: 'medium', re: /Invalid Flow Card ID|flow card.*not found/i, fix: 'Check driver.flow.compose.json IDs' },
  { id: 'missing_capability_listener', severity: 'high', re: /Missing Capability Listener/i, fix: 'Register listener in onNodeInit' },
  { id: 'ef00_on_ias_only', severity: 'medium', re: /TUYA 0xEF00 FRAME RECEIVED[\s\S]{0,120}\[Driver:(?:water_leak|contact_sensor|button_emergency)/i, fix: 'shouldSkipIasOnlyEf00Tx' },
  { id: 'scene_mode_unsupported', severity: 'medium', re: /scene mode|0x8004|DeviceOperatingMode/i, fix: 'scene_switch / TS0044 profile' },
  { id: 'heap_oom', severity: 'critical', re: /JavaScript heap out of memory|FATAL ERROR:.*heap|Ineffective mark-compacts near heap limit|Allocation failed - JavaScript heap/i, fix: 'LiveData caps / buffer JSON load' },
  { id: 'aggregate_error', severity: 'critical', re: /AggregateError|empty manufacturername/i, fix: 'validate:mfr-empty gate' },
  { id: 'wrong_driver_hint', severity: 'medium', re: /not recognized|wrong driver|misattrib|smart_rcbo.*din|din.*smart_rcbo/i, fix: 'Lock sacred couple in compose + registry' },
  // f647d35b-style deep signals (P2233 recursive treat)
  { id: 'd101_no_mfr', severity: 'high', re: /D101:\s*No manufacturerName/i, fix: 'zclNode before ensureManufacturerSettings' },
  { id: 'd102_no_pid', severity: 'high', re: /D102:\s*No productId/i, fix: 'Persist zb_model_id; interview if still blank' },
  { id: 'ias_storm_button', severity: 'high', re: /\[Driver:button_[^\]]+\].{0,120}\[SDK3-IAS\].{0,160}Zone Enroll|\[Driver:button_[^\]]+\].{0,240}Het apparaat reageert niet/i, fix: 'Skip proactive IAS on wireless buttons' },
  { id: 'dcm_onoff_on_button', severity: 'high', re: /\[Driver:button_[^\]]+\].{0,240}\[DCM-FB\]\s*\+\s*onoff/i, fix: 'DCM refuse onoff on button drivers' },
  { id: 'dp_adapt_not_found', severity: 'low', re: /\[DP-ADAPT\]\s*Save patterns failed:\s*Not Found:\s*Device/i, fix: 'Soft-log DP-ADAPT after device delete' },
  { id: 'wrong_smart_rcbo', severity: 'critical', re: /\[Driver:smart_rcbo\].{0,400}_TZE284_6ocnqlhn|smart_rcbo.{0,80}6ocnqlhn/i, fix: 'din_rail_meter lock for Tongou couple' },
];

const MFR_RE = /\b(_TZE?\d{3,4}_[a-z0-9]{6,12})\b/gi;
const PID_RE = /\b(TS[A-Z0-9]{4,8}|ZG-[\w.-]+)\b/gi;
const BRAND_MFR_RE = /\b(HOBEIAN|eWeLink|SONOFF|LUMI|Wing|BSEED|Moes)\b/gi;
const DRIVER_LINE_RE = /\[Driver:([a-z0-9_]+)\]/gi;
const DEVICE_LINE_RE = /\[Device:([a-f0-9-]{36})\]/gi;

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function extractLogId(text) {
  const full = (text.match(/Log ID:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i) || [])[1];
  if (full) return { full, short: full.slice(0, 8) };
  const loose = (text.match(/\b([a-f0-9]{8})-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i) || [])[1];
  if (loose) return { full: text.match(/\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/i)[1], short: loose };
  return { full: null, short: null };
}

function extractUserMessage(text) {
  const m = text.match(/User Message:\s*(.+?)(?:\s+stdout:|\n\s*stdout:|(?:\s+Note:)|$)/i);
  if (!m) return null;
  return m[1].replace(/\s+/g, ' ').trim().slice(0, 320);
}

function extractMeta(text) {
  return {
    appVersion: (text.match(/\*App Version\*\s*\n?\s*v?([0-9.]+)/i) || text.match(/(?:app|tuya).?version[:\s]+v?([0-9.]{3,12})/i) || [])[1] || null,
    homeyVersion: (text.match(/\*Homey Version\*\s*\n?\s*v?([0-9.]+)/i) || text.match(/homey.?(?:firmware|version|fw)[:\s]+v?([0-9.]{3,12})/i) || [])[1] || null,
    homeyModel: (text.match(/\*Homey Model Name\*\s*\n?\s*([^\n*]+)/i) || [])[1]?.trim() || null,
    appId: (text.match(/\*App ID\*\s*\n?\s*([a-z.]+)/i) || [])[1] || null,
  };
}

function extractDrivers(text) {
  const drivers = [];
  let m;
  const re = new RegExp(DRIVER_LINE_RE.source, 'gi');
  while ((m = re.exec(text))) drivers.push(m[1]);
  return unique(drivers);
}

function extractDeviceIds(text) {
  const ids = [];
  let m;
  const re = new RegExp(DEVICE_LINE_RE.source, 'gi');
  while ((m = re.exec(text))) ids.push(m[1]);
  return unique(ids).slice(0, 8);
}

function isPlaceholderMfr(mfr) {
  return /abc123|example|placeholder|needs_device|hybrid_/i.test(String(mfr || ''));
}

function extractCouples(text) {
  const couples = [];
  // WHY: Homey settings + interview dumps use zb_* keys; also brand OEMs (HOBEIAN|ZG-*).
  const blockRe = /(?:manufacturerName|Manufacturer Name|zb_manufacturer_name|zb_manufacturerName)[:\s"'=]*([_A-Za-z0-9.-]+)[\s\S]{0,160}?(?:modelId|productId|Model ID|zb_model_id|zb_modelId)[:\s"'=]*([A-Za-z0-9_./-]+)/gi;
  let bm;
  while ((bm = blockRe.exec(text))) {
    const mfr = String(bm[1] || '').trim();
    const pid = String(bm[2] || '').trim();
    if (!mfr || !pid || isPlaceholderMfr(mfr)) continue;
    if (!(_TZE_OR_BRAND(mfr) && _PID_OK(pid))) continue;
    couples.push({ mfr, pid });
  }
  const mfrs = unique([
    ...[...(text.matchAll(MFR_RE))].map((x) => x[1]),
  ]).filter((m) => !isPlaceholderMfr(m));
  const brandMfrs = unique([...(text.matchAll(BRAND_MFR_RE))].map((x) => x[1]));
  const pids = unique([...(text.matchAll(PID_RE))].map((x) => x[1]))
    .filter((p) => !/^TS0601_rcbo$/i.test(p));
  // Prefer explicit adjacent couples; only cartesian when single Tuya mfr + few TS* pids
  // WHY (P2246): never pair Tuya mfr with retail ZG-* or brand OEM with loose TS*
  const tsPids = pids.filter((p) => /^TS/i.test(p));
  const zgPids = pids.filter((p) => /^ZG-/i.test(p));
  if (mfrs.length === 1 && tsPids.length === 1) couples.push({ mfr: mfrs[0], pid: tsPids[0] });
  else if (mfrs.length === 1 && tsPids.length && tsPids.length <= 2) {
    for (const pid of tsPids) couples.push({ mfr: mfrs[0], pid });
  }
  // Brand OEMs only pair with retail ZG-* pids (or explicit glue below)
  if (brandMfrs.length === 1) {
    for (const pid of zgPids) {
      couples.push({ mfr: brandMfrs[0], pid });
    }
  }
  // Compact "mfr+pid" / "mfr|pid" forms from forum/OCR pastes
  const glueRe = /\b(_TZE?\d{3,4}_[a-z0-9]{6,12}|HOBEIAN)\s*[+|]\s*(TS[A-Z0-9]{4,8}|ZG-[\w.-]+)\b/gi;
  let gm;
  while ((gm = glueRe.exec(text))) {
    couples.push({ mfr: gm[1], pid: gm[2] });
  }
  const seen = new Set();
  return couples.filter((c) => {
    const k = `${c.mfr.toLowerCase()}|${c.pid.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 12);
}

function _TZE_OR_BRAND(mfr) {
  return /^_TZE?\d{3,4}_/i.test(mfr) || /^(HOBEIAN|eWeLink|SONOFF|LUMI|Wing|BSEED|Moes)$/i.test(mfr);
}

function _PID_OK(pid) {
  return /^(TS[A-Z0-9]{4,8}|ZG-[\w.-]+)$/i.test(pid);
}

function extractSignals(text) {
  return KNOWN_SIGNALS.filter((s) => s.re.test(text)).map(({ id, severity, fix }) => ({ id, severity, fix }));
}

function extractLogHighlights(text, max = 8) {
  const lines = text.split(/\n|(?=\d{4}-\d{2}-\d{2}T)/);
  const interesting = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    if (/\[(ERROR|IAS-ZONE|TUYA-P0|DP\]|FLOW\]|BATTERY\]|Unhandled frame)/i.test(line)
      || /Error:|TypeError:|Cannot read|FATAL:/i.test(line)) {
      interesting.push(line.replace(/\s+/g, ' ').trim().slice(0, 160));
    }
    if (interesting.length >= max) break;
  }
  return interesting;
}

function enrich(text) {
  const t = String(text || '');
  const logId = extractLogId(t);
  const meta = extractMeta(t);
  const couples = extractCouples(t);
  const signals = extractSignals(t);
  const drivers = extractDrivers(t);
  const deviceIds = extractDeviceIds(t);
  const userMessage = extractUserMessage(t);
  const highlights = extractLogHighlights(t);

  return {
    logId: logId.full,
    logIdShort: logId.short,
    userMessage,
    meta,
    couples,
    signals,
    drivers,
    deviceIds,
    highlights,
    summary: buildSummary({ logId, meta, couples, signals, drivers, userMessage }),
  };
}

function buildSummary({ logId, meta, couples, signals, drivers, userMessage }) {
  const parts = [];
  if (logId.short) parts.push(`id=${logId.short}`);
  if (meta.appVersion) parts.push(`app=${meta.appVersion}`);
  if (couples.length) parts.push(`couple=${couples[0].mfr}+${couples[0].pid}`);
  else if (drivers.length) parts.push(`drivers=${drivers.slice(0, 3).join(',')}`);
  if (signals.length) parts.push(`signals=${signals.map((s) => s.id).join(',')}`);
  if (userMessage) parts.push(`msg="${userMessage.slice(0, 80)}${userMessage.length > 80 ? '…' : ''}"`);
  return parts.join(' | ');
}

function formatConsoleLine(type, subj, enriched) {
  const head = enriched.logIdShort ? `[${enriched.logIdShort}]` : `[${type}]`;
  const sub = String(subj || '').slice(0, 50);
  return `${head} ${sub} — ${enriched.summary || 'no structured signals'}`;
}

function renderTreatTableRows(entries, max = 15) {
  const rows = [];
  for (const e of entries) {
    const en = e.enriched || enrich([e.subj, e.bodyExcerpt, (e.errs || []).join(' ')].filter(Boolean).join('\n'));
    if (!en.logIdShort && e.type !== 'diagnostic') continue;
    rows.push({
      when: (e.date || '').slice(0, 16).replace('T', ' '),
      logId: en.logIdShort || '—',
      couple: en.couples[0] ? `${en.couples[0].mfr}+${en.couples[0].pid}` : (en.drivers[0] || en.userMessage?.slice(0, 40) || '—'),
      app: en.meta.appVersion || e.appVersion || '—',
      signals: en.signals.map((s) => s.id).join(', ') || '—',
      userMessage: en.userMessage,
    });
    if (rows.length >= max) break;
  }
  return rows;
}

module.exports = {
  enrich,
  extractLogId,
  extractUserMessage,
  extractCouples,
  extractSignals,
  extractDrivers,
  extractMeta,
  formatConsoleLine,
  renderTreatTableRows,
  KNOWN_SIGNALS,
};
