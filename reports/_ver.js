'use strict';
const fs = require('fs');
const p = require('../package.json');
const h = require('../.homeycompose/app.json');
console.log('pkg', p.version, 'compose', h.version);
