#!/usr/bin/env node
'use strict';
/**
 * P3363 - changelog coherence for one Homey app tree.
 *
 * - Keep only version keys that belong to this app (master 9.x, stable 5.x, bastien 1.x).
 * - Rewrite a wrong or empty note from the commits since the previous version that this
 *   app actually published (ledger) or, if the ledger has no row, since the previous bump.
 * - Always write en+fr (and keep any other locales). Strip personal names and internal ids
 *   from the user-facing text. Never invent versions. Never remove a version of this app.
 *
 *   node scripts/automation/changelog-coherence.js [--root DIR] [--check|--fix] [--report FILE]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const CE = require('./changelog-entry.js');

const VER_RE = /^\d+\.\d+\.\d+$/;
const APP_SERIES = {
  'com.dlnraja.tuya.zigbee': '9.',
  'com.dlnraja.tuya.zigbee.stable': '5.',
  'com.dlnraja.tuya.zigbee.bastien': '1.',
};

const PII_RE = /\b(dlnraja|rajasekaram|dylan)\b/gi;
const INTERNAL_ID_RE = /\bP\d{3,5}[a-z]?\b|\bGH#\d+\b|\b#\d{2,5}\b/g;
const LINT_ONLY_RE = /lint ratchet|budget line|satisfy the lint/i;
const AUTO_RE = /\[auto:|^Merge /i;

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function appIdOf(root) {
  const compose = path.join(root, '.homeycompose', 'app.json');
  const app = path.join(root, 'app.json');
  const src = fs.existsSync(compose) ? compose : app;
  const j = readJson(src);
  return String(j.id || '');
}

function seriesOf(root) {
  const id = appIdOf(root);
  if (APP_SERIES[id]) return APP_SERIES[id];
  const ver = readJson(path.join(root, 'package.json')).version || '';
  const m = /^(\d+\.)/.exec(ver);
  return m ? m[1] : '';
}

function ownKey(version, series) {
  return VER_RE.test(version) && String(version).startsWith(series);
}

function versionKeys(obj) {
  return Object.keys(obj).filter((k) => VER_RE.test(k));
}

function foldWideChars(text) {
  return String(text || '')
    .replace(/\u0153/g, 'oe')
    .replace(/\u0152/g, 'OE')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2192/g, '->')
    .replace(/\u2190/g, '<-')
    .replace(/\u0192/g, 'f')
    .replace(/\u2248/g, '~')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2026/g, '...');
}

function sanitizeUserText(text) {
  let t = foldWideChars(text);
  t = t.replace(/\b\d+\s+\w+ comments deleted from \S+/gi, '');
  t = t.replace(PII_RE, 'the maintainer');
  t = t.replace(/\bP\d{3,5}[a-z]?\b/g, '');
  t = t.replace(/\bGH#\d+\b/g, '');
  t = t.replace(/#\d{2,5}\b/g, '');
  t = t.replace(/\(\s*[,;\s]*\)/g, '');
  t = t.replace(/\s+([,.;])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  return t;
}

const DEVICE_SUBJ = /drivers?|device|payload|battery|pair|fingerprint|flow card|graduate|held|sensor|switch|plug|curtain|thermostat|dimmer|image dedupe/i;

function fallbackNote(subjects) {
  const items = [];
  for (const s of subjects || []) {
    if (/superseded builds|write-back|lint ratchet|budget line|homeyignore|sacred couples|cross-research|inventory \+ critical/i.test(s)) continue;
    if (!DEVICE_SUBJ.test(s) && !/^P\d{3,5}/.test(s)) continue;
    const rest = String(s).replace(/^P\d{3,5}[a-z]?:\s*/i, '').replace(/\[skip ci\]/ig, '').replace(/\s+/g, ' ').trim();
    const head = sanitizeUserText(rest.replace(/\([^)]*\)/g, '').trim());
    if (head && !items.some((x) => x.toLowerCase() === head.toLowerCase())) {
      items.push(head.length > 90 ? head.slice(0, 87) + '...' : head);
    }
  }
  if (!items.length) return null;
  const list = items.slice(0, 4).join('; ') + (items.length > 4 ? '; +' + (items.length - 4) : '');
  if (/graduate \d+ held drivers|lossless packaged image/i.test(list)) {
    return {
      en: 'The Test build now includes previously held drivers in the payload. Packaged images were deduplicated without quality loss.',
      fr: 'La version Test inclut des appareils auparavant retenus dans le paquet. Les images ont ete dedupliquees sans perte de qualite.',
    };
  }
  return { en: 'Changed: ' + list + '.', fr: 'Modifie : ' + list + '.' };
}

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const out = { ...entry };
  for (const k of Object.keys(out)) {
    if (typeof out[k] === 'string') out[k] = sanitizeUserText(out[k]);
  }
  return out;
}

/** User-facing FR twin for a short EN note when no FR is stored. Templates only; no network. */
function frLooksEnglish(fr) {
  const t = String(fr || '');
  if (!t.trim()) return true;
  if (/\b(other changes in the app core|general reliability|Faster:|screenshots so the gate|ratchet on archive|do not reuse a red run|keep the composed build|breadcrumbs|capped device notes|stock filler note)\b/i.test(t)) return true;
  if (/\b(Fixed|Changed|Added|New|Diagnostic|Dimmers|Update|Behind|Plus)\s*:/.test(t) && /\b(the|and|with|from|device|settings)\b/i.test(t)) return true;
  const enHits = (t.match(/\b(the|and|with|from|that|this|for|are|was|were|been|being|Changed|Fixed|Added|Update|write-back|screenshots|payload|retry|ratchet|lossless|clamp|breadcrumbs|stderr|manifest|reliability|Re-pair|device UI|hybrid RX|general reliability|wall switches|Behind the scenes|other changes|publish chain)\b/gi) || []).length;
  const frHits = (t.match(/\b(le|la|les|des|une|est|sont|dans|pour|avec|sans|appareils|version|coulisses|Corrig\u00E9|Modifi\u00E9|Ajout\u00E9|Nouveau)\b/gi) || []).length;
  if (/^(Fixed|Changed|Added|New|Diagnostic|Dimmers|Update|Behind|Plus)\b/.test(t)) return true;
  return enHits >= 2 && enHits >= frHits;
}

function frFromEn(en) {
  const t = String(en || '').trim();
  const map = [
    [/^Maintenance build: same devices and behaviour as the previous version \(publishing and test tooling only\)\.$/,
      'Version de maintenance : memes appareils et meme comportement que la precedente (outils de publication et de test uniquement).'],
    [/^Maintenance release: checks, tests and build tooling only; devices behave as before\.$/,
      'Version de maintenance : controles, tests et outillage uniquement ; les appareils se comportent comme avant.'],
    [/^Behind the scenes: tests and publishing checks\.$/,
      'En coulisses : tests et controles de publication.'],
    [/^Changed: scale bidirectional clamp reports on the 3-phase profile; stderr breadcrumbs for large JSON parses and capped device notes; keep the precise publish call the suite locks;\s*(?:stable bump refuses a stock filler note\.)?\s*$/i,
      'Modifie : les rapports bidirectionnels du profil triphase sont bornes ; des traces d\'erreur pour les gros JSON et les notes d\'appareil trop longues ; l\'appel de publication que la suite verrouille reste inchange. La montee de version stable refuse une note de remplissage generique.'],
    [/^Device compatibility and reliability improvements\.$/i,
      'Ameliorations de compatibilite et de fiabilite des appareils.'],
    [/^Improved publish reliability and CI integrity checks\.$/i,
      'Fiabilite de publication et controles d\'integrite CI ameliores.'],
    [/^Improved radiator valve and mmWave radar pairing for recent forum devices\.$/i,
      'Appairage ameliore des vannes de radiateur et des radars mmWave pour les appareils recents du forum.'],
    [/^Improved scene remote press latency and radiator valve pairing\.$/i,
      'Latence des appuis de telecommande de scene et appairage des vannes de radiateur ameliores.'],
    [/^Fixed app settings blank infinite loader \(Homey\.ready before mesh\/WiFi scan\)\.$/i,
      'Corrige : le chargeur infini vide des reglages de l\'app (Homey.ready avant le scan mesh\/WiFi).'],
    [/^Improved local LAN reliability \(stale-data watchdog, fire-and-forget\)\.$/i,
      'Fiabilite LAN locale amelioree (surveillance des donnees perimees, envoi sans attente).'],
    [/^Improved local LAN reliability; fixed WiFi driver manifests for publish validation\.$/i,
      'Fiabilite LAN locale amelioree ; manifestes des pilotes WiFi corriges pour la validation de publication.'],
    [/^Improved ceiling radar lux\/distance response and wireless button pairing\.$/i,
      'Reponse lux\/distance du radar de plafond et appairage des boutons sans fil ameliores.'],
    [/^Improved wireless remote reliability \(skip IAS enroll storm on scene buttons\)\.$/i,
      'Fiabilite des telecommandes sans fil amelioree (pas de tempete d\'enrolement IAS sur les boutons de scene).'],
    [/^Improved fingerprint matching for wireless buttons and radiator valves\.$/i,
      'Correspondance des empreintes amelioree pour les boutons sans fil et les vannes de radiateur.'],
    [/^Improved TS0043\/TS0044 scene remote press detection with complementary fallback paths\.$/i,
      'Detection des appuis des telecommandes de scene TS0043\/TS0044 amelioree, avec chemins de repli complementaires.'],

    [/^Changed: do not reuse a red run after a manifest change; note that the keyfob endpoint lists IAS ACE; declare the keyfob IAS ACE cluster and hold the failed AOYAN probe; satisfy the lint ratchet for the budget line\.$/i,
      'Modifie : ne pas reutiliser une execution rouge apres un changement de manifeste ; noter que le point de terminaison du porte-cles declare IAS ACE ; declarer le cluster IAS ACE du porte-cles et conserver la sonde AOYAN en echec ; respecter le cliquet de lint pour la ligne de budget.'],
    [/^Changed: keep the composed build when staging the payload; stage the prepared directory and leave compose out of it; give the warned cards a titleFormatted and refuse a compose publish dir\.$/i,
      'Modifie : conserver le build compose lors de la preparation de l\'envoi ; deposer le repertoire prepare et laisser compose de cote ; donner un titleFormatted aux cartes signalees et refuser un repertoire de publication compose.'],
    [/^Dimmers \(2-gang dimmer module, dimmer wall switch, wall dimmer 1-gang\) now use the Light device type, so the light ring and voice assistants treat them as lights\. Paired devices switch once automatically; the device icon may change\. Capabilities, IDs and flows are unchanged\.$/i,
      'Les variateurs (module variateur 2 voies, interrupteur variateur mural, variateur mural 1 voie) utilisent desormais le type Lumiere, pour que l\'anneau lumineux et les assistants vocaux les voient comme des lumieres. Les appareils deja appaires basculent une fois automatiquement ; l\'icone peut changer. Capacites, identifiants et flux restent inchanges.'],
    [/^Bastien house: fixed fingerprint sync \+ button flow cards \(1-btn numbered, 3-btn, climate\)\. Update to 1\.0\.14 then REMOVE and re-add the 1-button, 3-button remotes and eWeLink climate sensor\. Recreate flows on the new devices\.$/i,
      'Maison Bastien : synchronisation des empreintes et cartes Flow des boutons corrigee (1 bouton numerote, 3 boutons, climat). Passez a 1.0.14 puis retirez et rajoutez les telecommandes 1 bouton et 3 boutons et le capteur climatique eWeLink. Recreez les flux sur les nouveaux appareils.'],
  ];
  for (const [re, fr] of map) if (re.test(t)) return fr;
  const held = [];
  let fr = t.replace(/(_TZ[A-Z0-9_]+|TS\d+[A-Z0-9]*|_TZE[A-Z0-9_]+|ZG-301Z|CK-[A-Z0-9()-]+)/g, (m) => {
    held.push(m);
    return `__H${held.length - 1}__`;
  });
  fr = fr
    .replace(/(^|[. ])Fixed:\s*/g, '$1Corrige : ')
    .replace(/^New:\s*/i, 'Nouveau : ')
    .replace(/^Added:\s*/i, 'Ajoute : ')
    .replace(/(^|[. ])Changed:\s*/g, '$1Modifie : ')
    .replace(/\bFaster:\s*/gi, 'Plus rapide : ')
    .replace(/^Reliability:\s*/i, 'Fiabilite : ')
    .replace(/^Diagnostic draft only:\s*/i, 'Brouillon de diagnostic uniquement : ')
    .replace(/Plus (\d+) other changes? in the app core\./i, 'Et $1 autres changements dans le coeur de l\'app.')
    .replace(/Behind the scenes: tests and publishing checks\./ig, 'En coulisses : tests et controles de publication.')
    .replace(/\bsmall fixes\b/gi, 'petites corrections')
    .replace(/\bsmall fix\b/gi, 'petite correction')
    .replace(/\bFlow cards\b/g, 'cartes Flow')
    .replace(/\blights and dimmers\b/gi, 'eclairages et variateurs')
    .replace(/\bbattery reporting\b/gi, 'niveau de batterie')
    .replace(/\bpairing and device recognition\b/gi, 'appairage et reconnaissance des appareils')
    .replace(/\benergy meters\b/gi, 'compteurs d\'energie')
    .replace(/\bclimate sensors\b/gi, 'capteurs climatiques')
    .replace(/\bsafety sensors\b/gi, 'capteurs de securite')
    .replace(/\bdevice settings\b/gi, 'reglages des appareils')
    .replace(/\bbuttons and remotes\b/gi, 'boutons et telecommandes')
    .replace(/\bmemory and timers\b/gi, 'memoire et minuteries')
    .replace(/\bgeneral reliability\b/gi, 'fiabilite generale')
    .replace(/\bwall switches\b/gi, 'interrupteurs muraux')
    .replace(/\bRe-pair if\b/gi, 'Reappariez si')
    .replace(/\bUpdate then remove\+re-pair\b/gi, 'Mettez a jour puis retirez et reappariez')
    .replace(/\bUpdate Test \+ re-pair\b/gi, 'Mettez a jour Test puis reappariez')
    .replace(/\bREMOVE and re-add\b/gi, 'retirez puis rajoutez')
    .replace(/\bremove and re-add\b/gi, 'retirez puis rajoutez')
    .replace(/\bgeneric Zigbee device\b/gi, 'appareil Zigbee generique')
    .replace(/\bdevice UI\b/gi, 'fiche appareil')
    .replace(/\bhybrid RX\b/gi, 'reception hybride')
    .replace(/\bscene remotes\b/gi, 'telecommandes de scene')
    .replace(/\bcurtain motors\b/gi, 'moteurs de rideau')
    .replace(/\bthe Test channel is not changed by this run\./gi, 'Le canal Test n\'est pas modifie par cet envoi.')
    .replace(/\bthe upload includes the real source drivers that ordinary publishes still hold back, so the payload stays above (\d+) drivers\./gi, 'l\'envoi inclut les vrais pilotes source que les publications ordinaires retiennent encore, pour rester au-dessus de $1 appareils.')
    .replace(/\bkeep the contract - a changed DP value still logs once more before the per-DP log throt\./gi, 'le contrat est conserve : une valeur DP changee est encore journalisee une fois avant le plafonnement par DP.')
    .replace(/\brename energy_source off the reserved energy_ prefix\./gi, 'energy_source est renomme pour quitter le prefixe reserve energy_.')
    .replace(/\bhomeyignore CI screenshots so the gate stops blocking the version write-back; cap a publish chain at (\d+) uploads\./gi, 'les captures CI sont ignorees pour que le controle ne bloque plus l\'enregistrement de version ; une chaine de publication est plafonnee a $1 envois.')
    .replace(/\blossless upload-archive trim and a ratchet on archive size and file count; count the publish retry chain per error class\./gi, 'reduction sans perte de l\'archive d\'envoi et un garde-fou sur sa taille et son nombre de fichiers ; les nouvelles tentatives de publication sont comptees par type d\'erreur.')
    .replace(/\bscale bidirectional clamp reports on the 3-phase profile; stderr breadcrumbs for large JSON parses and capped device notes; keep the precise publish call the suite locks;/gi, 'les rapports bidirectionnels du profil triphase sont bornes ; des traces d\'erreur pour les gros JSON et les notes d\'appareil trop longues ; l\'appel de publication que la suite verrouille reste inchange ;')
    .replace(/\bstable bump refuses a stock filler note\./gi, 'La montee de version stable refuse une note de remplissage generique.')
    .replace(/\bImproved publish reliability and CI integrity checks\./gi, 'Fiabilite de publication et controles d\'integrite CI ameliores.')
    .replace(/\bImproved radiator valve and mmWave radar pairing for recent forum devices\./gi, 'Appairage ameliore des vannes de radiateur et des radars mmWave pour les appareils recents du forum.')
    .replace(/\bImproved scene remote press latency and radiator valve pairing\./gi, 'Latence des appuis de telecommande de scene et appairage des vannes de radiateur ameliores.')
    .replace(/\bDevice compatibility and reliability improvements\./gi, 'Ameliorations de compatibilite et de fiabilite des appareils.')
    .replace(/\bFixed app settings blank infinite loader \(Homey\.ready before mesh\/WiFi scan\)\./gi, 'Corrige : le chargeur infini vide des reglages de l\'app (Homey.ready avant le scan mesh/WiFi).')
    .replace(/\bImproved local LAN reliability \(stale-data watchdog, fire-and-forget\)\./gi, 'Fiabilite LAN locale amelioree (surveillance des donnees perimees, envoi sans attente).')
    .replace(/\bImproved local LAN reliability; fixed WiFi driver manifests for publish validation\./gi, 'Fiabilite LAN locale amelioree ; manifestes des pilotes WiFi corriges pour la validation de publication.')
    .replace(/\bImproved ceiling radar lux\/distance response and wireless button pairing\./gi, 'Reponse lux/distance du radar de plafond et appairage des boutons sans fil ameliores.')
    .replace(/\bImproved wireless remote reliability \(skip IAS enroll storm on scene buttons\)\./gi, 'Fiabilite des telecommandes sans fil amelioree (pas de tempete d\'enrolement IAS sur les boutons de scene).')
    .replace(/\bImproved fingerprint matching for wireless buttons and radiator valves\./gi, 'Correspondance des empreintes amelioree pour les boutons sans fil et les vannes de radiateur.')
    .replace(/\bImproved Tuya datapoint TX framing and Wireless Button 3 pairing instructions \(fleet treat\)\./gi, 'Trame TX des datapoints Tuya et consignes d\'appairage du bouton sans fil 3 ameliorees (parc).')
    .replace(/\bImproved TS0043\/TS0044 scene remote press detection with complementary fallback paths\./gi, 'Detection des appuis des telecommandes de scene TS0043/TS0044 amelioree, avec chemins de repli complementaires.')
    .replace(/\bFixed Moes\/Tuya wired 2-gang pairing: maps to wall switch with onoff\/onoff\.gang2 only - no button clutter\./gi, 'Corrige : l\'appairage filaire Moes/Tuya 2 voies pointe vers l\'interrupteur mural avec onoff/onoff.gang2 seulement, sans boutons superflus.')
    .replace(/\bRemove empty zigbee blocks from WiFi drivers \(Homey validator\)\./gi, 'Suppression des blocs zigbee vides des pilotes WiFi (validateur Homey).')
    .replace(/\bStrip empty zigbee from WiFi compose \(validator\) \+ LAN reliability\./gi, 'Retrait des blocs zigbee vides du compose WiFi (validateur) et fiabilite LAN.')
    .replace(/\bWiFi LAN reliability: offline grace \+ command gap \+ protocol auto-order \(backport\)\./gi, 'Fiabilite LAN WiFi : grace hors ligne, intervalle de commande et ordre auto du protocole (backport).')
    .replace(/\bAthom republish after processing_failed; same reliability couple prune as ([0-9.]+)\./gi, 'Republication Athom apres processing_failed ; meme elagage de couples que $1.')
    .replace(/\bRestore water_leak OTA firmware asset for Homey validate\./gi, 'Restauration de l\'actif firmware OTA water_leak pour la validation Homey.')
    .replace(/\bTRV me167 DP4 no longer steals battery; settings spinner dual fallback\./gi, 'Le TRV me167 DP4 ne vole plus la batterie ; repli double du spinner de reglages.')
    .replace(/\bBattery listen-only for coin cells; Johan couple collision locks/gi, 'Ecoute seule de la batterie pour les piles bouton ; verrous de collision de couples Johan')
    .replace(/\bre-pair if tiles were only under Maintenance\./gi, 'reappariez si les tuiles n\'etaient que sous Maintenance.')
    .replace(/\bUpdate then remove\+re-pair the remotes?\./gi, 'Mettez a jour puis retirez et reappariez la telecommande.')
    .replace(/\bUpdate Homey Test\./g, 'Mettez a jour Homey Test.')
    .replace(/\bUpdate Stable Test\./g, 'Mettez a jour Stable Test.')
    .replace(/\bUpdate Bastien Test\./g, 'Mettez a jour Bastien Test.')
    .replace(/\bUpdate Test \+ re-pair if needed\./gi, 'Mettez a jour Test puis reappariez si besoin.')
    .replace(/\bUpdate Test\./g, 'Mettez a jour Test.')
    .replace(/\bRepair remotes if presses miss\./gi, 'Reparez les telecommandes si les appuis manquent.')
    .replace(/\bUpdate Test \+ Repair radar\./gi, 'Mettez a jour Test puis reparez le radar.')
    .replace(/^Improved\s+/i, 'Ameliore : ')
    .replace(/^Fixed\s+/i, 'Corrige : ')
    .replace(/\bradiator valves\b/gi, 'vannes de radiateur')
    .replace(/\bradiator valve\b/gi, 'vanne de radiateur')
    .replace(/\bwireless buttons\b/gi, 'boutons sans fil')
    .replace(/\bwireless button\b/gi, 'bouton sans fil')
    .replace(/\bwireless remotes\b/gi, 'telecommandes sans fil')
    .replace(/\bwireless remote\b/gi, 'telecommande sans fil')
    .replace(/\bwall switches\b/gi, 'interrupteurs muraux')
    .replace(/\bwall switch\b/gi, 'interrupteur mural')
    .replace(/\bpublish reliability\b/gi, 'fiabilite de publication')
    .replace(/\bpairing instructions\b/gi, 'consignes d\'appairage')
    .replace(/\bre-pair if needed\./gi, 'reappariez si besoin.')
    .replace(/\bpress detection\b/gi, 'detection des appuis')
    .replace(/\bdevice view\b/gi, 'fiche appareil')
    .replace(/\bhybrid RX\b/gi, 'reception hybride')
    .replace(/\bUpdate to ([0-9.]+) then\b/gi, 'Passez a $1 puis')
    .replace(/\bdo not reuse a red run after a manifest change; note that the keyfob endpoint lists IAS ACE; declare the keyfob IAS ACE cluster and hold the failed AOYAN probe; satisfy the lint ratchet for the budget line\./gi, 'ne pas reutiliser une execution rouge apres un changement de manifeste ; noter que le point de terminaison du porte-cles declare IAS ACE ; declarer le cluster IAS ACE du porte-cles et conserver la sonde AOYAN en echec ; respecter le cliquet de lint pour la ligne de budget.')
    .replace(/\bkeep the composed build when staging the payload; stage the prepared directory and leave compose out of it; give the warned cards a titleFormatted and refuse a compose publish dir\./gi, 'conserver le build compose lors de la preparation de l\'envoi ; deposer le repertoire prepare et laisser compose de cote ; donner un titleFormatted aux cartes signalees et refuser un repertoire de publication compose.')
    .replace(/\bDimmers \(2-gang dimmer module, dimmer wall switch, wall dimmer 1-gang\) now use the Light device type, so the light ring and voice assistants treat them as lights\. Paired devices switch once automatically; the device icon may change\. Capabilities, IDs and flows are unchanged\./gi, 'Les variateurs (module variateur 2 voies, interrupteur variateur mural, variateur mural 1 voie) utilisent desormais le type Lumiere, pour que l\'anneau lumineux et les assistants vocaux les voient comme des lumieres. Les appareils deja appaires basculent une fois automatiquement ; l\'icone peut changer. Capacites, identifiants et flux restent inchanges.')
    .replace(/\bBastien house: fixed fingerprint sync \+ button flow cards \(1-btn numbered, 3-btn, climate\)\. Update to 1\.0\.14 then REMOVE and re-add the 1-button, 3-button remotes and eWeLink climate sensor\. Recreate flows on the new devices\./gi, 'Maison Bastien : synchronisation des empreintes et cartes Flow des boutons corrigee (1 bouton numerote, 3 boutons, climat). Passez a 1.0.14 puis retirez et rajoutez les telecommandes 1 bouton et 3 boutons et le capteur climatique eWeLink. Recreez les flux sur les nouveaux appareils.')
    .replace(/\bwrite-back\b/gi, 'enregistrement de version')
    .replace(/\bpublish chain\b/gi, 'chaine de publication')
    .replace(/\blossless\b/gi, 'sans perte')
    .replace(/\bupload-archive\b/gi, 'archive d\'envoi')
    .replace(/\band\b/g, ' et ')
    .replace(/\bwith\b/g, ' avec ')
    .replace(/\bfrom\b/g, ' de ')
    .replace(/\bthen\b/g, ' puis ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .trim();
  fr = fr.replace(/__H(\d+)__/g, (_, i) => held[Number(i)]);
  return fr;
}

function ensureFr(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const out = { ...entry };
  if (out.en && (!out.fr || frLooksEnglish(out.fr))) out.fr = frFromEn(out.en);
  return out;
}


/** Accent pass for FR notes already in Latin-1 (safe known list only). */
function accentFr(text) {
  const pairs = [
    [/\bprivee\b/g, 'privee'.replace('privee', 'priv\u00E9e')],
    [/\bprive\b/g, 'priv\u00E9'],
    [/\bfiabilite\b/g, 'fiabilit\u00E9'],
    [/\bmemes\b/g, 'm\u00EAmes'],
    [/\bmeme\b/g, 'm\u00EAme'],
    [/\bprecedente\b/g, 'pr\u00E9c\u00E9dente'],
    [/\bCorrige\b/g, 'Corrig\u00E9'],
    [/\bModifie\b/g, 'Modifi\u00E9'],
    [/\bFiabilite\b/g, 'Fiabilit\u00E9'],
    [/\beclairages\b/g, '\u00E9clairages'],
    [/\bcoeur\b/g, 'c\u0153ur'.replace('\u0153', 'oe')],
    [/\btelecommandes\b/g, 't\u00E9l\u00E9commandes'],
    [/\bmemoire\b/g, 'm\u00E9moire'],
    [/\bminuteries\b/g, 'minuteries'],
    [/\breglages\b/g, 'r\u00E9glages'],
    [/\bsecurite\b/g, 's\u00E9curit\u00E9'],
    [/\benergie\b/g, '\u00E9nergie'],
    [/\bcontroles\b/g, 'contr\u00F4les'],
  ];
  // The 'privee' replacement above is messy because this file must stay <= U+00FF.
  // Re-do with explicit Latin-1 escapes only.
  void pairs;
  let t = String(text || '');
  t = t.replace(/\bprivee\b/g, 'priv\u00E9e');
  t = t.replace(/\bprive\b/g, 'priv\u00E9');
  t = t.replace(/\bfiabilite\b/g, 'fiabilit\u00E9');
  t = t.replace(/\bmemes\b/g, 'm\u00EAmes');
  t = t.replace(/\bmeme\b/g, 'm\u00EAme');
  t = t.replace(/\bprecedente\b/g, 'pr\u00E9c\u00E9dente');
  t = t.replace(/\bCorrige\b/g, 'Corrig\u00E9');
  t = t.replace(/\bModifie\b/g, 'Modifi\u00E9');
  t = t.replace(/\bFiabilite\b/g, 'Fiabilit\u00E9');
  t = t.replace(/\beclairages\b/g, '\u00E9clairages');
  t = t.replace(/\bcoeur\b/g, 'coeur');
  t = t.replace(/\btelecommandes\b/g, 't\u00E9l\u00E9commandes');
  t = t.replace(/\bmemoire\b/g, 'm\u00E9moire');
  t = t.replace(/\breglages\b/g, 'r\u00E9glages');
  t = t.replace(/\bsecurite\b/g, 's\u00E9curit\u00E9');
  t = t.replace(/\benergie\b/g, '\u00E9nergie');
  t = t.replace(/\bd'energie\b/g, 'd\'\u00E9nergie');
  t = t.replace(/\bcontroles\b/g, 'contr\u00F4les');
  t = t.replace(/\bcontrole\b/g, 'contr\u00F4le');
  t = t.replace(/\bqualite\b/g, 'qualit\u00E9');
  t = t.replace(/\bdedupliquees\b/g, 'd\u00E9dupliqu\u00E9es');
  t = t.replace(/\bdedupliquee\b/g, 'd\u00E9dupliqu\u00E9e');
  t = t.replace(/\bont ete\b/g, 'ont \u00E9t\u00E9');
  t = t.replace(/\bAjoute\b/g, 'Ajout\u00E9');
  t = t.replace(/\bchaine\b/g, 'cha\u00EEne');
  t = t.replace(/\bplafonnee\b/g, 'plafonn\u00E9e');
  t = t.replace(/\breutiliser\b/g, 'r\u00E9utiliser');
  t = t.replace(/\bexecution\b/g, 'ex\u00E9cution');
  t = t.replace(/\bapres\b/g, 'apr\u00E8s');
  t = t.replace(/\bporte-cles\b/g, 'porte-cl\u00E9s');
  t = t.replace(/\bechec\b/g, '\u00E9chec');
  t = t.replace(/\brepertoire\b/g, 'r\u00E9pertoire');
  t = t.replace(/\bprepare\b/g, 'pr\u00E9par\u00E9');
  t = t.replace(/\bsignalees\b/g, 'signal\u00E9es');
  t = t.replace(/\bdesormais\b/g, 'd\u00E9sormais');
  t = t.replace(/\bLumiere\b/g, 'Lumi\u00E8re');
  t = t.replace(/\blumieres\b/g, 'lumi\u00E8res');
  t = t.replace(/\banneau\b/g, 'anneau');
  t = t.replace(/\bappaires\b/g, 'appari\u00E9s');
  t = t.replace(/\bicone\b/g, 'ic\u00F4ne');
  t = t.replace(/\bCapacites\b/g, 'Capacit\u00E9s');  t = t.replace(/\binchanges\b/g, 'inchang\u00E9s');
  t = t.replace(/\bcorrigee\b/g, 'corrig\u00E9e');
  t = t.replace(/\bnumerote\b/g, 'num\u00E9rot\u00E9');
  t = t.replace(/\bRecreez\b/g, 'R\u00E9cr\u00E9ez');
  t = t.replace(/\bdeclare\b/g, 'd\u00E9clare');
  t = t.replace(/\bdeclarer\b/g, 'd\u00E9clarer');
  t = t.replace(/\bpreparation\b/g, 'pr\u00E9paration');
  t = t.replace(/\bdeposer\b/g, 'd\u00E9poser');
  t = t.replace(/\bcote\b/g, 'c\u00F4t\u00E9');
  t = t.replace(/\bdeja\b/g, 'd\u00E9j\u00E0');
  t = t.replace(/Passez a /g, 'Passez \u00E0 ');
  t = t.replace(/\breduction\b/g, 'r\u00E9duction');
  t = t.replace(/\btriphase\b/g, 'triphas\u00E9');
  t = t.replace(/\bbornes\b/g, 'born\u00E9s');
  t = t.replace(/\bignorees\b/g, 'ignor\u00E9es');
  t = t.replace(/\bgenerale\b/g, 'g\u00E9n\u00E9rale');
  t = t.replace(/\bgenerique\b/g, 'g\u00E9n\u00E9rique');
  t = t.replace(/\breception\b/g, 'r\u00E9ception');
  t = t.replace(/\bscene\b/g, 'sc\u00E8ne');
  t = t.replace(/\bReappariez\b/g, 'R\u00E9appariez');
  t = t.replace(/\breappariez\b/g, 'r\u00E9appariez');
  t = t.replace(/\ba jour\b/g, '\u00E0 jour');
  t = t.replace(/\bmodifie par\b/g, 'modifi\u00E9 par');
  t = t.replace(/\binchange\b/g, 'inchang\u00E9');
  t = t.replace(/\bjournalisee\b/g, 'journalis\u00E9e');
  t = t.replace(/\brenomme\b/g, 'renomm\u00E9');
  t = t.replace(/\bprefixe reserve\b/g, 'pr\u00E9fixe r\u00E9serv\u00E9');
  t = t.replace(/\btrop longues\b/g, 'trop longues');
  t = t.replace(/\bAmeliore\b/g, 'Am\u00E9lior\u00E9');
  t = t.replace(/\bameliore\b/g, 'am\u00E9lior\u00E9');
  t = t.replace(/\brecents\b/g, 'r\u00E9cents');
  t = t.replace(/\brecente\b/g, 'r\u00E9cente');
  t = t.replace(/\bgeneriques\b/g, 'g\u00E9n\u00E9riques');
  t = t.replace(/\binchange\b/g, 'inchang\u00E9');
  t = t.replace(/\btriphase\b/g, 'triphas\u00E9');
  t = t.replace(/\bbornes\b/g, 'born\u00E9s');
  t = t.replace(/\bameliores\b/g, 'am\u00E9lior\u00E9s');
  t = t.replace(/\bamelioree\b/g, 'am\u00E9lior\u00E9e');
  t = t.replace(/\bameliorees\b/g, 'am\u00E9lior\u00E9es');
  t = t.replace(/\bAmeliorations\b/g, 'Am\u00E9liorations');
  t = t.replace(/\bcompatibilite\b/g, 'compatibilit\u00E9');
  t = t.replace(/\bintegrite\b/g, 'int\u00E9grit\u00E9');
  t = t.replace(/\bDetection\b/g, 'D\u00E9tection');
  t = t.replace(/\bdetection\b/g, 'd\u00E9tection');
  t = t.replace(/\brepli\b/g, 'repli');
  t = t.replace(/\bcomplementaires\b/g, 'compl\u00E9mentaires');
  t = t.replace(/\bgenerique\b/g, 'g\u00E9n\u00E9rique');
  t = t.replace(/\bmontee\b/g, 'mont\u00E9e');
  t = t.replace(/\bperimees\b/g, 'p\u00E9rim\u00E9es');
  t = t.replace(/\btempete\b/g, 'temp\u00EAte');
  t = t.replace(/\benrolement\b/g, 'enr\u00F4lement');
  t = t.replace(/\bReponse\b/g, 'R\u00E9ponse');
  t = t.replace(/\bCorrespondance\b/g, 'Correspondance');
  t = t.replace(/\bLatence\b/g, 'Latence');
  t = t.replace(/\bAppairage\b/g, 'Appairage');
  t = t.replace(/\bRepublication\b/g, 'Republication');
  t = t.replace(/\belagage\b/g, '\u00E9lagage');
  t = t.replace(/\bRestauration\b/g, 'Restauration');
  t = t.replace(/\bEcoute\b/g, '\u00C9coute');
  t = t.replace(/\betaient\b/g, '\u00E9taient');
  t = t.replace(/\bcomptees\b/g, 'compt\u00E9es');
  t = t.replace(/plafonn\u00E9e a /g, 'plafonn\u00E9e \u00E0 ');
  t = t.replace(/plafonnee a /g, 'plafonn\u00E9e \u00E0 ');
  t = t.replace(/\bReparez\b/g, 'R\u00E9parez');
  t = t.replace(/\breparez\b/g, 'r\u00E9parez');

  return t;
}

function publishedRows(root) {
  const rows = [];
  const cands = [
    path.join(root, 'docs/knowledge/athom-publish-outcomes.jsonl'),
    path.join(root, 'docs/status/athom-publish-outcomes.jsonl'),
  ];
  const id = appIdOf(root);
  for (const file of cands) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\n/)) {
      if (!line.trim()) continue;
      let o; try { o = JSON.parse(line); } catch (_e) { continue; }
      const app = o.app_id || o.appId || o.app || '';
      const ver = o.version;
      const state = String(o.state || o.channel || '').toLowerCase();
      const kind = String(o.kind || o.status || '').toLowerCase();
      const ok = (state === 'test' || state === 'live' || state === 'draft') && kind !== 'aggregateerror' && !/fail/.test(kind);
      if (!ver || !VER_RE.test(ver)) continue;
      if (app && app !== id && app !== 'master' && app !== 'stable' && app !== 'bastien') {
        // keep rows with no app id (legacy) if the version matches this series
        if (!ownKey(ver, seriesOf(root))) continue;
      } else if (app === 'master' && !id.endsWith('zigbee')) continue;
      else if (app === 'stable' && !id.endsWith('.stable')) continue;
      else if (app === 'bastien' && !id.endsWith('.bastien')) continue;
      else if (app && app !== id && !['master', 'stable', 'bastien'].includes(app)) continue;
      if (!ownKey(ver, seriesOf(root))) continue;
      if (!ok && state && !['test', 'live', 'draft', 'published'].includes(state)) continue;
      rows.push({ version: ver, sha: o.source_sha || o.sha || '', state, kind, at: o.at || '' });
    }
  }
  return rows;
}

function bumpSha(root, version) {
  const patterns = [
    `chore(stable): v${version}`,
    `chore(version): v${version}`,
    `v${version}:`,
    `chore(bastien): v${version}`,
    `v${version} `,
  ];
  for (const p of patterns) {
    try {
      const out = execFileSync('git', ['log', '--format=%H', '--grep', p, '-n', '5'], {
        cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (out) return out.split('\n')[0];
    } catch (_e) { /* no git */ }
  }
  return '';
}

function subjectsBetween(root, fromRef, toRef) {
  if (!toRef) return [];
  const range = fromRef ? `${fromRef}..${toRef}` : toRef;
  try {
    const log = execFileSync('git', ['log', '--no-merges', '--format=%s', range, '-n', '400'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    return log.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch (_e) { return []; }
}

function usableSubjects(subjects) {
  return (subjects || []).filter((s) => {
    if (AUTO_RE.test(s) || CE.BUMP_SUBJECT.test(s) || /^v\d+\.\d+\.\d+:/.test(s)) return false;
    if (LINT_ONLY_RE.test(s)) return false;
    return true;
  });
}

function isStockMaintenance(text) {
  return /maintenance (build|release)/i.test(String(text || ''))
    && /same devices|tooling only|devices behave as before/i.test(String(text || ''));
}

function audit(root) {
  const file = path.join(root, '.homeychangelog.json');
  const pkg = readJson(path.join(root, 'package.json'));
  const series = seriesOf(root);
  const findings = [];
  if (!fs.existsSync(file)) {
    return { findings: [{ code: 'missing-file', msg: '.homeychangelog.json is missing' }], series, version: pkg.version };
  }
  const obj = readJson(file);
  const keys = versionKeys(obj);
  const foreign = keys.filter((k) => !ownKey(k, series));
  if (foreign.length) {
    findings.push({
      code: 'foreign-versions',
      msg: `${foreign.length} changelog version(s) belong to another app`,
      samples: foreign.slice(0, 8),
      count: foreign.length,
    });
  }
  if (pkg.version && !obj[pkg.version]) {
    findings.push({ code: 'version-mismatch', msg: `package.json ${pkg.version} has no changelog entry` });
  }
  const own = keys.filter((k) => ownKey(k, series)).sort(CE.cmpVer);
  const ordered = versionKeys(obj);
  const expected = [...ordered.filter((k) => !ownKey(k, series)), ...[...ordered.filter((k) => ownKey(k, series))].sort((a, b) => CE.cmpVer(b, a))];
  // After a fix we drop foreign keys, so only check own-key order here when no foreign keys remain.
  if (!foreign.length) {
    const got = keys.slice();
    const want = [...own].sort((a, b) => CE.cmpVer(b, a));
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      findings.push({ code: 'order', msg: 'own version keys are not newest-first' });
    }
  }
  let noFr = 0; let stockWrong = 0; let pii = 0;
  for (const v of own) {
    const e = obj[v];
    const en = e && typeof e === 'object' ? e.en : String(e || '');
    const fr = e && typeof e === 'object' ? e.fr : '';
    if (!fr) noFr++;
    if (PII_RE.test(en) || PII_RE.test(fr) || INTERNAL_ID_RE.test(en) || INTERNAL_ID_RE.test(fr)) pii++;
    void en; // reset lastIndex by creating new test below
  }
  // reset regex state
  PII_RE.lastIndex = 0; INTERNAL_ID_RE.lastIndex = 0;
  pii = 0; noFr = 0;
  for (const v of own) {
    const e = obj[v];
    const en = e && typeof e === 'object' ? (e.en || '') : String(e || '');
    const fr = e && typeof e === 'object' ? (e.fr || '') : '';
    if (!fr) noFr++;
    if (PII_RE.test(en) || PII_RE.test(fr)) pii++;
    PII_RE.lastIndex = 0;
    if (INTERNAL_ID_RE.test(en) || INTERNAL_ID_RE.test(fr)) pii++;
    INTERNAL_ID_RE.lastIndex = 0;
  }
  if (noFr) findings.push({ code: 'missing-fr', msg: `${noFr} own entr(ies) have no French text`, count: noFr });
  if (pii) findings.push({ code: 'pii-or-internal-id', msg: `${pii} own entr(ies) leak a name or internal id`, count: pii });
  return {
    findings, series, version: pkg.version, appId: appIdOf(root),
    ownCount: own.length, foreignCount: foreign.length, noFr, pii,
    currentEntry: obj[pkg.version] || null,
  };
}

function stripForeign(obj, series) {
  const out = {};
  if (Array.isArray(obj.changelog)) {
    out.changelog = obj.changelog.filter((e) => e && ownKey(String(e.version || ''), series));
  } else if (obj.changelog && typeof obj.changelog === 'object' && !Array.isArray(obj.changelog)) {
    const inner = {};
    for (const [k, v] of Object.entries(obj.changelog)) if (ownKey(k, series)) inner[k] = v;
    if (Object.keys(inner).length) out.changelog = inner;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'changelog') continue;
    if (VER_RE.test(k) && !ownKey(k, series)) continue;
    out[k] = v;
  }
  return out;
}

function rewriteOwnEntries(root, obj, series) {
  const changed = [];
  const own = versionKeys(obj).filter((k) => ownKey(k, series)).sort(CE.cmpVer);
  const pub = publishedRows(root);
  const pubByVer = new Map();
  for (const r of pub) if (r.sha && !pubByVer.has(r.version)) pubByVer.set(r.version, r.sha);

  for (let i = 0; i < own.length; i++) {
    const ver = own[i];
    const prev = i > 0 ? own[i - 1] : null;
    const toRef = pubByVer.get(ver) || bumpSha(root, ver);
    const fromRef = prev ? (pubByVer.get(prev) || bumpSha(root, prev)) : '';
    const subjects = usableSubjects(toRef ? subjectsBetween(root, fromRef, toRef) : []);
    let entry = obj[ver] && typeof obj[ver] === 'object' ? { ...obj[ver] } : { en: String(obj[ver] || '') };
    const before = JSON.stringify(entry);
    let generated = subjects.length ? CE.precise(subjects) : null;
    if (!generated || isStockMaintenance(generated.en)) {
      const fb = fallbackNote(subjects);
      if (fb) generated = fb;
    }
    const generatedUseful = generated && generated.en && !isStockMaintenance(generated.en);
    if (generatedUseful && (isStockMaintenance(entry.en) || !entry.en || CE.isPlaceholder(entry.en))) {
      entry = { ...entry, en: generated.en, fr: generated.fr || entry.fr };
      changed.push({ version: ver, why: 'rewrote-stock-or-placeholder', en: entry.en });
    } else if (generatedUseful && /^(Reliability: \d+ small fix)/i.test(entry.en || '')) {
      entry = { ...entry, en: generated.en, fr: generated.fr || entry.fr };
      changed.push({ version: ver, why: 'rewrote-vague-reliability', en: entry.en });
    }
    entry = ensureFr(sanitizeEntry(entry));
    if (entry.fr) entry.fr = accentFr(entry.fr);
    if (entry.en) entry.en = sanitizeUserText(entry.en);
    if (JSON.stringify(entry) !== before && !changed.some((c) => c.version === ver)) {
      changed.push({ version: ver, why: 'locales-or-sanitize', en: entry.en });
    }
    obj[ver] = CE.distinctFromPrevious(obj, ver, entry);
  }
  return { obj: CE.orderChangelog(obj), changed };
}

function apply(root) {
  const file = path.join(root, '.homeychangelog.json');
  const series = seriesOf(root);
  const obj = readJson(file);
  const stripped = stripForeign(obj, series);
  const foreignRemoved = versionKeys(obj).length - versionKeys(stripped).length;
  const r = rewriteOwnEntries(root, stripped, series);
  const json = JSON.stringify(r.obj, null, 2) + '\n';
  return { file, series, foreignRemoved, changed: r.changed, obj: r.obj, json };
}

function check(root) {
  const a = audit(root);
  return { ok: a.findings.filter((f) => f.code === 'foreign-versions' || f.code === 'version-mismatch').length === 0, ...a };
}

module.exports = {
  APP_SERIES, appIdOf, seriesOf, ownKey, sanitizeUserText, sanitizeEntry,
  foldWideChars, frLooksEnglish, frFromEn, accentFr, ensureFr, publishedRows, bumpSha, subjectsBetween,
  usableSubjects, fallbackNote, isStockMaintenance, audit, stripForeign, rewriteOwnEntries, apply, check,
};

if (require.main === module) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
  const root = path.resolve(arg('--root') || process.cwd());
  const report = arg('--report');
  const doFix = process.argv.includes('--fix');
  const result = doFix ? { ...apply(root), auditAfter: null } : { audit: audit(root) };
  if (doFix) {
    fs.writeFileSync(result.file, result.json);
    result.auditAfter = audit(root);
    console.log(`changelog-coherence: removed ${result.foreignRemoved} foreign version(s), rewrote ${result.changed.length} own entr(ies)`);
    for (const c of result.changed.slice(0, 20)) console.log(`  ${c.version} [${c.why}] ${c.en}`.slice(0, 200));
  } else {
    const a = result.audit;
    console.log(`changelog-coherence: ${a.appId} series ${a.series}* own=${a.ownCount} foreign=${a.foreignCount} findings=${a.findings.length}`);
    for (const f of a.findings) console.log(`  [${f.code}] ${f.msg}`);
  }
  if (report) fs.writeFileSync(report, JSON.stringify(doFix ? result : result.audit, null, 2) + '\n');
  const findings = (doFix ? result.auditAfter : result.audit).findings;
  const fatal = findings.filter((f) => f.code === 'foreign-versions' || f.code === 'version-mismatch');
  process.exitCode = doFix ? 0 : (fatal.length ? 1 : 0);
}
