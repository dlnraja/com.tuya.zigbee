'use strict';

/**
 * Latin-1 JSON parse (Bastien 1.0.229, diags dev-ae9f / dev-e3d5).
 *
 * V8 picks JsonParser<unsigned short> when the source string is two-byte
 * (any code unit above 255). MakeString then allocates every JSON string as
 * two-byte too, which is the NewRawTwoByteString OOM on a heap already at
 * ~56MB. Escaping those units as \\uXXXX yields an equivalent one-byte source
 * so the one-byte parser is used. The stack does not name the file; this runs
 * for every JSON.parse after install, and for our Buffer loaders.
 *
 * A large parse is refused only when the heap is already critical: the live
 * set is not in the caches MEMWARN clears, and another wide parse is what
 * SIGABRTs. Callers that need the value retry after a collection.
 */

const WIDE_HEAP_BYTES = 52 * 1024 * 1024;
const WIDE_MIN_CHARS = 256 * 1024;

function shouldDeferLargeJson(byteLength, heapUsed) {
  const n = Number(byteLength) || 0;
  const heap = Number(heapUsed) || 0;
  return n > WIDE_MIN_CHARS && heap > WIDE_HEAP_BYTES;
}

function currentHeapUsed() {
  try {
    const { safeMemoryUsage } = require('./safeMemoryUsage');
    return safeMemoryUsage().heapUsed || 0;
  } catch (_e) {
    return 0;
  }
}

/**
 * JSON text whose every code unit is <= 255, equivalent to `input`.
 * @param {string|Buffer} input
 * @returns {string|Buffer}
 */
function toLatin1JsonSource(input) {
  if (Buffer.isBuffer(input)) {
    for (let i = 0; i < input.length; i++) {
      if (input[i] >= 0x80) {
        return toLatin1JsonSource(input.toString('utf8'));
      }
    }
    return input.toString('latin1');
  }
  if (typeof input !== 'string' || input.length === 0) {return input;}
  let wide = false;
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) > 255) { wide = true; break; }
  }
  if (!wide) {return input;}
  const units = [];
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c <= 255) {
      units.push(c);
    } else {
      const hex = c.toString(16).padStart(4, '0');
      units.push(0x5c, 0x75);
      for (let h = 0; h < 4; h++) {units.push(hex.charCodeAt(h));}
    }
  }
  return Buffer.from(units).toString('latin1');
}

function parseJsonLatin1(input, reviver) {
  const size = Buffer.isBuffer(input) ? input.length : (typeof input === 'string' ? input.length : 0);
  if (shouldDeferLargeJson(size, currentHeapUsed())) {
    const err = new Error('json parse deferred: heap already critical');
    err.code = 'JSON_PARSE_HEAP';
    throw err;
  }
  const source = toLatin1JsonSource(input);
  return JSON.parse.__latin1Original
    ? JSON.parse.__latin1Original(source, reviver)
    : JSON.parse(source, reviver);
}

function installLatin1JsonParse() {
  if (JSON.parse && JSON.parse.__latin1Narrow) {return false;}
  const original = JSON.parse;
  function wrapped(text, reviver) {
    if (typeof text !== 'string' && !Buffer.isBuffer(text)) {
      return original(text, reviver);
    }
    const size = Buffer.isBuffer(text) ? text.length : text.length;
    if (shouldDeferLargeJson(size, currentHeapUsed())) {
      const err = new Error('json parse deferred: heap already critical');
      err.code = 'JSON_PARSE_HEAP';
      throw err;
    }
    return original(toLatin1JsonSource(text), reviver);
  }
  wrapped.__latin1Narrow = true;
  wrapped.__latin1Original = original;
  JSON.parse = wrapped;
  return true;
}

module.exports = {
  WIDE_HEAP_BYTES,
  WIDE_MIN_CHARS,
  shouldDeferLargeJson,
  toLatin1JsonSource,
  parseJsonLatin1,
  installLatin1JsonParse,
};
