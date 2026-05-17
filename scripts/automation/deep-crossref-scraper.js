/**
 * 🕵️‍♂️ DEEP CROSS-REFERENCE SCRAPER & INTELLIGENCE AGGREGATOR
 * Purpose: Aggregates local & external sources (Z2M, Forums, Emails, Issues, PRs, Variants)
 * to solve "unknown devices" or "buggy behavior" without consuming AI tokens or browser tools.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color helpers
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`${BLUE}========================================================================${RESET}`);
console.log(`🧠   ${GREEN}DEEP CROSS-REFERENCE SCRAPER & INTELLIGENCE AGGREGATOR v1.0.0${RESET}`);
console.log(`${BLUE}========================================================================${RESET}`);

// Parse arguments
const args = process.argv.slice(2);
const mfr = args.find(a => a.startsWith('--mfr='))?.split('=')[1] || '';
const pid = args.find(a => a.startsWith('--pid='))?.split('=')[1] || '';
const issueId = args.find(a => a.startsWith('--issue='))?.split('=')[1] || '';

if (!mfr && !pid && !issueId) {
  console.log(`${YELLOW}Usage:${RESET} node scripts/automation/deep-crossref-scraper.js --mfr=<MFR> --pid=<PID> [--issue=<ID>]`);
  console.log(`${YELLOW}Example:${RESET} node scripts/automation/deep-crossref-scraper.js --mfr=_TZ3000_abc123 --pid=TS0001`);
  console.log(`${YELLOW}No inputs provided. Initiating a global intelligence scan...${RESET}\n`);
}

const reportPath = path.join(process.cwd(), '.github/state/deep-scraper-report.json');
const markdownReportPath = path.join(process.cwd(), '.github/state/deep-scraper-report.md');

// Ensure output directories exist
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const intelligenceReport = {
  timestamp: new Date().toISOString(),
  target: { mfr, pid, issueId },
  findings: {
    z2m: null,
    zha: null,
    domoticz: null,
    forum: null,
    gmail: null,
    github: null,
    variants: []
  },
  verdict: {}
};

try {
  // 1. SCAN LOCAL VARIANTS & DRIVERS
  console.log(`${YELLOW}[1/6] Scanning local drivers & variants...${RESET}`);
  const driversDir = path.join(process.cwd(), 'drivers');
  const drivers = fs.readdirSync(driversDir);
  
  for (const driver of drivers) {
    const composePath = path.join(driversDir, driver, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        if (compose.fingerprints) {
          const matchingFps = compose.fingerprints.filter(f => {
            const mfrMatch = mfr ? (f.id && f.id.toLowerCase().includes(mfr.toLowerCase())) : false;
            const pidMatch = pid ? (f.productId && f.productId.toLowerCase().includes(pid.toLowerCase())) : false;
            return mfrMatch || pidMatch;
          });
          
          if (matchingFps.length > 0) {
            intelligenceReport.findings.variants.push({
              driver,
              fingerprints: matchingFps
            });
            console.log(`   Found match in driver [${GREEN}${driver}${RESET}]: ${matchingFps.length} fingerprints`);
          }
        }
      } catch (err) {
        // Skip malformed compose
      }
    }
  }

  // 2. RUN Z2M / ZHA / DOMOTICZ INTELLIGENCE
  console.log(`\n${YELLOW}[2/6] Querying external domotic sources...${RESET}`);
  if (mfr || pid) {
    try {
      console.log(`   Running cross-ref intelligence...`);
      const crossRefCmd = `node .github/scripts/cross-ref-intelligence.js --mfr="${mfr}" --pid="${pid}"`;
      const output = execSync(crossRefCmd, { stdio: 'pipe' }).toString();
      intelligenceReport.findings.z2m = { success: true, summary: "Completed successfully" };
    } catch (e) {
      intelligenceReport.findings.z2m = { success: false, error: e.message };
    }
  }

  // 3. RUN GMAIL DIAGNOSTICS & CRASH LOG SCANNER
  console.log(`\n${YELLOW}[3/6] Fetching diagnostics emails & crash logs...${RESET}`);
  try {
    const gmailCmd = `node .github/scripts/fetch-gmail-diagnostics.js --max 10`;
    execSync(gmailCmd, { stdio: 'pipe' });
    intelligenceReport.findings.gmail = { success: true };
  } catch (e) {
    intelligenceReport.findings.gmail = { success: false, error: e.message };
  }

  // 4. RUN FORUM ACTIVITY SCRAPER
  console.log(`\n${YELLOW}[4/6] Scraping Homey Community Forums (T140352)...${RESET}`);
  try {
    const forumCmd = `node .github/scripts/forum-activity-scraper.js --topic 140352`;
    execSync(forumCmd, { stdio: 'pipe' });
    intelligenceReport.findings.forum = { success: true };
  } catch (e) {
    intelligenceReport.findings.forum = { success: false, error: e.message };
  }

  // 5. SCAN GITHUB ISSUES & PRs (INCLUDING CLOSED)
  console.log(`\n${YELLOW}[5/6] Analysing GitHub Issues & PRs...${RESET}`);
  try {
    const githubCmd = `node .github/scripts/github-scanner.js triage`;
    execSync(githubCmd, { stdio: 'pipe' });
    intelligenceReport.findings.github = { success: true };
  } catch (e) {
    intelligenceReport.findings.github = { success: false, error: e.message };
  }

  // 6. BUILD FINAL INTELLIGENCE VERDICT
  console.log(`\n${YELLOW}[6/6] Compiling sovereign diagnostic verdict...${RESET}`);
  
  if (intelligenceReport.findings.variants.length > 0) {
    const primary = intelligenceReport.findings.variants[0];
    intelligenceReport.verdict = {
      action: "ENRICH_EXISTING",
      targetDriver: primary.driver,
      reason: `ManufacturerName and/or ProductID already matched in driver ${primary.driver}. Single manufacturer multi-variant rule applies.`
    };
  } else if (mfr && pid) {
    intelligenceReport.verdict = {
      action: "SCAFFOLD_NEW",
      reason: `No driver currently maps this device. Needs new driver creation or integration using BaseUnifiedDevice V8.0 standards.`
    };
  } else {
    intelligenceReport.verdict = {
      action: "STANDBY",
      reason: "No target manufacturerName or productId defined. Generic scan executed."
    };
  }

  // Write reports
  fs.writeFileSync(reportPath, JSON.stringify(intelligenceReport, null, 2), 'utf8');
  
  // Build markdown report
  let md = `# 🕵️‍♂️ DEEP CROSS-REFERENCE SCRAPER REPORT\n`;
  md += `> **Executed**: ${intelligenceReport.timestamp}\n`;
  md += `> **Target**: MFR=\`${mfr || 'Any'}\`, PID=\`${pid || 'Any'}\`, Issue=\`${issueId || 'None'}\`\n\n`;
  
  md += `## 🎯 DIAGNOSTIC VERDICT\n`;
  md += `- **Action**: \`${intelligenceReport.verdict.action}\`\n`;
  md += `- **Reason**: ${intelligenceReport.verdict.reason}\n\n`;
  
  md += `## 🧬 LOCAL MATCHES & VARIANTS\n`;
  if (intelligenceReport.findings.variants.length > 0) {
    for (const v of intelligenceReport.findings.variants) {
      md += `### Driver: [${v.driver}](file:///c:/Users/HP/Desktop/homey%20app/tuya_repair/drivers/${v.driver})\n`;
      md += `| Fingerprint ID | Product ID | Model ID | Properties |\n`;
      md += `|---|---|---|---|\n`;
      for (const fp of v.fingerprints) {
        md += `| \`${fp.id}\` | \`${fp.productId}\` | \`${fp.modelId || ''}\` | \`${JSON.stringify(fp.capabilities || [])}\` |\n`;
      }
      md += `\n`;
    }
  } else {
    md += `*No matching local fingerprints found.*\n\n`;
  }
  
  md += `## 🌐 EXTERNAL AGGREGATIONS STATUS\n`;
  md += `- **Z2M / ZHA Quirks**: \`${intelligenceReport.findings.z2m?.success ? 'SUCCESS' : 'FAILED'}\`\n`;
  md += `- **Diagnostics Gmail Logs**: \`${intelligenceReport.findings.gmail?.success ? 'SUCCESS' : 'FAILED'}\`\n`;
  md += `- **Homey Forum Scraper**: \`${intelligenceReport.findings.forum?.success ? 'SUCCESS' : 'FAILED'}\`\n`;
  md += `- **GitHub Triage Logs**: \`${intelligenceReport.findings.github?.success ? 'SUCCESS' : 'FAILED'}\`\n\n`;
  
  md += `---  \n*Generated silently in Shadow Mode by Antigravity Autonomous Scraper.*`;
  
  fs.writeFileSync(markdownReportPath, md, 'utf8');
  
  console.log(`\n${GREEN}✔ Deep Scraper completed successfully!${RESET}`);
  console.log(`  JSON report saved to: ${BLUE}.github/state/deep-scraper-report.json${RESET}`);
  console.log(`  Markdown report saved to: ${BLUE}.github/state/deep-scraper-report.md${RESET}\n`);

} catch (err) {
  console.error(`${RED}Critical Aggregator Error:${RESET}`, err);
}
