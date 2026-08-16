#!/usr/bin/env node
'use strict';
/**
 * Compatibility wrapper — AGENTS.md / mega-crawler historically pointed here.
 * Canonical implementation: .github/scripts/fetch-gmail-diagnostics.js
 * (privacy + history gates live there; do not reimplement).
 */
const path = require('path');
require(path.join(__dirname, '..', '..', '.github', 'scripts', 'fetch-gmail-diagnostics.js'));
