const fs = require('fs');
const path = require('path');

const filesToFix = [
  {
    path: 'lib/adapters/SecurityManager.js',
    fixes: [
      {
        pattern: /report\.score\s*=\s*Math\.max\(0,\s*100\s*\n\s*-\s*report\.findings\.filter\(f\s*=>\s*f\.severity\s*===\s*'critical'\)\.length\s*\*\s*30\s*\n\s*-\s*report\.findings\.filter\(f\s*=>\s*f\.severity\s*===\s*'warning'\)\.length\s*\*\s*10\s*\n\s*-\s*report\.findings\.filter\(f\s*=>\s*f\.severity\s*===\s*'info'\)\.length\s*\*\s*2\);/,
        replacement: `report.score = Math.max(0, 100 
    - safeMultiply(report.findings.filter(f => f.severity === 'critical').length, 30)
    - safeMultiply(report.findings.filter(f => f.severity === 'warning').length, 10)
    - safeMultiply(report.findings.filter(f => f.severity === 'info').length, 2));`
      }
    ]
  },
  {
    path: 'lib/analytics/AdvancedAnalytics.js',
    fixes: [
      {
        pattern: /const\s+downtime\s*=\s*reconnections\*5;/,
        replacement: 'const downtime = safeMultiply(reconnections, 5);'
      },
      {
        pattern: /const\s+uptime\s*=\s*Math\.max\(0,\s*100\s*-\s*\(downtime\s*\/\s*1440\)\s*\*\s*100\);/,
        replacement: 'const uptime = Math.max(0, 100 - safeMultiply(safeDivide(downtime, 1440), 100));'
      },
      {
        pattern: /return\s+safeDivide\(Math\.round\(uptime\s*\*\s*10\),\s*10\);/,
        replacement: 'return safeDivide(Math.round(safeMultiply(uptime, 10)), 10);'
      },
      {
        pattern: /const\s+dailyEnergy\s*=\s*Math\.round\(power\s*\* \s*24\);/,
        replacement: 'const dailyEnergy = Math.round(safeMultiply(power, 24));'
      },
      {
        pattern: /const\s+cost\s*=\s*Math\.round\(\(dailyEnergy\s*\/\s*1000\)\s*\*\s*0\.20\s*\*\s*100\)\s*\/\s*100;/,
        replacement: 'const cost = safeDivide(Math.round(safeMultiply(safeMultiply(safeDivide(dailyEnergy, 1000), 0.20), 100)), 100);'
      },
      {
        pattern: /report\.averageUptime\s*=\s*Math\.round\(uptimeSum\s*\/ \s*devices\.length\);/,
        replacement: 'report.averageUptime = Math.round(safeDivide(uptimeSum, devices.length));'
      },
      {
        pattern: /report\.averageSuccessRate\s*=\s*Math\.round\(successRateSum\s*\/ \s*devices\.length\);/,
        replacement: 'report.averageSuccessRate = Math.round(safeDivide(successRateSum, devices.length));'
      }
    ]
  }
];

const ROOT = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair';

for (const fileFix of filesToFix) {
  const fullPath = path.join(ROOT, fileFix.path);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  for (const fix of fileFix.fixes) {
    if (fix.pattern.test(content)) {
      content = content.replace(fix.pattern, fix.replacement);
      changed = true;
      console.log(`Fixed pattern in ${fileFix.path}`);
    } else {
      console.warn(`Pattern not found in ${fileFix.path}: ${fix.pattern}`);
    }
  }

  if (changed) {
    fs.writeFileSync(fullPath, content);
    console.log(`Saved ${fileFix.path}`);
  }
}
