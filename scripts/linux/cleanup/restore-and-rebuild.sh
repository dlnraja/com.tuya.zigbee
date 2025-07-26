#!/bin/bash

# ==========================================
# TUYA ZIGBEE PROJECT - CLEANUP AND RESTORE
# ==========================================
# Version: 1.0.1
# Date: 2025-07-26
# Homey Cleanup and Restore Script
# ==========================================

set -e  # Exit on any error

echo "🧹 TUYA ZIGBEE PROJECT - CLEANUP AND RESTORE"
echo "============================================="
echo "📅 Date: $(date)"
echo "🎯 Objectif: Nettoyage complet et restauration"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Clean npm cache
print_status "1. Nettoyage du cache npm..."
npm cache clean --force
print_success "Cache npm nettoyé"

# Step 2: Remove node_modules
print_status "2. Suppression de node_modules..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    print_success "node_modules supprimé"
else
    print_warning "node_modules n'existe pas"
fi

# Step 3: Remove package-lock.json
print_status "3. Suppression de package-lock.json..."
if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    print_success "package-lock.json supprimé"
else
    print_warning "package-lock.json n'existe pas"
fi

# Step 4: Remove build artifacts
print_status "4. Suppression des artefacts de build..."
if [ -d "dist" ]; then
    rm -rf dist
    print_success "Dossier dist supprimé"
fi

if [ -d ".homeybuild" ]; then
    rm -rf .homeybuild
    print_success "Dossier .homeybuild supprimé"
fi

# Step 5: Reinstall dependencies
print_status "5. Réinstallation des dépendances..."
npm install
print_success "Dépendances réinstallées"

# Step 6: Rebuild project
print_status "6. Rebuild du projet..."
npm run build
print_success "Projet reconstruit"

# Step 7: Final cleanup
print_status "7. Nettoyage final..."
npm cache clean --force
print_success "Nettoyage final terminé"

echo ""
echo "✅ NETTOYAGE ET RESTAURATION TERMINÉS!"
echo "======================================"
echo "🎯 Projet restauré et optimisé"
echo "📊 Status: Propre et fonctionnel"
echo ""
