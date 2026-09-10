#!/usr/bin/env node
'use strict';

/** P2437 — decrement in-flight counter after subagent ends. */
const { decrementInFlight } = require('./limit-subagent-ai');

decrementInFlight();
process.stdout.write(JSON.stringify({}));
