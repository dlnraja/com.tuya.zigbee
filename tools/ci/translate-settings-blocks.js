#!/usr/bin/env node
'use strict';
/**
 * translate-settings-blocks.js (v9.0.374)
 * Real translations (not en fallback) for the settings blocks
 * power_source + optimization_mode across all locales.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const T = {
  de: { label: 'Stromquelle', hint: 'Stromquelle manuell wählen oder automatisch erkennen',
    auto: 'Automatisch erkennen', ac: 'Netzbetrieb', dc: 'DC-Betrieb', battery: 'Batteriebetrieb',
    olabel: 'Energie-Optimierungsmodus', ohint: 'Balance zwischen Reaktionsgeschwindigkeit und Batterielaufzeit',
    performance: 'Leistung (reaktionsschneller)', balanced: 'Ausgewogen', power_saving: 'Energiesparen (längere Batterie)' },
  nl: { label: 'Stroombron', hint: 'Kies stroombron handmatig of gebruik automatische detectie',
    auto: 'Automatisch detecteren', ac: 'Netstroom', dc: 'Gelijkstroom', battery: 'Op batterijen',
    olabel: 'Energie-optimalisatiemodus', ohint: 'Balans tussen reactiesnelheid en batterijduur',
    performance: 'Prestaties (responsiever)', balanced: 'Gebalanceerd', power_saving: 'Energiebesparing (langere batterij)' },
  es: { label: 'Fuente de alimentación', hint: 'Seleccione la fuente manualmente o use detección automática',
    auto: 'Detección automática', ac: 'Alimentación CA', dc: 'Alimentación CC', battery: 'A batería',
    olabel: 'Modo de optimización de energía', ohint: 'Equilibrio entre capacidad de respuesta y duración de batería',
    performance: 'Rendimiento (más receptivo)', balanced: 'Equilibrado', power_saving: 'Ahorro de energía (más batería)' },
  pl: { label: 'Źródło zasilania', hint: 'Wybierz źródło ręcznie lub użyj wykrywania automatycznego',
    auto: 'Wykryj automatycznie', ac: 'Zasilanie sieciowe', dc: 'Zasilanie DC', battery: 'Zasilanie bateryjne',
    olabel: 'Tryb optymalizacji energii', ohint: 'Równowaga między responsywnością a czasem pracy baterii',
    performance: 'Wydajność (szybsza reakcja)', balanced: 'Zbalansowany', power_saving: 'Oszczędzanie energii (dłuższa bateria)' },
  it: { label: 'Fonte di alimentazione', hint: 'Seleziona manualmente o usa il rilevamento automatico',
    auto: 'Rilevamento automatico', ac: 'Alimentazione CA', dc: 'Alimentazione CC', battery: 'A batteria',
    olabel: 'Modalità di ottimizzazione energetica', ohint: 'Equilibrio tra reattività e durata della batteria',
    performance: 'Prestazioni (più reattivo)', balanced: 'Bilanciato', power_saving: 'Risparmio energetico (batteria più lunga)' },
  sv: { label: 'Strömkälla', hint: 'Välj strömkälla manuellt eller använd automatisk identifiering',
    auto: 'Automatisk identifiering', ac: 'Nätdriven', dc: 'DC-driven', battery: 'Batteridriven',
    olabel: 'Energioptimeringsläge', ohint: 'Balans mellan svarstid och batteritid',
    performance: 'Prestanda (mer responsiv)', balanced: 'Balanserad', power_saving: 'Energibesparing (längre batteri)' },
  no: { label: 'Strømkilde', hint: 'Velg strømkilde manuelt eller bruk automatisk gjenkjenning',
    auto: 'Automatisk gjenkjenning', ac: 'Nettdrevet', dc: 'DC-drevet', battery: 'Batteridrevet',
    olabel: 'Energioptimaliseringsmodus', ohint: 'Balanse mellom responstid og batterilevetid',
    performance: 'Ytelse (mer responsiv)', balanced: 'Balansert', power_saving: 'Strømsparing (lengre batteri)' },
  da: { label: 'Strømkilde', hint: 'Vælg strømkilde manuelt eller brug automatisk registrering',
    auto: 'Automatisk registrering', ac: 'Netstrøm', dc: 'DC-strøm', battery: 'Batteridrevet',
    olabel: 'Energioptimeringstilstand', ohint: 'Balance mellem reaktionsevne og batterilevetid',
    performance: 'Ydelse (mere responsiv)', balanced: 'Afbalanceret', power_saving: 'Energibesparelse (længere batteri)' },
  ru: { label: 'Источник питания', hint: 'Выберите источник вручную или используйте автоопределение',
    auto: 'Автоопределение', ac: 'Питание от сети', dc: 'Питание DC', battery: 'От батареи',
    olabel: 'Режим оптимизации энергии', ohint: 'Баланс между отзывчивостью и временем работы батареи',
    performance: 'Производительность (быстрее)', balanced: 'Сбалансированный', power_saving: 'Энергосбережение (дольше батарея)' },
  pt: { label: 'Fonte de alimentação', hint: 'Selecione manualmente ou use a deteção automática',
    auto: 'Deteção automática', ac: 'Alimentação CA', dc: 'Alimentação CC', battery: 'A bateria',
    olabel: 'Modo de otimização de energia', ohint: 'Equilíbrio entre capacidade de resposta e duração da bateria',
    performance: 'Desempenho (mais reativo)', balanced: 'Equilibrado', power_saving: 'Poupança de energia (bateria mais longa)' },
  cs: { label: 'Zdroj napájení', hint: 'Vyberte zdroj ručně nebo použijte automatickou detekci',
    auto: 'Automatická detekce', ac: 'Napájení ze sítě', dc: 'Napájení DC', battery: 'Na baterie',
    olabel: 'Režim optimalizace energie', ohint: 'Rovnováha mezi odezvou a výdrží baterie',
    performance: 'Výkon (rychlejší odezva)', balanced: 'Vyvážený', power_saving: 'Úspora energie (delší baterie)' },
};

// Matrice complète des traductions par valeur (identique dans tous les fichiers)
const VALUE_MATRIX = { power_source: {}, optimization_mode: {} };
for (const [locale, t] of Object.entries(T)) {
  for (const k of ['auto', 'ac', 'dc', 'battery']) {
    VALUE_MATRIX.power_source[k] = { ...(VALUE_MATRIX.power_source[k] || {}), [locale]: t[k] };
  }
  for (const k of ['performance', 'balanced', 'power_saving']) {
    VALUE_MATRIX.optimization_mode[k] = { ...(VALUE_MATRIX.optimization_mode[k] || {}), [locale]: t[k] };
  }
}

for (const [locale, t] of Object.entries(T)) {
  const p = path.join(ROOT, 'locales', `${locale}.json`);
  if (!fs.existsSync(p)) {continue;}
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  d.settings = d.settings || {};
  const ps = d.settings.power_source || { values: {} };
  ps.label = t.label;
  ps.hint = t.hint;
  ps.values = ps.values || {};
  for (const k of ['auto', 'ac', 'dc', 'battery']) {
    ps.values[k] = { ...(ps.values[k] || {}), ...VALUE_MATRIX.power_source[k] };
  }
  d.settings.power_source = ps;
  const om = d.settings.optimization_mode || { values: {} };
  om.label = t.olabel;
  om.hint = t.ohint;
  om.values = om.values || {};
  for (const k of ['performance', 'balanced', 'power_saving']) {
    om.values[k] = { ...(om.values[k] || {}), ...VALUE_MATRIX.optimization_mode[k] };
  }
  d.settings.optimization_mode = om;
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
  console.log(`${locale}.json traduit`);
}

// fr.json : fusion de la matrice complète (labels français déjà présents)
{
  const p = path.join(ROOT, 'locales', 'fr.json');
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const k of ['auto', 'ac', 'dc', 'battery']) {
    d.settings.power_source.values[k] = { ...(d.settings.power_source.values[k] || {}), ...VALUE_MATRIX.power_source[k] };
  }
  for (const k of ['performance', 'balanced', 'power_saving']) {
    d.settings.optimization_mode.values[k] = { ...(d.settings.optimization_mode.values[k] || {}), ...VALUE_MATRIX.optimization_mode[k] };
  }
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
  console.log('fr.json fusionné');
}

// en.json porte aussi toutes les langues (le runtime lit la sous-clé locale)
{
  const p = path.join(ROOT, 'locales', 'en.json');
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  const ps = d.settings.power_source;
  const om = d.settings.optimization_mode;
  for (const [locale, t] of Object.entries(T)) {
    for (const k of ['auto', 'ac', 'dc', 'battery']) {
      ps.values[k] = { ...(ps.values[k] || {}), [locale]: t[k] };
    }
    for (const k of ['performance', 'balanced', 'power_saving']) {
      om.values[k] = { ...(om.values[k] || {}), [locale]: t[k] };
    }
  }
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
  console.log('en.json enrichi (11 langues par valeur)');
}
