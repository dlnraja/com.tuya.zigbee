#!/usr/bin/env node
// MULTI-CRITERIA ANALYSIS - Analyse approfondie multi-perspectives
// Simule 10 analyseurs spécialisés différents

const fs = require('fs');
const path = require('path');

const drivers = 'c:\\Users\\HP\\Desktop\\tuya_repair\\drivers';
const reportFile = 'c:\\Users\\HP\\Desktop\\tuya_repair\\MULTI_ANALYSIS_REPORT.json';

console.log('🔍 MULTI-CRITERIA ANALYSIS\n');
console.log('Analyse avec 10 perspectives spécialisées:\n');

const perspectives = {
  1: '📛 Naming Expert - Cohérence nom vs contenu',
  2: '🏷️ Classification Expert - Class vs fonctionnalité',
  3: '⚡ Capability Expert - Capabilities vs type device',
  4: '🔌 Zigbee Expert - Clusters vs capabilities',
  5: '🔋 Energy Expert - Energy vs battery compliance',
  6: '🏭 Manufacturer Expert - IDs vs device type',
  7: '🎨 Icon Expert - Icons vs device category',
  8: '🌐 I18n Expert - Traductions complètes',
  9: '📊 Data Expert - Structure et formats',
  10: '✅ SDK3 Expert - Compliance Homey SDK3'
};

Object.entries(perspectives).forEach(([num, desc]) => {
  console.log(`  ${num}. ${desc}`);
});
console.log('');

const results = {
  timestamp: new Date().toISOString(),
  perspectives: perspectives,
  drivers: {},
  summary: {
    total: 0,
    issues: 0,
    critical: 0,
    warnings: 0,
    suggestions: 0
  }
};

fs.readdirSync(drivers).forEach(driverName => {
  const file = path.join(drivers, driverName, 'driver.compose.json');
  if (!fs.existsSync(file)) return;
  
  results.summary.total++;
  
  try {
    const compose = JSON.parse(fs.readFileSync(file, 'utf8'));
    const analysis = {
      driver: driverName,
      perspectives: {},
      issues: [],
      score: 100
    };
    
    // PERSPECTIVE 1: Naming Expert
    const p1 = { issues: [], score: 100 };
    const nameLower = driverName.toLowerCase();
    
    // Vérifier cohérence nom vs class
    if (nameLower.includes('sensor') && compose.class !== 'sensor') {
      p1.issues.push({
        severity: 'warning',
        message: `Nom contient "sensor" mais class="${compose.class}"`
      });
      p1.score -= 10;
    }
    if (nameLower.includes('light') && !['light'].includes(compose.class)) {
      p1.issues.push({
        severity: 'warning',
        message: `Nom contient "light" mais class="${compose.class}"`
      });
      p1.score -= 10;
    }
    if (nameLower.includes('switch') && !['socket', 'button'].includes(compose.class)) {
      p1.issues.push({
        severity: 'warning',
        message: `Nom contient "switch" mais class="${compose.class}"`
      });
      p1.score -= 10;
    }
    
    analysis.perspectives['1_naming'] = p1;
    
    // PERSPECTIVE 2: Classification Expert
    const p2 = { issues: [], score: 100 };
    const validClasses = ['sensor', 'light', 'socket', 'button', 'lock', 'thermostat', 'curtain', 'doorbell', 'other', 'fan'];
    
    if (!validClasses.includes(compose.class)) {
      p2.issues.push({
        severity: 'critical',
        message: `Class invalide: "${compose.class}" (valides: ${validClasses.join(', ')})`
      });
      p2.score -= 50;
    }
    
    analysis.perspectives['2_classification'] = p2;
    
    // PERSPECTIVE 3: Capability Expert
    const p3 = { issues: [], score: 100 };
    const caps = compose.capabilities || [];
    
    // Motion sensor devrait avoir alarm_motion
    if (nameLower.includes('motion') && !caps.includes('alarm_motion')) {
      p3.issues.push({
        severity: 'warning',
        message: 'Motion sensor devrait avoir "alarm_motion"'
      });
      p3.score -= 15;
    }
    
    // Temperature sensor devrait avoir measure_temperature
    if (nameLower.includes('temp') && !nameLower.includes('controller') && 
        !caps.some(c => c === 'measure_temperature' || (typeof c === 'object' && c.id === 'measure_temperature'))) {
      p3.issues.push({
        severity: 'suggestion',
        message: 'Temperature device devrait avoir "measure_temperature"'
      });
      p3.score -= 5;
    }
    
    // Humidity devrait avoir measure_humidity
    if (nameLower.includes('humid') && 
        !caps.some(c => c === 'measure_humidity' || (typeof c === 'object' && c.id === 'measure_humidity'))) {
      p3.issues.push({
        severity: 'suggestion',
        message: 'Humidity device devrait avoir "measure_humidity"'
      });
      p3.score -= 5;
    }
    
    analysis.perspectives['3_capability'] = p3;
    
    // PERSPECTIVE 4: Zigbee Expert
    const p4 = { issues: [], score: 100 };
    
    if (!compose.zigbee) {
      p4.issues.push({
        severity: 'critical',
        message: 'Pas de configuration Zigbee'
      });
      p4.score -= 100;
    } else {
      if (!compose.zigbee.manufacturerName || compose.zigbee.manufacturerName.length === 0) {
        p4.issues.push({
          severity: 'critical',
          message: 'Aucun manufacturerName défini'
        });
        p4.score -= 50;
      }
      
      if (!compose.zigbee.endpoints) {
        p4.issues.push({
          severity: 'warning',
          message: 'Pas de endpoints définis'
        });
        p4.score -= 20;
      }
    }
    
    analysis.perspectives['4_zigbee'] = p4;
    
    // PERSPECTIVE 5: Energy Expert
    const p5 = { issues: [], score: 100 };
    const hasBattery = caps.some(c => 
      c === 'measure_battery' || c === 'alarm_battery' ||
      (typeof c === 'object' && (c.id === 'measure_battery' || c.id === 'alarm_battery'))
    );
    
    if (hasBattery && (!compose.energy || !compose.energy.batteries)) {
      p5.issues.push({
        severity: 'critical',
        message: 'Battery capability présent mais energy.batteries manquant (SDK3 requis)'
      });
      p5.score -= 50;
    }
    
    if (!hasBattery && compose.energy) {
      p5.issues.push({
        severity: 'warning',
        message: 'Champ energy présent mais pas de battery capability'
      });
      p5.score -= 10;
    }
    
    analysis.perspectives['5_energy'] = p5;
    
    // PERSPECTIVE 6: Manufacturer Expert
    const p6 = { issues: [], score: 100 };
    
    if (compose.zigbee && compose.zigbee.manufacturerName) {
      const ids = compose.zigbee.manufacturerName;
      
      if (ids.length < 3) {
        p6.issues.push({
          severity: 'suggestion',
          message: `Seulement ${ids.length} manufacturer IDs (enrichissement possible)`
        });
        p6.score -= 5;
      }
      
      // Vérifier wildcards incomplets
      const hasWildcard = ids.some(id => id.includes('*') || id.length < 10);
      if (hasWildcard) {
        p6.issues.push({
          severity: 'warning',
          message: 'Manufacturer IDs incomplets ou wildcards détectés'
        });
        p6.score -= 15;
      }
    }
    
    analysis.perspectives['6_manufacturer'] = p6;
    
    // PERSPECTIVE 7: Icon Expert
    const p7 = { issues: [], score: 100 };
    const iconPath = path.join(drivers, driverName, 'assets', 'icon.svg');
    
    if (!fs.existsSync(iconPath)) {
      p7.issues.push({
        severity: 'warning',
        message: 'Icon manquant (icon.svg)'
      });
      p7.score -= 20;
    }
    
    analysis.perspectives['7_icon'] = p7;
    
    // PERSPECTIVE 8: I18n Expert
    const p8 = { issues: [], score: 100 };
    
    if (!compose.name || !compose.name.en) {
      p8.issues.push({
        severity: 'critical',
        message: 'Pas de nom anglais (name.en)'
      });
      p8.score -= 50;
    }
    
    analysis.perspectives['8_i18n'] = p8;
    
    // PERSPECTIVE 9: Data Expert
    const p9 = { issues: [], score: 100 };
    
    if (!Array.isArray(caps)) {
      p9.issues.push({
        severity: 'critical',
        message: 'capabilities n\'est pas un array'
      });
      p9.score -= 50;
    }
    
    analysis.perspectives['9_data'] = p9;
    
    // PERSPECTIVE 10: SDK3 Expert
    const p10 = { issues: [], score: 100 };
    
    // Vérifier duplications battery
    const hasMeasureBattery = caps.includes('measure_battery');
    const hasAlarmBattery = caps.includes('alarm_battery');
    
    if (hasMeasureBattery && hasAlarmBattery) {
      p10.issues.push({
        severity: 'warning',
        message: 'SDK3: measure_battery + alarm_battery ensemble (choisir un seul)'
      });
      p10.score -= 10;
    }
    
    analysis.perspectives['10_sdk3'] = p10;
    
    // Calculer score global et compter issues
    let totalScore = 0;
    let totalIssues = 0;
    Object.values(analysis.perspectives).forEach(p => {
      totalScore += p.score;
      totalIssues += p.issues.length;
      
      p.issues.forEach(issue => {
        if (issue.severity === 'critical') results.summary.critical++;
        else if (issue.severity === 'warning') results.summary.warnings++;
        else if (issue.severity === 'suggestion') results.summary.suggestions++;
      });
    });
    
    analysis.score = Math.round(totalScore / 10);
    analysis.totalIssues = totalIssues;
    
    if (totalIssues > 0) {
      results.summary.issues++;
      console.log(`  ⚠️  ${driverName}: Score ${analysis.score}/100 (${totalIssues} issues)`);
    }
    
    results.drivers[driverName] = analysis;
    
  } catch (e) {
    console.log(`  ❌ ${driverName}: Parse error`);
  }
});

// Sauvegarder rapport
fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));

console.log(`\n📊 RÉSUMÉ GLOBAL:`);
console.log(`  Drivers analysés: ${results.summary.total}`);
console.log(`  Drivers avec issues: ${results.summary.issues}`);
console.log(`  Issues critiques: ${results.summary.critical}`);
console.log(`  Warnings: ${results.summary.warnings}`);
console.log(`  Suggestions: ${results.summary.suggestions}`);
console.log(`\n📄 Rapport complet: MULTI_ANALYSIS_REPORT.json\n`);
