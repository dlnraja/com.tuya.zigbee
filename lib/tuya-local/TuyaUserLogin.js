'use strict';

/**
 * TuyaUserLogin.js (P2471)
 * SSOT for Smart Life / Tuya Smart Easy Login identity + country/region heuristics.
 *
 * Contre quoi: countryCode ignored; phone accounts mis-typed as email; wrong region
 * endpoint causing authorized-login failures.
 *
 * Research: Tuya OpenAPI authorized-login, TinyTuya, tuya-homebridge, HA tuya-local.
 */

const { normalizeTuyaUsername, digitsOnly } = require('./normalizeTuyaUsername');
const {
  REGION_FALLBACK_ORDER,
  normalizeRegion,
  normalizeAppSchema,
  buildSchemaFallbackChain,
} = require('./TuyaAuthCatalog');

/** Default dialing codes when UI omits countryCode (Homey EU-first). */
const REGION_COUNTRY_CODE = Object.freeze({
  eu: '33',
  we: '31',
  us: '1',
  ue: '1',
  cn: '86',
  in: '91',
  sg: '65',
});

/**
 * Guess ISO dialing country code from Tuya cloud region.
 * @param {string} region
 * @returns {string}
 */
function guessCountryCodeFromRegion(region) {
  const id = normalizeRegion(region || 'eu');
  return REGION_COUNTRY_CODE[id] || '33';
}

/**
 * Build normalized login identity (email OR phone).
 * @param {object} input
 * @param {string} [input.username]
 * @param {string} [input.email]
 * @param {string} [input.phone]
 * @param {string|number} [input.countryCode]
 * @param {string} [input.region] — used to guess CC when phone and CC missing
 * @returns {{ username: string, kind: 'email'|'phone', countryCode: string|null, regionHint: string }}
 */
function buildLoginIdentity(input = {}) {
  const regionHint = normalizeRegion(input.region || 'eu');
  const raw = String(input.email || input.username || input.phone || '').trim();
  let cc = digitsOnly(input.countryCode) || null;
  if (!cc && raw && !raw.includes('@')) {
    cc = guessCountryCodeFromRegion(regionHint);
  }
  const norm = normalizeTuyaUsername(raw, cc);
  return {
    username: norm.username,
    kind: norm.kind,
    countryCode: norm.countryCode || cc,
    regionHint,
  };
}

/**
 * Ordered regions to try for authorized-login.
 * @param {string} preferred
 * @param {{ autoRegion?: boolean }} [opts]
 * @returns {string[]}
 */
function resolveLoginRegions(preferred, opts = {}) {
  const pref = normalizeRegion(preferred || 'eu');
  if (opts.autoRegion === false) {return [pref];}
  return [pref, ...REGION_FALLBACK_ORDER.filter((r) => r !== pref)];
}

/**
 * Schema chain for authorized-login body.schema (tuyaSmart / smartlife).
 * @param {string} preferred
 * @returns {string[]}
 */
function resolveLoginSchemas(preferred) {
  return buildSchemaFallbackChain(preferred || 'tuyaSmart');
}

/**
 * Body fields for POST /v1.0/iot-01/associated-users/actions/authorized-login
 * @param {object} args
 * @param {string} args.passwordHash — sha256 hex lowercase
 * @param {object} [args.identity] — from buildLoginIdentity
 * @param {string} [args.schema]
 * @param {string} [args.region]
 */
function buildAuthorizedLoginBody(args = {}) {
  const identity = args.identity || buildLoginIdentity(args);
  const schema = normalizeAppSchema(args.schema || 'tuyaSmart');
  const countryCode = identity.countryCode
    || guessCountryCodeFromRegion(args.region || identity.regionHint)
    || '33';
  return {
    username: identity.username,
    password: args.passwordHash || args.password || '',
    country_code: String(countryCode),
    schema,
  };
}

module.exports = {
  REGION_COUNTRY_CODE,
  guessCountryCodeFromRegion,
  buildLoginIdentity,
  resolveLoginRegions,
  resolveLoginSchemas,
  buildAuthorizedLoginBody,
  normalizeTuyaUsername,
  digitsOnly,
};
