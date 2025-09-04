#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: SH
 * Converti le: 2025-09-03T20:43:41.571Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de SH vers JavaScript
// ⚠️ Vérification manuelle recommandée

#!/usr/bin/env node
# GitHub Sync Script: master <=> tuya-light

git fetch origin
git checkout tuya-light
git merge origin/master --no-edit
git push origin tuya-light

git checkout master
console.log "✅ Synchronisation complète master ↔ tuya-light"