#!/usr/bin/env node
'use strict';

console.log('🔍 Validation simple...');
console.log('✅ Script fonctionne !');

const fs = require('fs');
if (fs.existsSync('drivers')) {
  console.log('✅ Dossier drivers trouvé');
} else {
  console.log('❌ Dossier drivers manquant');
}
