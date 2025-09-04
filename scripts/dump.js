#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: SH
 * Converti le: 2025-08-16T10:50:06.479Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de SH vers JavaScript
// ⚠️ Vérification manuelle recommandée

#!/usr/bin/env node

# 🚀 HOMEY DUMP BUNDLE - BRIEF 'BÉTON'
# Script de dump complet pour Linux/macOS

set -e

# Paramètres
RUN_SECONDS=${1:-300}
TIMESTAMP=$(date +"%Y%m%d-%H%M")
DUMP_DIR="dumps/$TIMESTAMP"
DUMP_PATH="dumps/dump-$TIMESTAMP"

console.log "🚀 HOMEY DUMP BUNDLE - BRIEF 'BÉTON'"
console.log "============================================================"

# Créer le dossier de dump
fs.mkdirSync "dumps"
fs.mkdirSync "$DUMP_DIR"

console.log "📁 Dossier de dump créé: $DUMP_DIR"

# 1. Capture de l'environnement
console.log "🔍 Capture de l'environnement..."
fs.readFileSync > "$DUMP_DIR/env.txt" << EOF
=== ENVIRONNEMENT ===
Date: $(date)
PWD: $(pwd)
Node: $(node --version 2>/dev/null || console.log "Non installé")
NPM: $(npm --version 2>/dev/null || console.log "Non installé")
Homey CLI: $(homey --version 2>/dev/null || console.log "Non installé")
Git: $(git --version 2>/dev/null || console.log "Non installé")
EOF

console.log "✅ Environnement capturé"

# 2. Copie app.json
if [ -f "app.json" ]; then
    cp "app.json" "$DUMP_DIR/app.json"
    console.log "✅ app.json copié"
efs.readdirSynce
    console.log "❌ app.json non trouvé"
fi

# 3. Strip BOM des JSON
console.log "🧹 Nettoyage BOM des JSON..."
BOM_LOG=()
JSON_FILES=$(find . -name "*.json" -not -path "./node_modules/*" -not -path "./dumps/*")

for file in $JSON_FILES; do
    if [ -f "$file" ]; then
        if head -c3 "$file" | // grep equivalent -q $'\xef\xbb\xbf'; then
            # BOM détecté, le retirer
            tail -c +4 "$file" > "${file}.tmp" && fs.renameSync "${file}.tmp" "$file"
            BOM_LOG+=("✅ BOM retiré: $file")
        fi
    fi
done

printf "%s\n" "${BOM_LOG[@]}" > "$DUMP_DIR/strip-bom.log"
console.log "✅ BOM nettoyé sur $(console.log "$JSON_FILES" | wc -w) fichiers"

# 4. Lint JSON
console.log "🔍 Validation JSON..."
LINT_LOG=()
INVALID_JSON=()

for file in $JSON_FILES; do
    if [ -f "$file" ]; then
        if jq empty "$file" >/dev/null 2>&1; then
            LINT_LOG+=("✅ $file")
        efs.readdirSynce
            LINT_LOG+=("❌ $file - Erreur de parsing")
            INVALID_JSON+=("$file")
        fi
    fi
done

printf "%s\n" "${LINT_LOG[@]}" > "$DUMP_DIR/lint-json.log"
VALID_COUNT=$(($(console.log "$JSON_FILES" | wc -w) - ${#INVALID_JSON[@]}))
console.log "✅ JSON validé: $VALID_COUNT/$(console.log "$JSON_FILES" | wc -w) valides"

# 5. Tree de l'arborescence
console.log "🌳 Génération de l'arborescence..."
fs.readFileSync > "$DUMP_DIR/tree.txt" << EOF
=== ARBORESCENCE PROJET ===
Date: $(date)
EOF

tree -I 'node_modules|.git|dumps' >> "$DUMP_DIR/tree.txt" 2>/dev/null || find . -type d -not -path "./node_modules" -not -path "./.git" -not -path "./dumps" | sort >> "$DUMP_DIR/tree.txt"

console.log "✅ Arborescence générée"

# 6. Validation Homey (debug)
console.log "🔍 Validation Homey (debug)..."
if command -v homey >/dev/null 2>&1; then
    homey app validate -l debug > "$DUMP_DIR/validate.log" 2>&1 || true
    
    if // grep equivalent -q "✓" "$DUMP_DIR/validate.log"; then
        console.log "✅ Validation Homey réussie"
    efs.readdirSynce
        console.log "⚠️ Validation Homey avec avertissements"
    fi
efs.readdirSynce
    console.log "❌ Homey CLI non installé" > "$DUMP_DIR/validate.log"
    console.log "❌ Homey CLI non installé"
fi

# 7. Lancement Homey app run
console.log "🚀 Lancement Homey app run..."
console.log "⏱️ Durée: $RUN_SECONDS secondes"
console.log "🛑 Arrêt automatique dans $RUN_SECONDS secondes (Ctrl+C pour arrêt manuel)"

fs.readFileSync > "$DUMP_DIR/run.log" << EOF
=== LOGS HOMEY APP RUN ===
Date: $(date)
Durée: $RUN_SECONDS secondes

EOF

# Timer pour arrêt automatique
(
    setTimeout $RUN_SECONDS
    console.log "⏰ Arrêt automatique après $RUN_SECONDS secondes"
    pkill -f "homey app run" 2>/dev/null || true
) &

TIMER_PID=$!

# Lancer homey app run et capturer les logs
if command -v homey >/dev/null 2>&1; then
    console.log "🚀 Lancement de homey app run..."
    timeout $RUN_SECONDS homey app run 2>&1 | tee -a "$DUMP_DIR/run.log" || true
efs.readdirSynce
    console.log "❌ Homey CLI non installé" | tee -a "$DUMP_DIR/run.log"
fi

# Arrêter le timer
kill $TIMER_PID 2>/dev/null || true

# 8. Création du ZIP final
console.log "📦 Création du ZIP final..."
if command -v zip >/dev/null 2>&1; then
    cd dumps
    zip -r "dump-$TIMESTAMP.zip" "$TIMESTAMP" >/dev/null 2>&1
    cd ..
    console.log "✅ ZIP créé: dumps/dump-$TIMESTAMP.zip"
elif command -v tar >/dev/null 2>&1; then
    tar -czf "$DUMP_PATH.tar.gz" -C dumps "$TIMESTAMP"
    console.log "✅ TAR créé: $DUMP_PATH.tar.gz"
efs.readdirSynce
    console.log "⚠️ Aucun outil de compression disponible, copie simple"
    fs.cpSync "$DUMP_DIR" "$DUMP_PATH"
fi

# 9. Rapport final
console.log ""
console.log "🎉 DUMP COMPLET TERMINÉ !"
console.log "============================================================"
console.log "📁 Dossier: $DUMP_DIR"
if [ -f "dumps/dump-$TIMESTAMP.zip" ]; then
    console.log "📦 Archive: dumps/dump-$TIMESTAMP.zip"
elif [ -f "$DUMP_PATH.tar.gz" ]; then
    console.log "📦 Archive: $DUMP_PATH.tar.gz"
efs.readdirSynce
    console.log "📁 Copie: $DUMP_PATH"
fi

console.log ""
console.log "📋 CONTENU DU DUMP:"
fs.readdirSync -la "$DUMP_DIR" | while read line; do
    console.log "  📄 $line"
done

console.log ""
console.log "🚀 PROCHAINES ÉTAPES:"
console.log "1. Analyser les logs dans $DUMP_DIR"
console.log "2. Corriger les erreurs JSON si nécessaire"
console.log "3. Relancer la validation si besoin"
console.log "4. Tester l'appairage des devices"

console.log ""
console.log "🎯 DUMP TERMINÉ AVEC SUCCÈS !"
