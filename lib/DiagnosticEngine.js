'use strict';

class DiagnosticEngine {
  constructor(device) {
    this.device = device;
    this.issues = [];
  }

  log(msg) { this.device?.log?.(`[DIAG] ${msg}`); }

  addIssue(code, msg) {
    this.issues.push({ code, msg, time: Date.now() });
    this.log(`⚠️ ${code}: ${msg}`);
  }

  checkDriverMatch(mfr, pid) {
    if (!mfr) this.addIssue('D101', 'No manufacturerName');
    if (!pid) this.addIssue('D102', 'No productId');
  }

  checkBindings(results) {
    for (const [cluster, ok] of Object.entries(results || {})) {
      if (!ok) this.addIssue('D200', `Bind failed: ${cluster}`);
    }
  }

  checkTimeSync(hasZcl, hasTuya) {
    if (!hasZcl && !hasTuya) this.addIssue('D300', 'No time sync mechanism');
  }

  checkEvents(received, debounced, lastTime) {
    if (received === 0) this.addIssue('D401', 'No events received');
    else if (lastTime && Date.now() - lastTime > 86400000) this.addIssue('D401', 'No events in 24h');
    if (received > 10 && debounced / received > 0.5) this.addIssue('D400', 'High duplicate rate');
  }

  getReport() {
    return { issues: this.issues, count: this.issues.length };
  }

  getRepairs(code) {
    const repairs = {
      D100: ['Add mfr+pid to driver.compose.json'],
      D101: ['Add manufacturerName to driver'],
      D200: ['Re-pair device when awake'],
      D201: ['Re-pair during button press'],
      D300: ['Check Tuya 0xEF00 cluster'],
      D400: ['Adjust debounce timing'],
      D401: ['Check battery', 'Re-pair device']
    };
    return repairs[code] || [];
  }
}

module.exports = DiagnosticEngine;
