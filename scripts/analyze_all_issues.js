#!/usr/bin/env node
/**
 * Analyse complète de TOUS les problèmes
 * - Forum Homey (10 problèmes)
 * - GitHub dlnraja (75 issues)
 * - GitHub Johan Bendz (1306 issues)
 *
 * Objectif: Créer un plan d'action complet pour résoudre tous les problèmes
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ANALYSE COMPLÈTE DE TOUS LES PROBLÈMES\n');
console.log('═'.repeat(70));
console.log();

// Charger les données
const forumData = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'docs', 'analysis', 'forum-posts', 'forum_issues_data.json')
));

const dlnrajaData = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'docs', 'analysis', 'github-issues', 'dlnraja_com.tuya.zigbee_data.json')
));

const johanData = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'docs', 'analysis', 'github-issues', 'JohanBendz_com.tuya.zigbee_data.json')
));

console.log('📊 DONNÉES CHARGÉES\n');
console.log(`Forum: ${forumData.issues.length} problèmes`);
console.log(`GitHub dlnraja: ${dlnrajaData.issues.length} issues`);
console.log(`GitHub Johan Bendz: ${johanData.issues.length} issues`);
console.log(`\nTotal: ${forumData.issues.length + dlnrajaData.issues.length + johanData.issues.length} items\n`);
console.log('═'.repeat(70));
console.log();

/**
 * Extraire les thèmes récurrents
 */
function extractThemes(issues) {
  const themes = {
    pairing: [],
    battery: [],
    temperature: [],
    iaszone: [],
    button: [],
    sensor: [],
    connection: [],
    energy: [],
    thermostat: [],
    switch: [],
    sdk3: [],
    device_support: [],
    other: []
  };

  issues.forEach(issue => {
    const title = (issue.title || '').toLowerCase();
    const body = (issue.body || issue.description || '').toLowerCase();
    const text = title + ' ' + body;

    if (text.match(/pair|pairing|add device|discover/)) {
      themes.pairing.push(issue);
    }
    if (text.match(/battery|bat|power|voltage/)) {
      themes.battery.push(issue);
    }
    if (text.match(/temperature|temp|°c|celsius|fahrenheit/)) {
      themes.temperature.push(issue);
    }
    if (text.match(/ias|iaszone|enrollment|zone/)) {
      themes.iaszone.push(issue);
    }
    if (text.match(/button|remote|switch button/)) {
      themes.button.push(issue);
    }
    if (text.match(/sensor|motion|contact|door|window/)) {
      themes.sensor.push(issue);
    }
    if (text.match(/connection|offline|unavailable|disconnect/)) {
      themes.connection.push(issue);
    }
    if (text.match(/energy|power|watt|consumption|meter/)) {
      themes.energy.push(issue);
    }
    if (text.match(/thermostat|heating|cooling|hvac/)) {
      themes.thermostat.push(issue);
    }
    if (text.match(/switch|relay|outlet|plug/)) {
      themes.switch.push(issue);
    }
    if (text.match(/sdk3|migration|breaking|deprecated/)) {
      themes.sdk3.push(issue);
    }
    if (text.match(/support|new device|add support|request/)) {
      themes.device_support.push(issue);
    }
  });

  return themes;
}

/**
 * Identifier les problèmes critiques non résolus
 */
function findCriticalIssues(issues) {
  return issues.filter(issue => {
    const isOpen = issue.state === 'open' || issue.status === 'open' || issue.status === 'investigating';
    const title = (issue.title || '').toLowerCase();
    const body = (issue.body || issue.description || '').toLowerCase();
    const text = title + ' ' + body;
    const labels = (issue.labels || []).map(l => typeof l === 'string' ? l : l.name).join(' ').toLowerCase();

    // Critères de criticité
    const isCritical =
      labels.includes('critical') ||
      labels.includes('bug') && isOpen ||
      text.includes('crash') ||
      text.includes('not work') ||
      text.includes('broken') ||
      text.includes('error') ||
      text.includes('fail');

    return isOpen && isCritical;
  });
}

/**
 * Analyser les problèmes de devices spécifiques
 */
function analyzeDeviceIssues(issues) {
  const devices = {};

  issues.forEach(issue => {
    const title = (issue.title || '').toLowerCase();
    const body = (issue.body || issue.description || '').toLowerCase();
    const text = title + ' ' + body;

    // Extraire manufacturer IDs
    const manufacturerMatches = text.match(/_TZ\d+_\w+|_TYZB\d+_\w+|_TZE\d+_\w+/g);
    if (manufacturerMatches) {
      manufacturerMatches.forEach(mfr => {
        if (!devices[mfr]) {
          devices[mfr] = [];
        }
        devices[mfr].push(issue);
      });
    }

    // Extraire types de devices
    const deviceTypes = [
      'contact sensor', 'motion sensor', 'temperature sensor', 'humidity sensor',
      'button', 'remote', 'switch', 'dimmer', 'plug', 'outlet',
      'thermostat', 'valve', 'curtain', 'blind', 'lock',
      'light', 'led', 'bulb', 'strip'
    ];

    deviceTypes.forEach(type => {
      if (text.includes(type)) {
        const key = `type_${type.replace(/ /g, '_')}`;
        if (!devices[key]) {
          devices[key] = [];
        }
        devices[key].push(issue);
      }
    });
  });

  return devices;
}

/**
 * Créer plan d'action
 */
function createActionPlan(themes, criticalIssues, deviceIssues) {
  const plan = {
    immediate: [],
    short_term: [],
    medium_term: [],
    long_term: []
  };

  // Actions immédiates: Problèmes critiques
  if (criticalIssues.length > 0) {
    plan.immediate.push({
      title: 'Résoudre les problèmes critiques ouverts',
      priority: 'critical',
      count: criticalIssues.length,
      actions: [
        'Analyser les logs d\'erreur',
        'Reproduire les bugs',
        'Implémenter les fixes',
        'Tester sur devices réels',
        'Déployer les corrections'
      ]
    });
  }

  // Court terme: IAS Zone (très fréquent)
  if (themes.iaszone.length > 0) {
    plan.short_term.push({
      title: 'Améliorer IAS Zone enrollment',
      priority: 'high',
      count: themes.iaszone.length,
      actions: [
        'Ajouter retry logic avec backoff',
        'Améliorer la gestion d\'erreurs',
        'Ajouter plus de logging',
        'Documenter le processus',
        'Créer tests automatiques'
      ]
    });
  }

  // Court terme: Pairing issues
  if (themes.pairing.length > 0) {
    plan.short_term.push({
      title: 'Améliorer le processus de pairing',
      priority: 'high',
      count: themes.pairing.length,
      actions: [
        'Améliorer la détection des manufacturer IDs',
        'Ajouter plus de fallbacks',
        'Améliorer les messages d\'erreur',
        'Documenter le pairing',
        'Créer guide de troubleshooting'
      ]
    });
  }

  // Moyen terme: Battery reporting
  if (themes.battery.length > 0) {
    plan.medium_term.push({
      title: 'Améliorer le reporting de batterie',
      priority: 'medium',
      count: themes.battery.length,
      actions: [
        'Standardiser la lecture de batterie',
        'Ajouter support pour différents formats',
        'Améliorer la détection du type de batterie',
        'Ajouter alertes batterie faible',
        'Documenter les capability battery'
      ]
    });
  }

  // Moyen terme: SDK3 migration
  if (themes.sdk3.length > 0) {
    plan.medium_term.push({
      title: 'Finaliser migration SDK3',
      priority: 'medium',
      count: themes.sdk3.length,
      actions: [
        'Identifier breaking changes restants',
        'Mettre à jour la documentation',
        'Créer guide de migration',
        'Tester tous les drivers',
        'Communiquer les changements'
      ]
    });
  }

  // Long terme: Device support requests
  if (themes.device_support.length > 0) {
    plan.long_term.push({
      title: 'Ajouter support pour nouveaux devices',
      priority: 'low',
      count: themes.device_support.length,
      actions: [
        'Prioriser les demandes les plus fréquentes',
        'Collecter les manufacturer IDs',
        'Créer nouveaux drivers si nécessaire',
        'Tester avec devices réels',
        'Documenter les nouveaux devices'
      ]
    });
  }

  // Long terme: Energy monitoring
  if (themes.energy.length > 0) {
    plan.long_term.push({
      title: 'Améliorer le monitoring énergétique',
      priority: 'low',
      count: themes.energy.length,
      actions: [
        'Calibrer les mesures de puissance',
        'Ajouter accumulation d\'énergie',
        'Supporter plus de formats de mesure',
        'Créer flow cards avancées',
        'Documenter les capabilities'
      ]
    });
  }

  return plan;
}

/**
 * Main
 */
function main() {
  console.log('🔍 ANALYSE EN COURS...\n');

  // Combiner toutes les issues
  const allIssues = [
    ...forumData.issues,
    ...dlnrajaData.issues,
    ...johanData.issues
  ];

  console.log(`📊 Total à analyser: ${allIssues.length} items\n`);

  // Extraire les thèmes
  console.log('🏷️  Extraction des thèmes...');
  const themes = extractThemes(allIssues);

  // Trouver les critiques
  console.log('🔥 Identification des problèmes critiques...');
  const criticalIssues = findCriticalIssues(allIssues);

  // Analyser par device
  console.log('📱 Analyse par device...');
  const deviceIssues = analyzeDeviceIssues(allIssues);

  // Créer le plan d'action
  console.log('📋 Création du plan d\'action...\n');
  const actionPlan = createActionPlan(themes, criticalIssues, deviceIssues);

  // Générer rapport complet
  const report = generateCompleteReport(themes, criticalIssues, deviceIssues, actionPlan, allIssues);

  // Sauvegarder
  const outputDir = path.join(__dirname, '..', 'docs', 'analysis');
  const reportFile = path.join(outputDir, 'COMPLETE_ISSUES_ANALYSIS.md');
  fs.writeFileSync(reportFile, report);

  const dataFile = path.join(outputDir, 'COMPLETE_ISSUES_ANALYSIS.json');
  fs.writeFileSync(dataFile, JSON.stringify({
    summary: {
      total: allIssues.length,
      forum: forumData.issues.length,
      dlnraja: dlnrajaData.issues.length,
      johan: johanData.issues.length,
      critical: criticalIssues.length
    },
    themes: Object.fromEntries(
      Object.entries(themes).map(([k, v]) => [k, v.length])
    ),
    actionPlan: actionPlan,
    analyzedAt: new Date().toISOString()
  }, null, 2));

  console.log('═'.repeat(70));
  console.log('\n✅ ANALYSE TERMINÉE!\n');
  console.log(`📄 Rapport: ${reportFile}`);
  console.log(`💾 Données: ${dataFile}\n`);

  // Afficher résumé
  console.log('📊 RÉSUMÉ\n');
  console.log(`Total analysé: ${allIssues.length}`);
  console.log(`Problèmes critiques: ${criticalIssues.length}`);
  console.log(`\nThèmes principaux:`);
  Object.entries(themes)
    .filter(([k, v]) => v.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .forEach(([theme, issues]) => {
      console.log(`  - ${theme}: ${issues.length}`);
    });
  console.log();
}

/**
 * Générer rapport complet
 */
function generateCompleteReport(themes, criticalIssues, deviceIssues, actionPlan, allIssues) {
  let report = `# 🔍 ANALYSE COMPLÈTE - TOUS LES PROBLÈMES\n\n`;
  report += `**Généré le:** ${new Date().toISOString()}\n\n`;
  report += `---\n\n`;

  // Vue d'ensemble
  report += `## 📊 Vue d'ensemble\n\n`;
  report += `- **Total analysé:** ${allIssues.length} items\n`;
  report += `- **Problèmes critiques ouverts:** ${criticalIssues.length}\n`;
  report += `- **Sources:**\n`;
  report += `  - Forum Homey Community: 10 problèmes\n`;
  report += `  - GitHub dlnraja: 75 issues\n`;
  report += `  - GitHub Johan Bendz: 1306 issues\n\n`;

  // Thèmes principaux
  report += `---\n\n`;
  report += `## 🏷️ Thèmes Récurrents\n\n`;
  report += `| Thème | Occurrences | Priorité |\n`;
  report += `|-------|-------------|----------|\n`;

  const sortedThemes = Object.entries(themes)
    .filter(([k, v]) => v.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  sortedThemes.forEach(([theme, issues]) => {
    const priority = issues.length > 100 ? '🔥 Critique' :
      issues.length > 50 ? '⚠️ Haute' :
        issues.length > 20 ? '🟡 Moyenne' : '🔵 Basse';
    report += `| ${theme} | ${issues.length} | ${priority} |\n`;
  });
  report += `\n`;

  // Problèmes critiques
  if (criticalIssues.length > 0) {
    report += `---\n\n`;
    report += `## 🔥 Problèmes Critiques Ouverts (${criticalIssues.length})\n\n`;

    criticalIssues.slice(0, 20).forEach(issue => {
      report += `### ${issue.title}\n\n`;
      report += `- **Source:** ${issue.html_url ? 'GitHub' : 'Forum'}\n`;
      report += `- **État:** ${issue.state || issue.status}\n`;
      if (issue.labels && issue.labels.length > 0) {
        const labels = issue.labels.map(l => typeof l === 'string' ? l : l.name).join(', ');
        report += `- **Labels:** ${labels}\n`;
      }
      if (issue.html_url) {
        report += `- **URL:** ${issue.html_url}\n`;
      }
      report += `\n`;
    });

    if (criticalIssues.length > 20) {
      report += `\n*... et ${criticalIssues.length - 20} autres problèmes critiques*\n\n`;
    }
  }

  // Plan d'action
  report += `---\n\n`;
  report += `## 📋 PLAN D'ACTION COMPLET\n\n`;

  // Actions immédiates
  if (actionPlan.immediate.length > 0) {
    report += `### ⚡ Actions Immédiates (Priorité Critique)\n\n`;
    actionPlan.immediate.forEach(action => {
      report += `#### ${action.title}\n\n`;
      report += `- **Priorité:** ${action.priority}\n`;
      report += `- **Problèmes concernés:** ${action.count}\n\n`;
      report += `**Actions à réaliser:**\n\n`;
      action.actions.forEach(a => {
        report += `- [ ] ${a}\n`;
      });
      report += `\n`;
    });
  }

  // Court terme
  if (actionPlan.short_term.length > 0) {
    report += `### 🎯 Actions Court Terme (Priorité Haute)\n\n`;
    actionPlan.short_term.forEach(action => {
      report += `#### ${action.title}\n\n`;
      report += `- **Priorité:** ${action.priority}\n`;
      report += `- **Problèmes concernés:** ${action.count}\n\n`;
      report += `**Actions à réaliser:**\n\n`;
      action.actions.forEach(a => {
        report += `- [ ] ${a}\n`;
      });
      report += `\n`;
    });
  }

  // Moyen terme
  if (actionPlan.medium_term.length > 0) {
    report += `### 📅 Actions Moyen Terme (Priorité Moyenne)\n\n`;
    actionPlan.medium_term.forEach(action => {
      report += `#### ${action.title}\n\n`;
      report += `- **Priorité:** ${action.priority}\n`;
      report += `- **Problèmes concernés:** ${action.count}\n\n`;
      report += `**Actions à réaliser:**\n\n`;
      action.actions.forEach(a => {
        report += `- [ ] ${a}\n`;
      });
      report += `\n`;
    });
  }

  // Long terme
  if (actionPlan.long_term.length > 0) {
    report += `### 🔮 Actions Long Terme (Priorité Basse)\n\n`;
    actionPlan.long_term.forEach(action => {
      report += `#### ${action.title}\n\n`;
      report += `- **Priorité:** ${action.priority}\n`;
      report += `- **Problèmes concernés:** ${action.count}\n\n`;
      report += `**Actions à réaliser:**\n\n`;
      action.actions.forEach(a => {
        report += `- [ ] ${a}\n`;
      });
      report += `\n`;
    });
  }

  // Statistiques détaillées
  report += `---\n\n`;
  report += `## 📈 Statistiques Détaillées\n\n`;
  report += `### Distribution par thème\n\n`;
  report += `\`\`\`\n`;
  sortedThemes.forEach(([theme, issues]) => {
    const bar = '█'.repeat(Math.ceil(issues.length / 10));
    report += `${theme.padEnd(20)} ${bar} ${issues.length}\n`;
  });
  report += `\`\`\`\n\n`;

  report += `---\n\n`;
  report += `## 🎯 Prochaines Étapes\n\n`;
  report += `1. ✅ **Analyser les données** - FAIT\n`;
  report += `2. ⏭️ **Prioriser les actions** - Utiliser ce plan\n`;
  report += `3. ⏭️ **Implémenter les fixes** - Commencer par les critiques\n`;
  report += `4. ⏭️ **Tester les corrections** - Sur devices réels\n`;
  report += `5. ⏭️ **Déployer** - Nouvelle version\n`;
  report += `6. ⏭️ **Communiquer** - Forum + GitHub\n\n`;

  report += `---\n\n`;
  report += `*Rapport généré automatiquement par analyze_all_issues.js*\n`;

  return report;
}

main().catch(console.error);
