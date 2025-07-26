#!/bin/bash

# ==========================================
# TUYA ZIGBEE PROJECT - QUICK START
# ==========================================
# Version: 1.0.1
# Date: 2025-07-26
# Homey CLI Installation Script
# ==========================================

set -e  # Exit on any error

echo "🚀 TUYA ZIGBEE PROJECT - QUICK START"
echo "====================================="
echo "📅 Date: $(date)"
echo "🎯 Objectif: Installation et configuration Homey CLI"
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

# Step 1: Check Node.js installation
print_status "1. Vérification de Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installé: $NODE_VERSION"
else
    print_error "Node.js non installé. Veuillez l'installer depuis https://nodejs.org/"
    exit 1
fi

# Step 2: Check npm installation
print_status "2. Vérification de npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm installé: $NPM_VERSION"
else
    print_error "npm non installé"
    exit 1
fi

# Step 3: Clean npm cache and node_modules
print_status "3. Nettoyage du cache npm et node_modules..."
if [ -d "node_modules" ]; then
    print_warning "Suppression de node_modules existant..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    print_warning "Suppression de package-lock.json..."
    rm -f package-lock.json
fi

npm cache clean --force
print_success "Cache npm nettoyé"

# Step 4: Install Homey CLI
print_status "4. Installation de Homey CLI..."
if command -v homey &> /dev/null; then
    print_success "Homey CLI déjà installé"
else
    print_status "Installation de Homey CLI..."
    npm install -g homey
    print_success "Homey CLI installé"
fi

# Step 5: Install project dependencies
print_status "5. Installation des dépendances du projet..."
npm install
print_success "Dépendances installées"

# Step 6: Build project
print_status "6. Build du projet..."
npm run build
print_success "Projet compilé"

# Step 7: Clean npm cache after build
print_status "7. Nettoyage final du cache npm..."
npm cache clean --force
print_success "Cache final nettoyé"

echo ""
echo "✅ INSTALLATION TERMINÉE AVEC SUCCÈS!"
echo "====================================="
echo "🎯 Prochaines étapes:"
echo "   - homey login"
echo "   - homey app run"
echo "   - homey app install"
echo ""
echo "📚 Documentation:"
echo "   - https://apps.developer.homey.app/"
echo "   - https://community.homey.app/t/how-to-cli-install-method/198"
echo ""
