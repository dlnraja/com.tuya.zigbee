/**
 * ManufacturerNameHelper.js — Normalisateur Canonique de Marques (v8.1.0)
 * 
 * Fournit une normalisation centralisée des noms de fabricants Zigbee/Tuya.
 * Résout les variantes de casse, aliases, et fautes de frappe communes.
 * 
 * Utilise CaseInsensitiveMatcher pour toutes les comparaisons.
 * 
 * @version 8.1.0
 * @since 2026-05-24
 * @see lib/CaseInsensitiveMatcher.js
 * @see docs/rules/ZIGBEE_TUYA_RULES.md (Section Fingerprints)
 * @see scripts/PRE_COMMIT_CHECKS.js (Forbidden raw brand checks)
 */

'use strict';

/**
 * @typedef {Object} BrandMapping
 * @property {string} canonical — The canonical normalized form
 * @property {string[]} aliases — Alternative spellings, case variants, common typos
 */

/**
 * Canonical Brand Database
 * 
 * Case-insensitive. Toutes les entrées sont en lowercase.
 * Structure: canonical_form → [alias1, alias2, ...]
 * 
 * ⚠️ Maintenance: When adding a new brand, add ALL case variant aliases
 * plus common typos observed in community reports.
 */
const BRAND_DATABASE = {
	// Smart Home OEMs — Zigbee
	'hobeian':      ['hobéian', 'hobean', 'hobien', 'hobeian', 'HOBEIAN', '_TZE200_hobeian', '_TZE204_hobeian'],
	'sonoff':       ['sonoff', 'SONOFF', 'itead sonoff', 'itead', 'itead.cc'],
	'bseed':        ['bseed', 'BSEED', 'b_Seed', 'b seed'],
	'lumi':         ['lumi', 'LUMI', 'xiaomi lumi', 'lumi united', 'aqara'],
	'ewelink':      ['ewelink', 'EWELINK', 'eWeLink', 'e We Link', 'coolkit'],
	'moes':         ['moes', 'MOES', 'moeshouse', 'moes house'],
	'aqara':        ['aqara', 'AQARA', 'xiaomi aqara', 'lumi aqara'],
	'heiman':       ['heiman', 'HEIMAN', 'heiman technology', 'heiman tech'],
	'ikea':          ['ikea', 'IKEA', 'ikea of sweden', 'tradfri'],
	'philips':       ['philips', 'PHILIPS', 'philips hue', 'signify', 'signify netherlands'],
	'tuya':          ['tuya', 'TUYA', 'tuya inc.', 'tuya global'],
	'zemismart':    ['zemismart', 'ZEMISMART', 'zemi smart'],
	'girier':       ['girier', 'GIRIER', 'girer'],
	'blitzwolf':    ['blitzwolf', 'BLITZWOLF', 'blitz wolf', 'blitzwolf bw'],
	'lerlink':      ['lerlink', 'LERLINK', 'ler link'],
	'neo':          ['neo', 'NEO', 'neo coolcam', 'coolcam'],
	'saswell':      ['saswell', 'SASWELL', 'sas well'],
	'woox':         ['woox', 'WOOX', 'woox home'],
	'lonsonho':     ['lonsonho', 'LONSONHO', 'lonson ho'],
	'zemismart':    ['zemismart', 'ZEMISMART', 'zemi smart'],
	'nous':         ['nous', 'NOUS', 'nous smart'],
	'livolo':       ['livolo', 'LIVOLO'],
	'aurora':       ['aurora', 'AURORA', 'aurora lighting'],
	'eardatek':     ['eardatek', 'EARDATEK', 'ear datek'],
	'konke':        ['konke', 'KONKE'],
	'vimar':        ['vimar', 'VIMAR'],
	'namron':       ['namron', 'NAMRON'],
	'sunricher':    ['sunricher', 'SUNRICHER', 'sun richer'],
	'ysaiot':       ['ysaiot', 'YSAIOT', 'ysa iot'],
	'thirdreality': ['thirdreality', 'THIRDREALITY', 'third reality', '3reality'],
	'schneider':    ['schneider', 'SCHNEIDER', 'schneider electric'],
	'legrand':      ['legrand', 'LEGRAND', 'legrand netatmo'],
	'bosch':        ['bosch', 'BOSCH', 'bosch security'],
	'danalock':     ['danalock', 'DANALOCK', 'dana lock'],
	'frient':       ['frient', 'FRIENT', 'frient a/s', 'develco'],
	'develco':      ['develco', 'DEVELCO', 'develco products'],
	'samotech':     ['samotech', 'SAMOTECH', 'samo tech'],
	'innr':         ['innr', 'INNR'],
	'ledvance':     ['ledvance', 'LEDVANCE', 'osram ledvance'],
	'osram':        ['osram', 'OSRAM'],
	'sylvania':     ['sylvania', 'SYLVANIA'],
	'sengled':      ['sengled', 'SENGLED'],
	'paulmann':     ['paulmann', 'PAULMANN'],
	'muller licht': ['muller licht', 'MULLER LICHT', 'müller licht'],
	'eglo':         ['eglo', 'EGLO'],
	'calex':        ['calex', 'CALEX'],
	'hama':         ['hama', 'HAMA'],
	'silvercrest':  ['silvercrest', 'SILVERCREST', 'lidl silvercrest'],
	'lidl':         ['lidl', 'LIDL', 'lidl home', 'silvercrest lidl'],
	'salus':        ['salus', 'SALUS', 'salus controls'],
	'heatit':       ['heatit', 'HEATIT', 'heat it'],
	'ubisys':       ['ubisys', 'UBISYS'],
	'enbrighten':   ['enbrighten', 'ENBRIGHTEN', 'en brighten'],
	'ge':           ['ge', 'GE', 'general electric', 'jasco ge'],
	'jasco':        ['jasco', 'JASCO', 'jasco products'],
	'honeywell':    ['honeywell', 'HONEYWELL'],
	'centralite':   ['centralite', 'CENTRALITE', 'centra lite'],
	'iris':         ['iris', 'IRIS', 'iris by lowes'],
	'peq':          ['peq', 'PEQ'],
	'nyce':         ['nyce', 'NYCE', 'nyce sensors'],
	'kaipule':      ['kaipule', 'KAIPULE'],
	'visonic':      ['visonic', 'VISONIC'],
	'dresden':      ['dresden', 'DRESDEN', 'dresden elektronik'],
	'bitron':       ['bitron', 'BITRON', 'bitron video'],
	'elko':         ['elko', 'ELKO', 'elko ep'],
	'niko':         ['niko', 'NIKO'],
	'robb':         ['robb', 'ROBB', 'robb smarrt'],
	'wise':         ['wise', 'WISE'],
	'immax':        ['immax', 'IMMAX'],
	'eurotronic':   ['eurotronic', 'EUROTRONIC', 'euro tronic'],
	'popp':         ['popp', 'POPP'],
	'danfoss':      ['danfoss', 'DANFOSS'],
	'starkvind':    ['starkvind', 'STARKVIND'],
	'fyrtur':       ['fyrtur', 'FYRTUR'],
	'kadrilj':      ['kadrilj', 'KADRILJ'],
	'praktlysing':  ['praktlysing', 'PRAKTLYSING'],
	'tredansen':    ['tredansen', 'TREDANSEN'],
	'vallhorn':     ['vallhorn', 'VALLHORN'],
	'badring':      ['badring', 'BADRING'],
	'parasoll':     ['parasoll', 'PARASOLL'],
	'rodret':       ['rodret', 'RODRET'],
	'somrig':       ['somrig', 'SOMRIG'],
	'ormanas':      ['ormanas', 'ORMANAS'],

	// Tuya-specific prefixes (not brands but meta-categories)
	'_TZ3000':      ['_tz3000', '_TZ3000'],
	'_TZE200':      ['_tze200', '_TZE200'],
	'_TZE204':      ['_tze204', '_TZE204'],
	'_TZE284':      ['_tze284', '_TZE284'],
	'_TYZB01':      ['_tyzb01', '_TYZB01'],
	'_TYZB02':      ['_tyzb02', '_TYZB02'],
	'_TYZB04':      ['_tyzb04', '_TYZB04'],
	'_TYZB05':      ['_tyzb05', '_TYZB05'],
};

/**
 * Cache for resolved canonical names.
 * Key: lowercase input → Value: canonical name
 * @type {Map<string, string>}
 */
const resolutionCache = new Map();

/**
 * Résout le nom canonique d'un fabricant à partir de n'importe quelle variante.
 * 
 * @param {string} rawName — Nom brut (peut être en majuscule, minuscule, alias, ou avec typos)
 * @returns {string} Nom canonique (en lowercase) ou le rawName nettoyé si non trouvé
 * 
 * @example
 * resolveCanonical('HOBEIAN')        → 'hobeian'
 * resolveCanonical('hobéian')        → 'hobeian'
 * resolveCanonical('ITEAD Sonoff')   → 'sonoff'
 * resolveCanonical('Xiaomi Aqara')   → 'aqara'
 * resolveCanonical('UnknownBrand123') → 'unknownbrand123'
 */
function resolveCanonical(rawName) {
	if (!rawName || typeof rawName !== 'string') {
		return '';
	}

	const normalized = rawName.trim().toLowerCase();

	// Cache hit
	if (resolutionCache.has(normalized)) {
		return resolutionCache.get(normalized);
	}

	// 1. Check if exact canonical already
	if (BRAND_DATABASE[normalized]) {
		resolutionCache.set(normalized, normalized);
		return normalized;
	}

	// 2. Check aliases
	for (const [canonical, aliases] of Object.entries(BRAND_DATABASE)) {
		if (aliases.includes(normalized)) {
			resolutionCache.set(normalized, canonical);
			return canonical;
		}
	}

	// 3. Partial/substring match (e.g. "heiman technology co ltd" → "heiman")
	for (const [canonical, aliases] of Object.entries(BRAND_DATABASE)) {
		// Try exact match against canonical
		if (normalized.includes(canonical)) {
			resolutionCache.set(normalized, canonical);
			return canonical;
		}
		// Try match against any alias
		for (const alias of aliases) {
			if (normalized.includes(alias)) {
				resolutionCache.set(normalized, canonical);
				return canonical;
			}
		}
	}

	// 4. No match — return cleaned normalized input
	// Remove common suffixes to clean up
	const cleaned = normalized
		.replace(/\b(co\.?|ltd\.?|limited|inc\.?|incorporated|corp\.?|corporation|technology|tech|group|global)\b/gi, '')
		.replace(/\s+/g, ' ')
		.trim();

	resolutionCache.set(normalized, cleaned);
	return cleaned;
}

/**
 * Vérifie si deux noms de fabricant correspondent (comparaison insensible à la casse).
 * Utilise CaseInsensitiveMatcher en interne.
 * 
 * @param {string} name1 — Premier nom
 * @param {string} name2 — Deuxième nom
 * @returns {boolean} true si les noms correspondent
 * 
 * @example
 * matches('HOBEIAN', 'hobeian') → true
 * matches('Sonoff', 'ITEAD Sonoff') → true
 * matches('Aqara', 'Lumi Aqara') → true
 */
function matches(name1, name2) {
	const canonical1 = resolveCanonical(name1);
	const canonical2 = resolveCanonical(name2);
	return canonical1 === canonical2;
}

/**
 * Vérifie si un nom de fabricant appartient à une marque canonique donnée.
 * 
 * @param {string} rawName — Nom à vérifier
 * @param {string} canonicalBrand — Marque canonique cible
 * @returns {boolean}
 * 
 * @example
 * isBrand('HOBEIAN Tech Ltd', 'hobeian') → true
 * isBrand('ITEAD Sonoff Co.', 'sonoff') → true
 * isBrand('Unknown XYZ', 'sonoff') → false
 */
function isBrand(rawName, canonicalBrand) {
	const resolved = resolveCanonical(rawName);
	return resolved === canonicalBrand.toLowerCase();
}

/**
 * Récupère toutes les marques canoniques connues.
 * 
 * @returns {string[]} Liste triée des marques canoniques
 */
function getAllCanonicalBrands() {
	return Object.keys(BRAND_DATABASE)
		.filter(key => !key.startsWith('_TZ') && !key.startsWith('_TYZB'))
		.sort();
}

/**
 * Récupère tous les alias pour une marque canonique.
 * 
 * @param {string} canonicalBrand — Marque canonique
 * @returns {string[]} Liste des alias (ou tableau vide si marque inconnue)
 */
function getAliases(canonicalBrand) {
	const key = canonicalBrand.toLowerCase();
	return BRAND_DATABASE[key] ? [...BRAND_DATABASE[key]] : [];
}

/**
 * Ajoute dynamiquement une marque ou un alias.
 * Utile pour les scripts de maintenance et l'enrichissement automatique.
 * 
 * @param {string} canonical — Nom canonique (lowercase)
 * @param {string} alias — Nouvel alias à ajouter
 */
function addAlias(canonical, alias) {
	const key = canonical.toLowerCase();
	const aliasLower = alias.trim().toLowerCase();

	if (BRAND_DATABASE[key]) {
		if (!BRAND_DATABASE[key].includes(aliasLower)) {
			BRAND_DATABASE[key].push(aliasLower);
		}
	} else {
		BRAND_DATABASE[key] = [aliasLower];
	}

	// Invalider le cache
	resolutionCache.clear();
}

/**
 * Vide le cache de résolution.
 * À appeler après des modifications dynamiques de BRAND_DATABASE.
 */
function clearCache() {
	resolutionCache.clear();
}

/**
 * Récupère les statistiques du cache.
 * 
 * @returns {{ size: number, keys: string[] }}
 */
function getCacheStats() {
	return {
		size: resolutionCache.size,
		keys: Array.from(resolutionCache.keys()),
	};
}

/**
 * Exporte la base de données complète pour audit/enrichissement.
 * 
 * @returns {Object} Copie de BRAND_DATABASE
 */
function exportDatabase() {
	return JSON.parse(JSON.stringify(BRAND_DATABASE));
}

module.exports = {
	resolveCanonical,
	matches,
	isBrand,
	getAllCanonicalBrands,
	getAliases,
	addAlias,
	clearCache,
	getCacheStats,
	exportDatabase,
	BRAND_DATABASE, // Exposé pour audit, NE PAS modifier directement
};