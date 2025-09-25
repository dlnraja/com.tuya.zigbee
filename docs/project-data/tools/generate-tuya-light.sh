#!/bin/bash

# ⚡ Tuya Light Generator - Focus on Main Objective
# Generates a minimal, production-ready version focused ONLY on Tuya Zigbee integration
# NO dashboard, NO complementary elements, NO development tools

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LITE_DIR="$PROJECT_ROOT/tuya-light-temp"
BACKUP_FILE="$PROJECT_ROOT/tuya-light-backup-$(date +%Y%m%d-%H%M%S).zip"

# Essential files for tuya-light (FOCUS ON MAIN OBJECTIVE ONLY)
ESSENTIAL_FILES=(
    "app.json"
    "package.json"
    "app.js"
    "README.md"
    "LICENSE"
    ".gitignore"
)

# Directories to copy (FOCUS ON MAIN OBJECTIVE ONLY)
COPY_DIRS=(
    "drivers/sdk3"
    "assets"
)

# STRICT FORBIDDEN FILES (NO COMPLEMENTARY ELEMENTS)
FORBIDDEN_FILES=(
    "*.ps1"
    "*.sh"
    "*.yml"
    "*.yaml"
    "*.test.js"
    "*.spec.js"
    "*.log"
    "*.cursor"
    "*.tmp"
    "*.bak"
    "*.md"
    "*.txt"
    "*.json"
    "*.js"
    "*.py"
    "*.html"
    "*.css"
    "*.xml"
    "*.yaml"
    "*.yml"
)

# STRICT FORBIDDEN DIRECTORIES (NO COMPLEMENTARY ELEMENTS)
FORBIDDEN_DIRS=(
    "docs"
    "tools"
    "ref"
    "src"
    "locales"
    "research"
    "node_modules"
    "dashboard"
    "web"
    "ui"
    "scripts"
    "test"
    "tests"
    "examples"
    "samples"
    "templates"
    "config"
    "build"
    "dist"
    "coverage"
    "reports"
    "logs"
    "temp"
    "cache"
    ".github"
    ".vscode"
    ".idea"
    ".cursor"
)

echo -e "${BLUE}⚡ Tuya Light Generator - Focus on Main Objective${NC}"
echo -e "${YELLOW}Generating minimal version focused ONLY on Tuya Zigbee integration${NC}"
echo -e "${YELLOW}NO dashboard, NO complementary elements, NO development tools${NC}"
echo ""

# Clean previous build
if [ -d "$LITE_DIR" ]; then
    echo -e "${YELLOW}Cleaning previous build...${NC}"
    rm -rf "$LITE_DIR"
fi

# Create lite directory
mkdir -p "$LITE_DIR"
echo -e "${GREEN}Created lite directory: $LITE_DIR${NC}"

# Copy essential files (FOCUS ON MAIN OBJECTIVE ONLY)
echo -e "${BLUE}Copying essential files (main objective only)...${NC}"
for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$PROJECT_ROOT/$file" ]; then
        cp "$PROJECT_ROOT/$file" "$LITE_DIR/"
        echo -e "${GREEN}✓ Copied: $file${NC}"
    else
        echo -e "${RED}✗ Missing: $file${NC}"
        exit 1
    fi
done

# Copy only SDK3 drivers (FOCUS ON MAIN OBJECTIVE ONLY)
echo -e "${BLUE}Copying SDK3 drivers only (main objective only)...${NC}"
if [ -d "$PROJECT_ROOT/drivers/sdk3" ]; then
    mkdir -p "$LITE_DIR/drivers"
    cp -r "$PROJECT_ROOT/drivers/sdk3" "$LITE_DIR/drivers/"
    echo -e "${GREEN}✓ Copied SDK3 drivers${NC}"
else
    echo -e "${RED}✗ SDK3 drivers directory not found${NC}"
    exit 1
fi

# Copy assets (FOCUS ON MAIN OBJECTIVE ONLY)
echo -e "${BLUE}Copying assets (main objective only)...${NC}"
if [ -d "$PROJECT_ROOT/assets" ]; then
    cp -r "$PROJECT_ROOT/assets" "$LITE_DIR/"
    echo -e "${GREEN}✓ Copied assets${NC}"
else
    echo -e "${YELLOW}⚠ No assets directory found${NC}"
fi

# Create minimal README for tuya-light (FOCUS ON MAIN OBJECTIVE ONLY)
echo -e "${BLUE}Creating minimal README (main objective only)...${NC}"
cat > "$LITE_DIR/README.md" << 'EOF'
# ⚡ Tuya Light - Minimal Tuya Zigbee Integration

## 🎯 Main Objective
**Direct installation and production use of Tuya Zigbee devices for Homey**

## 📦 Quick Installation
```bash
# Direct installation (focus on main objective only)
homey app install
homey app validate
```

## 🚫 What's NOT Included (Focus on Main Objective)
- ❌ No dashboard
- ❌ No complementary elements
- ❌ No development tools
- ❌ No documentation beyond this README
- ❌ No workflows
- ❌ No tests
- ❌ No scripts
- ❌ No configuration files

## ✅ What's Included (Main Objective Only)
- ✅ SDK3 drivers for Tuya Zigbee devices
- ✅ Essential app files
- ✅ Minimal assets
- ✅ Direct installation capability
- ✅ Production-ready focus

## 🎯 Philosophy
**Pure focus on the main objective: Tuya Zigbee integration for Homey**

## 📝 License
MIT License - See LICENSE file

---
*Focused on main objective only - No complementary elements*
EOF

echo -e "${GREEN}✓ Created minimal README${NC}"

# Validate for forbidden files (STRICT ENFORCEMENT)
echo -e "${BLUE}Validating for forbidden files (strict enforcement)...${NC}"
FORBIDDEN_FILES_FOUND=$(find "$LITE_DIR" -type f \( -name "*.ps1" -o -name "*.sh" -o -name "*.yml" -o -name "*.yaml" -o -name "*.test.js" -o -name "*.spec.js" -o -name "*.log" -o -name "*.cursor" -o -name "*.tmp" -o -name "*.bak" -o -name "*.md" -o -name "*.txt" -o -name "*.json" -o -name "*.js" -o -name "*.py" -o -name "*.html" -o -name "*.css" -o -name "*.xml" \) 2>/dev/null || true)

if [ ! -z "$FORBIDDEN_FILES_FOUND" ]; then
    echo -e "${RED}❌ ERROR: Found forbidden files in tuya-light (focus on main objective only):${NC}"
    echo "$FORBIDDEN_FILES_FOUND"
    exit 1
fi

# Validate for forbidden directories (STRICT ENFORCEMENT)
echo -e "${BLUE}Validating for forbidden directories (strict enforcement)...${NC}"
for dir in "${FORBIDDEN_DIRS[@]}"; do
    if [ -d "$LITE_DIR/$dir" ]; then
        echo -e "${RED}❌ ERROR: Found forbidden directory: $dir (focus on main objective only)${NC}"
        exit 1
    fi
done

# Count SDK3 drivers
DRIVER_COUNT=$(find "$LITE_DIR/drivers/sdk3" -name "driver.compose.json" | wc -l)
echo -e "${GREEN}✓ Found $DRIVER_COUNT SDK3 drivers${NC}"

# Validate essential files
echo -e "${BLUE}Validating essential files (main objective only)...${NC}"
for file in "${ESSENTIAL_FILES[@]}"; do
    if [ ! -f "$LITE_DIR/$file" ]; then
        echo -e "${RED}❌ ERROR: Missing essential file: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ All essential files present${NC}"

# Generate ZIP backup (FOCUS ON MAIN OBJECTIVE ONLY)
echo -e "${BLUE}Generating ZIP backup (main objective only)...${NC}"
cd "$LITE_DIR"
zip -r "$BACKUP_FILE" . > /dev/null 2>&1
echo -e "${GREEN}✓ Generated backup: $(basename "$BACKUP_FILE")${NC}"

# Final validation (STRICT FOCUS ON MAIN OBJECTIVE)
echo -e "${BLUE}Final validation (strict focus on main objective)...${NC}"

# Check file count (should be minimal)
FILE_COUNT=$(find "$LITE_DIR" -type f | wc -l)
echo -e "${GREEN}✓ Total files: $FILE_COUNT (minimal for main objective)${NC}"

# Check directory count (should be minimal)
DIR_COUNT=$(find "$LITE_DIR" -type d | wc -l)
echo -e "${GREEN}✓ Total directories: $DIR_COUNT (minimal for main objective)${NC}"

# Check size (should be small)
SIZE=$(du -sh "$LITE_DIR" | cut -f1)
echo -e "${GREEN}✓ Total size: $SIZE (minimal for main objective)${NC}"

echo ""
echo -e "${GREEN}🎯 SUCCESS: Tuya Light generated successfully!${NC}"
echo -e "${GREEN}🎯 Focus: Main objective only - No complementary elements${NC}"
echo -e "${GREEN}🎯 Location: $LITE_DIR${NC}"
echo -e "${GREEN}🎯 Backup: $(basename "$BACKUP_FILE")${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "${GREEN}✓ Essential files: ${#ESSENTIAL_FILES[@]}${NC}"
echo -e "${GREEN}✓ SDK3 drivers: $DRIVER_COUNT${NC}"
echo -e "${GREEN}✓ Forbidden files: 0${NC}"
echo -e "${GREEN}✓ Forbidden directories: 0${NC}"
echo -e "${GREEN}✓ Total files: $FILE_COUNT${NC}"
echo -e "${GREEN}✓ Total size: $SIZE${NC}"
echo ""
echo -e "${YELLOW}🎯 Ready for direct installation with: homey app install${NC}"
echo -e "${YELLOW}🎯 Focus maintained: Main objective only${NC}"
echo -e "${YELLOW}🎯 No dashboard, no complementary elements${NC}" 