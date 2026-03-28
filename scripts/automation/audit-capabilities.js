/**
 * Capability Auditor - Checks all drivers for issues
 * Run: node scripts/automation/audit-capabilities.js
 */
const { loadAllDrivers } = require('../lib/drivers');
const { createLogger } = require('../lib/logger');

const { log, summary } = createLogger('Capability Audit');
const drivers = loadAllDrivers();

for (const [name, d] of drivers) {
  const caps = d.caps;
  const opts = d.config.capabilitiesOptions || {};
  caps.filter(c => c.includes('.')).forEach(c => {
    if (!opts[c]) log('warn', name, 'Missing options: ' + c);
  });
  if (name.includes('button') && caps.includes('onoff')) {
    log('error', name, 'Button has onoff');
  }
}

summary();
