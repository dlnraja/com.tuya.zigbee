#!/bin/bash

#############################################################################
# SANITIZE.SH - Fonctions de sanitization pour GitHub Actions
# Usage: source .github/scripts/sanitize.sh
#############################################################################

# Fonction: Sanitize pour output GitHub Actions
# Supprime caractères problématiques pour les outputs YAML
sanitize_github_output() {
    local input="$1"
    
    # Supprimer caractères problématiques
    echo "$input" | \
        sed 's/["]//g' | \
        sed "s/[']//g" | \
        sed 's/[`]//g' | \
        sed 's/[$]//g' | \
        sed 's/[\\]//g' | \
        tr -d '\000-\037' | \
        tr -d '\177-\377'
}

# Fonction: Sanitize pour changelog Homey
# Format accepté: texte simple, une ligne, max 500 chars
sanitize_homey_changelog() {
    local input="$1"
    local max_length="${2:-500}"
    
    # 1. Supprimer tirets initiaux
    input=$(echo "$input" | sed 's/^[- ]*//g')
    
    # 2. Remplacer retours ligne par point-virgule
    input=$(echo "$input" | tr '\n' ';' | sed 's/;$//')
    
    # 3. Remplacer multiples espaces
    input=$(echo "$input" | tr -s ' ')
    
    # 4. Supprimer caractères spéciaux dangereux
    input=$(echo "$input" | sed 's/["`$\\]//g')
    
    # 5. Limiter longueur
    input=$(echo "$input" | head -c "$max_length")
    
    # 6. Ajouter séparateurs propres
    input=$(echo "$input" | sed 's/;/; /g')
    
    echo "$input"
}

# Fonction: Sanitize pour Git commit messages
# Format: Une ligne, pas de caractères qui cassent Git
sanitize_git_commit() {
    local input="$1"
    
    echo "$input" | \
        tr '\n' ' ' | \
        sed 's/["]/'\''/g' | \
        sed 's/[`]/'\''/g' | \
        tr -s ' ' | \
        head -c 200
}

# Fonction: Sanitize pour noms de fichiers
# Supprime caractères interdits dans noms fichiers
sanitize_filename() {
    local input="$1"
    
    echo "$input" | \
        sed 's/[<>:"/\\|?*]/-/g' | \
        sed 's/[ ]/_/g' | \
        tr '[:upper:]' '[:lower:]' | \
        sed 's/^[.-]*//' | \
        head -c 100
}

# Fonction: Sanitize pour URLs
# Encode caractères spéciaux pour URLs
sanitize_url() {
    local input="$1"
    
    echo "$input" | \
        sed 's/ /%20/g' | \
        sed 's/&/%26/g' | \
        sed 's/?/%3F/g' | \
        sed 's/=/%3D/g'
}

# Fonction: Sanitize pour JSON
# Échappe caractères pour JSON valide
sanitize_json() {
    local input="$1"
    
    echo "$input" | \
        sed 's/\\/\\\\/g' | \
        sed 's/"/\\"/g' | \
        sed 's/\t/\\t/g' | \
        tr -d '\000-\037'
}

# Fonction: Nettoyer logs pour affichage
# Supprime couleurs ANSI et caractères de contrôle
sanitize_log() {
    local input="$1"
    
    echo "$input" | \
        sed 's/\x1b\[[0-9;]*m//g' | \
        tr -d '\000-\037' | \
        tr -d '\177'
}

# Fonction: Générique - Nettoyer texte pour CLI
# Usage général pour arguments CLI
sanitize_cli_arg() {
    local input="$1"
    
    # Supprimer tout ce qui peut être interprété comme option/argument
    echo "$input" | \
        sed 's/^-*//' | \
        sed 's/[`$\\"]//g' | \
        tr '\n' ' ' | \
        tr -s ' ' | \
        head -c 300
}

# Fonction: Validation - Check si string est safe
is_safe_string() {
    local input="$1"
    
    # Vérifier caractères dangereux
    if echo "$input" | grep -qE '[\x00-\x1F\x7F`$\\"]'; then
        return 1  # Unsafe
    fi
    
    return 0  # Safe
}

# Export des fonctions
export -f sanitize_github_output
export -f sanitize_homey_changelog
export -f sanitize_git_commit
export -f sanitize_filename
export -f sanitize_url
export -f sanitize_json
export -f sanitize_log
export -f sanitize_cli_arg
export -f is_safe_string

# Test si exécuté directement
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    echo "🧪 SANITIZE.SH - Tests"
    echo "====================="
    echo ""
    
    TEST_INPUT="- feat: test d'une fonctionnalité avec des \"guillemets\" et \$variables"
    
    echo "Input: $TEST_INPUT"
    echo ""
    echo "GitHub Output: $(sanitize_github_output "$TEST_INPUT")"
    echo "Homey Changelog: $(sanitize_homey_changelog "$TEST_INPUT")"
    echo "Git Commit: $(sanitize_git_commit "$TEST_INPUT")"
    echo "Filename: $(sanitize_filename "$TEST_INPUT")"
    echo "CLI Arg: $(sanitize_cli_arg "$TEST_INPUT")"
    echo ""
    
    if is_safe_string "$TEST_INPUT"; then
        echo "✅ String is safe"
    else
        echo "⚠️ String has unsafe characters"
    fi
fi
