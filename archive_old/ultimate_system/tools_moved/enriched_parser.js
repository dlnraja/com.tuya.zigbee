#!/usr/bin/env node
// ENRICHED PARSER - Techniques: fix, scan
const fs = require('fs');

class EnrichedParser {
  parse(data) { return JSON.parse(data); }
  extract(text) { return text.match(/_TZ[A-Z0-9_]+/g) || []; }
  dump(obj) { return JSON.stringify(obj, null, 2); }
}

module.exports = new EnrichedParser();