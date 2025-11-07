#!/usr/bin/env node
/**
 * Analyze diagnostic logs and detect common issues
 * Usage: node scripts/analyze_diagnostics.js <log_file_or_text>
 */

const fs = require('fs');

// Issue patterns to detect
const ISSUE_PATTERNS = {
  battery_missing: {
    pattern: /battery.*KPI|measure_battery.*missing|batterie.*ne remonte pas/i,
    severity: 'HIGH',
    category: 'Battery KPI',
    suggestion: 'Device likely has powerConfiguration cluster but measure_battery not registered. Check manufacturer/model detection.'
  },
  
  manufacturer_unknown: {
    pattern: /Manufacturer:\s*(Unknown|"")|Model:\s*(Unknown|"")/i,
    severity: 'CRITICAL',
    category: 'Device Identification',
    suggestion: 'Manufacturer/Model not read. Check basic cluster readAttributes syntax and retry logic.'
  },
  
  usb_outlet_wrong: {
    pattern: /USB.*outlet.*pas bon|USB.*socket.*wrong|mauvais driver.*USB/i,
    severity: 'HIGH',
    category: 'USB 2-Outlet',
    suggestion: 'USB 2-outlet not detected correctly. Check multi-endpoint detection and onoff.usb2 capability.'
  },
  
  sensor_to_switch: {
    pattern: /sensor.*switch|climate.*switch|soil.*switch|monitor.*outlet/i,
    severity: 'CRITICAL',
    category: 'Smart-Adapt Over-Aggressive',
    suggestion: 'Sensor wrongly turned into switch/outlet. Update to v4.9.307 with protected driver whitelist.'
  },
  
  confidence_low: {
    pattern: /confidence:\s*0\)|unknown.*confidence:\s*0/i,
    severity: 'MEDIUM',
    category: 'Device Detection',
    suggestion: 'Device type detection failed (confidence 0). Check cluster analysis and fallback logic.'
  },
  
  tuya_dp_not_detected: {
    pattern: /TS0601.*onOff|Tuya.*EF00.*NOT FOUND|_TZE.*basic.*onOff/i,
    severity: 'MEDIUM',
    category: 'Tuya DP Protocol',
    suggestion: 'Tuya DP device showing only basic+onOff clusters. Cluster 0xEF00 may not be visible - use ZIGBEE_NATIVE fallback.'
  },
  
  app_crash: {
    pattern: /TypeError|Cannot read property|crashed|ReferenceError|app.*destroy/i,
    severity: 'CRITICAL',
    category: 'App Crash',
    suggestion: 'App crash detected. Check stack trace for read-only property errors or syntax issues.'
  }
};

function analyzeLog(logText) {
  const issues = [];
  
  for (const [key, config] of Object.entries(ISSUE_PATTERNS)) {
    if (config.pattern.test(logText)) {
      issues.push({
        type: key,
        severity: config.severity,
        category: config.category,
        suggestion: config.suggestion,
        matches: logText.match(config.pattern)
      });
    }
  }
  
  return issues;
}

function extractDeviceInfo(logText) {
  const info = {};
  
  // Extract manufacturer
  const mfrMatch = logText.match(/Manufacturer:\s*([^\n]+)/i);
  if (mfrMatch) info.manufacturer = mfrMatch[1].trim();
  
  // Extract model
  const modelMatch = logText.match(/Model:\s*([^\n]+)/i);
  if (modelMatch) info.model = modelMatch[1].trim();
  
  // Extract driver
  const driverMatch = logText.match(/Driver:\s*([^\]\n]+)/i);
  if (driverMatch) info.driver = driverMatch[1].trim();
  
  // Extract device type
  const typeMatch = logText.match(/Device Type:\s*([^\n(]+)/i);
  if (typeMatch) info.detectedType = typeMatch[1].trim();
  
  // Extract confidence
  const confMatch = logText.match(/confidence:\s*([\d.]+)/i);
  if (confMatch) info.confidence = parseFloat(confMatch[1]);
  
  return info;
}

function generateReport(logText) {
  const issues = analyzeLog(logText);
  const deviceInfo = extractDeviceInfo(logText);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DIAGNOSTIC ANALYSIS REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Device info
  if (Object.keys(deviceInfo).length > 0) {
    console.log('🔍 DEVICE INFORMATION:');
    for (const [key, value] of Object.entries(deviceInfo)) {
      console.log(`   ${key}: ${value}`);
    }
    console.log('');
  }
  
  // Issues found
  if (issues.length === 0) {
    console.log('✅ NO CRITICAL ISSUES DETECTED\n');
    return { deviceInfo, issues: [] };
  }
  
  console.log(`⚠️  ${issues.length} ISSUE(S) DETECTED:\n`);
  
  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
  const highIssues = issues.filter(i => i.severity === 'HIGH');
  const mediumIssues = issues.filter(i => i.severity === 'MEDIUM');
  
  if (criticalIssues.length > 0) {
    console.log('🚨 CRITICAL ISSUES:');
    criticalIssues.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.category}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   💡 Suggestion: ${issue.suggestion}`);
    });
    console.log('');
  }
  
  if (highIssues.length > 0) {
    console.log('⚠️  HIGH PRIORITY ISSUES:');
    highIssues.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.category}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   💡 Suggestion: ${issue.suggestion}`);
    });
    console.log('');
  }
  
  if (mediumIssues.length > 0) {
    console.log('ℹ️  MEDIUM PRIORITY ISSUES:');
    mediumIssues.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.category}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   💡 Suggestion: ${issue.suggestion}`);
    });
    console.log('');
  }
  
  // Recommended actions
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 RECOMMENDED ACTIONS:\n');
  
  if (criticalIssues.some(i => i.type === 'manufacturer_unknown')) {
    console.log('1. Update to v4.9.306+ (fixes manufacturer/model reading)');
  }
  
  if (criticalIssues.some(i => i.type === 'sensor_to_switch')) {
    console.log('2. Update to v4.9.307 (fixes Smart-Adapt over-aggressive)');
    console.log('3. REMOVE and RE-ADD affected devices');
  }
  
  if (highIssues.some(i => i.type === 'battery_missing')) {
    console.log('4. Check if device has powerConfiguration cluster');
    console.log('5. Verify measure_battery capability is registered');
  }
  
  if (highIssues.some(i => i.type === 'usb_outlet_wrong')) {
    console.log('6. Verify multi-endpoint detection logic');
    console.log('7. Check if onoff.usb2 capability is added');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return { deviceInfo, issues };
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Usage: node analyze_diagnostics.js <log_file_or_text>');
    console.error('   Example: node analyze_diagnostics.js diagnostic.log');
    process.exit(1);
  }
  
  let logText = args.join(' ');
  
  // Check if first arg is a file
  if (fs.existsSync(args[0])) {
    console.log(`📄 Reading log file: ${args[0]}`);
    logText = fs.readFileSync(args[0], 'utf8');
  }
  
  const report = generateReport(logText);
  
  // Save report if requested
  if (process.env.SAVE_REPORT === 'true') {
    fs.mkdirSync('.artifacts', { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `.artifacts/diagnostic_report_${timestamp}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`💾 Report saved to: ${reportPath}\n`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeLog, extractDeviceInfo, generateReport };
