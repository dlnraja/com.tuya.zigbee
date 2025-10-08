#!/bin/bash

#############################################################################
# GENERATE-CHANGELOG.SH - Génération automatique changelogs user-friendly
# Usage: source .github/scripts/generate-changelog.sh
#############################################################################

# Source sanitization functions
source "$(dirname "$0")/sanitize.sh"

# Patterns de conversion technique → utilisateur
declare -A CHANGELOG_MAP=(
  # Features
  ["feat.*enrich"]="Enhanced device database with latest definitions and improved compatibility"
  ["feat.*workflow"]="Enhanced automation system for faster and more reliable updates"
  ["feat.*image"]="Updated device icons for better visual clarity and user experience"
  ["feat.*sanitiz"]="Improved internationalization with better special character support"
  ["feat.*driver"]="New device support and enhanced driver compatibility"
  ["feat.*device"]="Expanded device support with new integrations"
  
  # Fixes
  ["fix.*image"]="Image optimization and visual improvements"
  ["fix.*driver"]="Driver improvements and bug fixes for better stability"
  ["fix.*workflow"]="System optimization for improved performance"
  ["fix.*error"]="Bug fixes and stability improvements"
  ["fix"]="Bug fixes and stability improvements"
  
  # Chore
  ["chore.*workflow"]="System optimization for improved performance and reliability"
  ["chore.*version"]="Version update with performance improvements"
  ["chore.*clean"]="Code optimization and cleanup for better performance"
  ["chore"]="Performance and stability improvements"
  
  # Docs
  ["docs.*guide"]="Enhanced user guides and troubleshooting resources"
  ["docs.*readme"]="Documentation improvements for better user experience"
  ["docs"]="Documentation improvements"
  
  # Performance
  ["perf"]="Performance optimization for faster response times"
  
  # Refactor
  ["refactor"]="Code improvements and optimization"
)

#############################################################################
# Fonction: Générer changelog user-friendly depuis commit message
#############################################################################
generate_user_friendly_changelog() {
  local commit_msg="$1"
  local changelog=""
  
  # Convertir en minuscules pour matching
  local msg_lower=$(echo "$commit_msg" | tr '[:upper:]' '[:lower:]')
  
  # Parcourir les patterns
  for pattern in "${!CHANGELOG_MAP[@]}"; do
    if echo "$msg_lower" | grep -qE "$pattern"; then
      changelog="${CHANGELOG_MAP[$pattern]}"
      break
    fi
  done
  
  # Fallback si aucun pattern
  if [ -z "$changelog" ]; then
    if echo "$msg_lower" | grep -q "^feat"; then
      changelog="New features and improvements"
    elif echo "$msg_lower" | grep -q "^fix"; then
      changelog="Bug fixes and stability improvements"
    elif echo "$msg_lower" | grep -q "^chore"; then
      changelog="Performance and stability improvements"
    elif echo "$msg_lower" | grep -q "^docs"; then
      changelog="Documentation improvements"
    else
      changelog="Improvements and bug fixes"
    fi
  fi
  
  # Sanitize
  changelog=$(sanitize_homey_changelog "$changelog" 400)
  
  echo "$changelog"
}

#############################################################################
# Fonction: Générer changelog depuis plusieurs commits
#############################################################################
generate_changelog_from_commits() {
  local commits="$1"
  local changelog=""
  
  # Prendre le premier commit significatif
  local first_commit=$(echo "$commits" | head -1)
  
  if [ -n "$first_commit" ]; then
    changelog=$(generate_user_friendly_changelog "$first_commit")
  else
    changelog="Performance and stability improvements"
  fi
  
  echo "$changelog"
}

#############################################################################
# Fonction: Générer changelog mensuel
#############################################################################
generate_monthly_changelog() {
  local month=$(date +'%B %Y')
  
  local changelog="Monthly enrichment $month: Enhanced device database with latest definitions, improved compatibility, and updated manufacturer IDs for better device support"
  
  changelog=$(sanitize_homey_changelog "$changelog" 400)
  
  echo "$changelog"
}

#############################################################################
# Fonction: Obtenir commits depuis dernier tag
#############################################################################
get_commits_since_last_tag() {
  local last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  
  if [ -z "$last_tag" ]; then
    # Pas de tag, prendre derniers commits
    git log -5 --pretty=format:"%s" --no-merges
  else
    # Commits depuis dernier tag
    git log ${last_tag}..HEAD --pretty=format:"%s" --no-merges
  fi
}

#############################################################################
# Export des fonctions
#############################################################################
export -f generate_user_friendly_changelog
export -f generate_changelog_from_commits
export -f generate_monthly_changelog
export -f get_commits_since_last_tag

# Test si exécuté directement
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  echo "🎨 GENERATE-CHANGELOG.SH - Tests"
  echo "=================================="
  echo ""
  
  # Test exemples
  declare -a TEST_COMMITS=(
    "feat: système sanitization universel pour caractères spéciaux"
    "fix: désactivation workflows obsolètes"
    "chore: bump version to v2.0.12"
    "docs: guide complet publication"
  )
  
  echo "📝 Conversion Technique → User-Friendly:"
  echo ""
  
  for commit in "${TEST_COMMITS[@]}"; do
    result=$(generate_user_friendly_changelog "$commit")
    echo "Technical: $commit"
    echo "User-Friendly: $result"
    echo ""
  done
  
  echo "📅 Monthly Changelog:"
  generate_monthly_changelog
  echo ""
fi
