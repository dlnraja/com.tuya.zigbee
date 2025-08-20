const { LANG_HINTS } = require('./lang-dicts.js');
const { inferDpMappingsFromText } = require('../heuristics/dp-guess.js');
const { inferZclMappingsFromText } = require('../heuristics/zcl-guess.js');

function detectLang(text) {
  // heuristic ultra-simple: check for distinctive Unicode ranges or keywords
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[А-Яа-яЁё]/.test(text)) return 'ru';
  if (/\bél|una|de\b/i.test(text)) return 'es';
  if (/\bund|der|die\b/i.test(text)) return 'de';
  if (/\ble|la|un\b/i.test(text)) return 'fr';
  return 'en';
}

function parseForumText(text = '', familyHint = null) {
  const lang = detectLang(text);
  const L = LANG_HINTS[lang] || LANG_HINTS.en;

  const events = [];
  if (L.button_press?.test(text)) events.push('button_pressed');
  if (L.button_double?.test(text)) events.push('button_double');
  if (L.button_hold?.test(text)) events.push('button_held');
  if (L.set_position?.test(text)) events.push('windowcoverings_set');

  const dp = inferDpMappingsFromText(text, familyHint);
  const zcl = inferZclMappingsFromText(text);

  // Coalesce confidence (not exceeding 0.9; will be rescored later)
  let confidence = Math.max(dp.confidence, zcl.confidence);
  if (events.length) confidence += 0.05;
  if (confidence > 0.9) confidence = 0.9;

  return {
    lang, events, dpMap: dp.dpMap, zclMap: zcl.zclMap, confidence,
    notes: [dp.notes, zcl.notes, events.length ? 'Forum events detected' : null].filter(Boolean).join(' + ')
  };
}

module.exports = { parseForumText };
