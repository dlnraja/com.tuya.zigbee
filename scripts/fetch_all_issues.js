#!/usr/bin/env node
/**
 * Récupération de TOUTES les issues et PR GitHub
 * - Repository dlnraja (Universal Tuya Zigbee)
 * - Repository Johan Bendz (com.tuya.zigbee)
 * - Tous statuts: open, closed, abandoned, etc.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('🔍 RÉCUPÉRATION COMPLÈTE DES ISSUES GITHUB\n');
console.log('═'.repeat(70));
console.log();

// Configuration
const repos = [
  {
    owner: 'dlnraja',
    repo: 'com.tuya.zigbee',
    name: 'Universal Tuya Zigbee (dlnraja)'
  },
  {
    owner: 'JohanBendz',
    repo: 'com.tuya.zigbee',
    name: 'Tuya Zigbee (Johan Bendz)'
  }
];

const outputDir = path.join(__dirname, '..', 'docs', 'analysis', 'github-issues');

// Créer le dossier de sortie
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Faire une requête GitHub API
 */
function githubRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Homey-Tuya-Zigbee-Issue-Fetcher',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ data: json, headers: res.headers });
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Récupérer toutes les issues d'un repo (pagination)
 */
async function fetchAllIssues(owner, repo) {
  console.log(`📦 Récupération issues: ${owner}/${repo}`);

  const allIssues = [];
  let page = 1;
  let hasMore = true;

  // Récupérer les issues ouvertes ET fermées
  const states = ['open', 'closed'];

  for (const state of states) {
    console.log(`   État: ${state}`);
    page = 1;
    hasMore = true;

    while (hasMore) {
      try {
        const path = `/repos/${owner}/${repo}/issues?state=${state}&per_page=100&page=${page}`;
        const { data } = await githubRequest(path);

        if (data.length === 0) {
          hasMore = false;
        } else {
          allIssues.push(...data);
          console.log(`   ✅ Page ${page}: ${data.length} issues`);
          page++;

          // Rate limiting: attendre 1 seconde entre les requêtes
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.log(`   ⚠️  Erreur page ${page}: ${err.message}`);
        hasMore = false;
      }
    }
  }

  console.log(`   📊 Total: ${allIssues.length} issues\n`);
  return allIssues;
}

/**
 * Récupérer tous les PR d'un repo
 */
async function fetchAllPRs(owner, repo) {
  console.log(`🔀 Récupération PR: ${owner}/${repo}`);

  const allPRs = [];
  let page = 1;
  let hasMore = true;

  const states = ['open', 'closed'];

  for (const state of states) {
    console.log(`   État: ${state}`);
    page = 1;
    hasMore = true;

    while (hasMore) {
      try {
        const path = `/repos/${owner}/${repo}/pulls?state=${state}&per_page=100&page=${page}`;
        const { data } = await githubRequest(path);

        if (data.length === 0) {
          hasMore = false;
        } else {
          allPRs.push(...data);
          console.log(`   ✅ Page ${page}: ${data.length} PRs`);
          page++;

          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.log(`   ⚠️  Erreur page ${page}: ${err.message}`);
        hasMore = false;
      }
    }
  }

  console.log(`   📊 Total: ${allPRs.length} PRs\n`);
  return allPRs;
}

/**
 * Analyser et catégoriser les issues
 */
function analyzeIssues(issues) {
  const analysis = {
    total: issues.length,
    open: 0,
    closed: 0,
    categories: {
      bug: [],
      enhancement: [],
      question: [],
      documentation: [],
      device_request: [],
      other: []
    },
    priorities: {
      critical: [],
      high: [],
      medium: [],
      low: []
    }
  };

  issues.forEach(issue => {
    // Compter par état
    if (issue.state === 'open') {
      analysis.open++;
    } else {
      analysis.closed++;
    }

    // Catégoriser par labels
    const labels = issue.labels.map(l => l.name.toLowerCase());

    if (labels.some(l => l.includes('bug'))) {
      analysis.categories.bug.push(issue);
    } else if (labels.some(l => l.includes('enhancement') || l.includes('feature'))) {
      analysis.categories.enhancement.push(issue);
    } else if (labels.some(l => l.includes('question'))) {
      analysis.categories.question.push(issue);
    } else if (labels.some(l => l.includes('documentation') || l.includes('doc'))) {
      analysis.categories.documentation.push(issue);
    } else if (labels.some(l => l.includes('device'))) {
      analysis.categories.device_request.push(issue);
    } else {
      analysis.categories.other.push(issue);
    }

    // Prioriser
    if (labels.some(l => l.includes('critical') || l.includes('urgent'))) {
      analysis.priorities.critical.push(issue);
    } else if (labels.some(l => l.includes('high') || l.includes('important'))) {
      analysis.priorities.high.push(issue);
    } else if (labels.some(l => l.includes('medium'))) {
      analysis.priorities.medium.push(issue);
    } else if (labels.some(l => l.includes('low'))) {
      analysis.priorities.low.push(issue);
    }
  });

  return analysis;
}

/**
 * Générer rapport Markdown
 */
function generateReport(repoName, issues, prs, analysis) {
  let report = `# ${repoName} - Issues & PR\n\n`;
  report += `**Généré le:** ${new Date().toISOString()}\n\n`;
  report += `---\n\n`;

  report += `## 📊 Statistiques\n\n`;
  report += `- **Issues totales:** ${analysis.total}\n`;
  report += `- **Issues ouvertes:** ${analysis.open}\n`;
  report += `- **Issues fermées:** ${analysis.closed}\n`;
  report += `- **Pull Requests:** ${prs.length}\n\n`;

  report += `---\n\n`;

  report += `## 🏷️ Par Catégorie\n\n`;
  report += `| Catégorie | Nombre |\n`;
  report += `|-----------|--------|\n`;
  Object.entries(analysis.categories).forEach(([cat, items]) => {
    report += `| ${cat} | ${items.length} |\n`;
  });
  report += `\n`;

  report += `---\n\n`;

  report += `## 🔥 Par Priorité\n\n`;
  report += `| Priorité | Nombre |\n`;
  report += `|----------|--------|\n`;
  Object.entries(analysis.priorities).forEach(([pri, items]) => {
    report += `| ${pri} | ${items.length} |\n`;
  });
  report += `\n`;

  report += `---\n\n`;

  // Issues critiques ouvertes
  const criticalOpen = analysis.priorities.critical.filter(i => i.state === 'open');
  if (criticalOpen.length > 0) {
    report += `## 🚨 Issues Critiques Ouvertes (${criticalOpen.length})\n\n`;
    criticalOpen.forEach(issue => {
      report += `### #${issue.number} - ${issue.title}\n\n`;
      report += `- **État:** ${issue.state}\n`;
      report += `- **Auteur:** ${issue.user.login}\n`;
      report += `- **Créé:** ${issue.created_at}\n`;
      report += `- **URL:** ${issue.html_url}\n\n`;
      if (issue.body) {
        report += `**Description:**\n\n${issue.body.substring(0, 500)}...\n\n`;
      }
      report += `---\n\n`;
    });
  }

  // Bugs ouverts
  const bugsOpen = analysis.categories.bug.filter(i => i.state === 'open');
  if (bugsOpen.length > 0) {
    report += `## 🐛 Bugs Ouverts (${bugsOpen.length})\n\n`;
    bugsOpen.slice(0, 20).forEach(issue => {
      report += `- #${issue.number} - ${issue.title} ([lien](${issue.html_url}))\n`;
    });
    if (bugsOpen.length > 20) {
      report += `\n*... et ${bugsOpen.length - 20} autres*\n`;
    }
    report += `\n`;
  }

  // Demandes de devices
  const deviceRequests = analysis.categories.device_request;
  if (deviceRequests.length > 0) {
    report += `## 📱 Demandes de Devices (${deviceRequests.length})\n\n`;
    deviceRequests.slice(0, 20).forEach(issue => {
      const state = issue.state === 'open' ? '🔴' : '✅';
      report += `- ${state} #${issue.number} - ${issue.title} ([lien](${issue.html_url}))\n`;
    });
    if (deviceRequests.length > 20) {
      report += `\n*... et ${deviceRequests.length - 20} autres*\n`;
    }
    report += `\n`;
  }

  return report;
}

/**
 * Main
 */
async function main() {
  const allData = [];

  for (const repo of repos) {
    console.log(`\n📦 Repository: ${repo.name}`);
    console.log('─'.repeat(70));
    console.log();

    try {
      // Récupérer issues et PRs
      const issues = await fetchAllIssues(repo.owner, repo.repo);
      const prs = await fetchAllPRs(repo.owner, repo.repo);

      // Analyser
      const analysis = analyzeIssues(issues);

      // Sauvegarder données brutes
      const dataFile = path.join(outputDir, `${repo.owner}_${repo.repo}_data.json`);
      fs.writeFileSync(dataFile, JSON.stringify({
        repository: repo,
        issues: issues,
        pullRequests: prs,
        analysis: analysis,
        fetchedAt: new Date().toISOString()
      }, null, 2));
      console.log(`💾 Données sauvegardées: ${dataFile}\n`);

      // Générer rapport
      const report = generateReport(repo.name, issues, prs, analysis);
      const reportFile = path.join(outputDir, `${repo.owner}_${repo.repo}_report.md`);
      fs.writeFileSync(reportFile, report);
      console.log(`📄 Rapport généré: ${reportFile}\n`);

      allData.push({
        repository: repo,
        issues: issues,
        pullRequests: prs,
        analysis: analysis
      });

    } catch (err) {
      console.error(`❌ Erreur pour ${repo.name}:`, err.message);
    }

    console.log();
  }

  // Générer rapport consolidé
  console.log('═'.repeat(70));
  console.log('\n📊 RAPPORT CONSOLIDÉ\n');

  let consolidated = `# Rapport Consolidé - Issues GitHub\n\n`;
  consolidated += `**Généré le:** ${new Date().toISOString()}\n\n`;
  consolidated += `**Repositories analysés:** ${repos.length}\n\n`;
  consolidated += `---\n\n`;
  consolidated += `## Vue d'ensemble\n\n`;
  consolidated += `| Repository | Issues | Ouvertes | Fermées | PRs |\n`;
  consolidated += `|------------|--------|----------|---------|-----|\n`;

  let totalIssues = 0;
  let totalOpen = 0;
  let totalClosed = 0;
  let totalPRs = 0;

  allData.forEach(data => {
    totalIssues += data.analysis.total;
    totalOpen += data.analysis.open;
    totalClosed += data.analysis.closed;
    totalPRs += data.pullRequests.length;

    consolidated += `| ${data.repository.name} | ${data.analysis.total} | ${data.analysis.open} | ${data.analysis.closed} | ${data.pullRequests.length} |\n`;
  });

  consolidated += `| **TOTAL** | **${totalIssues}** | **${totalOpen}** | **${totalClosed}** | **${totalPRs}** |\n\n`;

  console.log(`Total issues: ${totalIssues}`);
  console.log(`Issues ouvertes: ${totalOpen}`);
  console.log(`Issues fermées: ${totalClosed}`);
  console.log(`Pull Requests: ${totalPRs}\n`);

  const consolidatedFile = path.join(outputDir, 'CONSOLIDATED_REPORT.md');
  fs.writeFileSync(consolidatedFile, consolidated);
  console.log(`📄 Rapport consolidé: ${consolidatedFile}\n`);

  console.log('═'.repeat(70));
  console.log('\n✅ RÉCUPÉRATION TERMINÉE!\n');
}

main().catch(console.error);
