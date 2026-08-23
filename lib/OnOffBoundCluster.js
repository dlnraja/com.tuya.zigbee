'use strict';

// WHY: stale duplicate historically lacked 0xFD. Re-export canonical clusters/
// copy so any legacy `require('../OnOffBoundCluster')` still catches Tuya mfr cmds.
// Do not Cluster.addCluster the standard OnOff here.

module.exports = require('./clusters/OnOffBoundCluster');
