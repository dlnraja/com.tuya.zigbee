#!/bin/bash

# ==========================================
# TUYA ZIGBEE PROJECT - BUILD AND RUN
# ==========================================
# Version: 1.0.1
# Date: 2025-07-26
# Homey Build and Run Script
# ==========================================

set -e  # Exit on any error

echo "🔧 TUYA ZIGBEE PROJECT - BUILD AND RUN"
echo "======================================="
echo "📅 Date: $(date)"
echo "🎯 Objectif: Build et déploiement Homey"
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

# Step 1: Clean npm cache before build
print_status "1. Nettoyage du cache npm avant build..."
npm cache clean --force
print_success "Cache npm nettoyé"

# Step 2: Remove old build artifacts
print_status "2. Suppression des anciens artefacts de build..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
fi
if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
fi
print_success "Anciens artefacts supprimés"

# Step 3: Install dependencies
print_status "3. Installation des dépendances..."
npm install
print_success "Dépendances installées"

# Step 4: Build project
print_status "4. Build du projet..."
npm run build
print_success "Projet compilé"

# Step 5: Clean npm cache after build
print_status "5. Nettoyage du cache npm après build..."
npm cache clean --force
print_success "Cache final nettoyé"

# Step 6: Run Homey app
print_status "6. Lancement de l'application Homey..."
if command -v homey &> /dev/null; then
    print_status "Vérification de la connexion Homey..."
    homey app run --clean
    print_success "Application Homey lancée"
else
    print_error "Homey CLI non installé. Exécutez d'abord quick-start.sh"
    exit 1
fi

echo ""
echo "✅ BUILD ET RUN TERMINÉS AVEC SUCCÈS!"
echo "====================================="
echo "🎯 Application prête pour le déploiement"
echo "📊 Status: Actif et optimisé"
echo ""
