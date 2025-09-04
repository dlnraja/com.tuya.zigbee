#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-08-16T14:29:51.465Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Ajout des nouveaux scripts au package.json
 = 'package.json'
 = fs.readFileSync  | ConvertFrom-Json

# Nouveaux scripts à ajouter
 = @{
    'mega:scraping' = 'node tools/core/scraping-engine.js'
    'mega:failover' = 'node tools/core/failover-tester.js'
    'mega:scraping:homey' = 'node tools/core/scraping-engine.js --source=homey-forums'
    'mega:scraping:alternatives' = 'node tools/core/scraping-engine.js --source=alternative-sources'
    'mega:scraping:repos' = 'node tools/core/scraping-engine.js --source=driver-repositories'
    'mega:test:failover' = 'node tools/core/failover-tester.js --mode=comprehensive'
}

# Ajouter les nouveaux scripts
foreach ( in .GetEnumerator()) {
    .scripts[.Key] = .Value
}

# Sauvegarder le package.json
 | ConvertTo-Json -Depth 10 | fs.writeFileSync  -Encoding UTF8

console.log '✅ Nouveaux scripts ajoutés au package.json'
