#!/usr/bin/env node
'use strict';
// The README generator now lives in docs/tools/build-readme.js (branch-aware, shared with the
// GitHub Pages docs site). This entry point is kept for the workflows that call it.
require('../../docs/tools/build-readme.js').main(process.argv.slice(2));
