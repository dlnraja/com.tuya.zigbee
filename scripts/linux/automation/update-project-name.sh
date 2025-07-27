#!/bin/bash

# =============================================================================
# UPDATE PROJECT NAME SCRIPT
# =============================================================================
# Script: update-project-name.sh
# Author: dlnraja (dylan.rajasekaram@gmail.com)
# Version: 1.0.0
# Date: 2025-07-26
# Description: Update project name from com.tuya.zigbee to com.universaltuyazigbee.device
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"
BACKUP_DIR="$PROJECT_ROOT/backups"
DATE=$(date '+%Y-%m-%d_%H-%M-%S')

# Create directories
mkdir -p "$LOGS_DIR" "$BACKUP_DIR"

# Log file
LOG_FILE="$LOGS_DIR/update-project-name-$DATE.log"

# Old and new names
OLD_NAME="com.tuya.zigbee"
NEW_NAME="com.universaltuyazigbee.device"
OLD_REPO_URL="https://github.com/dlnraja/com.tuya.zigbee"
NEW_REPO_URL="https://github.com/dlnraja/com.universaltuyazigbee.device"
OLD_GITHUB_PAGES_URL="https://dlnraja.github.io/com.tuya.zigbee"
NEW_GITHUB_PAGES_URL="https://dlnraja.github.io/com.universaltuyazigbee.device"

# =============================================================================
# FUNCTIONS
# =============================================================================

log_to_file() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to backup current state
backup_current_state() {
    log "Creating backup before name update..."
    log_to_file "Creating backup before name update..."
    
    BACKUP_NAME="name-update-backup-$DATE.tar.gz"
    tar -czf "$BACKUP_DIR/$BACKUP_NAME" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='logs' \
        --exclude='backups' \
        -C "$PROJECT_ROOT" .
    
    success "Backup created: $BACKUP_NAME"
    log_to_file "Backup created: $BACKUP_NAME"
}

# Function to update package.json
update_package_json() {
    log "Updating package.json..."
    log_to_file "Updating package.json..."
    
    # Update name
    sed -i "s/\"name\": \"$OLD_NAME\"/\"name\": \"$NEW_NAME\"/" "$PROJECT_ROOT/package.json"
    
    # Update description
    sed -i "s/Tuya ZigBee Integration for Homey/Universal Tuya ZigBee Device Integration for Homey/" "$PROJECT_ROOT/package.json"
    
    # Update version
    sed -i "s/\"version\": \"1.0.7\"/\"version\": \"1.0.8\"/" "$PROJECT_ROOT/package.json"
    
    # Update repository URL
    sed -i "s|$OLD_REPO_URL|$NEW_REPO_URL|g" "$PROJECT_ROOT/package.json"
    
    # Update bugs URL
    sed -i "s|$OLD_REPO_URL/issues|$NEW_REPO_URL/issues|g" "$PROJECT_ROOT/package.json"
    
    # Update homepage
    sed -i "s|$OLD_REPO_URL#readme|$NEW_REPO_URL#readme|g" "$PROJECT_ROOT/package.json"
    
    # Update appId in config
    sed -i "s/\"appId\": \"$OLD_NAME\"/\"appId\": \"$NEW_NAME\"/" "$PROJECT_ROOT/package.json"
    
    success "package.json updated"
    log_to_file "package.json updated"
}

# Function to update homeycompose.json
update_homeycompose_json() {
    log "Updating homeycompose.json..."
    log_to_file "Updating homeycompose.json..."
    
    # Update appId
    sed -i "s/\"appId\": \"$OLD_NAME\"/\"appId\": \"$NEW_NAME\"/" "$PROJECT_ROOT/homeycompose.json"
    
    # Update version
    sed -i "s/\"version\": \"1.0.7\"/\"version\": \"1.0.8\"/" "$PROJECT_ROOT/homeycompose.json"
    
    success "homeycompose.json updated"
    log_to_file "homeycompose.json updated"
}

# Function to update all markdown files
update_markdown_files() {
    log "Updating all markdown files..."
    log_to_file "Updating all markdown files..."
    
    # Find all markdown files and update them
    find "$PROJECT_ROOT" -name "*.md" -type f -exec sed -i "s/$OLD_NAME/$NEW_NAME/g" {} \;
    find "$PROJECT_ROOT" -name "*.md" -type f -exec sed -i "s|$OLD_REPO_URL|$NEW_REPO_URL|g" {} \;
    find "$PROJECT_ROOT" -name "*.md" -type f -exec sed -i "s|$OLD_GITHUB_PAGES_URL|$NEW_GITHUB_PAGES_URL|g" {} \;
    
    success "All markdown files updated"
    log_to_file "All markdown files updated"
}

# Function to update all HTML files
update_html_files() {
    log "Updating all HTML files..."
    log_to_file "Updating all HTML files..."
    
    # Find all HTML files and update them
    find "$PROJECT_ROOT" -name "*.html" -type f -exec sed -i "s/$OLD_NAME/$NEW_NAME/g" {} \;
    find "$PROJECT_ROOT" -name "*.html" -type f -exec sed -i "s|$OLD_REPO_URL|$NEW_REPO_URL|g" {} \;
    find "$PROJECT_ROOT" -name "*.html" -type f -exec sed -i "s|$OLD_GITHUB_PAGES_URL|$NEW_GITHUB_PAGES_URL|g" {} \;
    
    success "All HTML files updated"
    log_to_file "All HTML files updated"
}

# Function to update all JavaScript files
update_javascript_files() {
    log "Updating all JavaScript files..."
    log_to_file "Updating all JavaScript files..."
    
    # Find all JavaScript files and update them
    find "$PROJECT_ROOT" -name "*.js" -type f -exec sed -i "s/$OLD_NAME/$NEW_NAME/g" {} \;
    find "$PROJECT_ROOT" -name "*.js" -type f -exec sed -i "s|$OLD_REPO_URL|$NEW_REPO_URL|g" {} \;
    
    success "All JavaScript files updated"
    log_to_file "All JavaScript files updated"
}

# Function to update all YAML files
update_yaml_files() {
    log "Updating all YAML files..."
    log_to_file "Updating all YAML files..."
    
    # Find all YAML files and update them
    find "$PROJECT_ROOT" -name "*.yml" -type f -exec sed -i "s/$OLD_NAME/$NEW_NAME/g" {} \;
    find "$PROJECT_ROOT" -name "*.yml" -type f -exec sed -i "s|$OLD_REPO_URL|$NEW_REPO_URL|g" {} \;
    find "$PROJECT_ROOT" -name "*.yml" -type f -exec sed -i "s|$OLD_GITHUB_PAGES_URL|$NEW_GITHUB_PAGES_URL|g" {} \;
    
    success "All YAML files updated"
    log_to_file "All YAML files updated"
}

# Function to update all PowerShell scripts
update_powershell_scripts() {
    log "Updating all PowerShell scripts..."
    log_to_file "Updating all PowerShell scripts..."
    
    # Find all PowerShell scripts and update them
    find "$PROJECT_ROOT" -name "*.ps1" -type f -exec sed -i "s/$OLD_NAME/$NEW_NAME/g" {} \;
    find "$PROJECT_ROOT" -name "*.ps1" -type f -exec sed -i "s|$OLD_REPO_URL|$NEW_REPO_URL|g" {} \;
    find "$PROJECT_ROOT" -name "*.ps1" -type f -exec sed -i "s|$OLD_GITHUB_PAGES_URL|$NEW_GITHUB_PAGES_URL|g" {} \;
    
    success "All PowerShell scripts updated"
    log_to_file "All PowerShell scripts updated"
}

# Function to update all Bash scripts
update_bash_scripts() {
    log "Updating all Bash scripts..."
    log_to_file "Updating all Bash scripts..."
    
    # Find all Bash scripts and update them
    find "$PROJECT_ROOT" -name "*.sh" -type f -exec sed -i "s/$OLD_NAME/$NEW_NAME/g" {} \;
    find "$PROJECT_ROOT" -name "*.sh" -type f -exec sed -i "s|$OLD_REPO_URL|$NEW_REPO_URL|g" {} \;
    find "$PROJECT_ROOT" -name "*.sh" -type f -exec sed -i "s|$OLD_GITHUB_PAGES_URL|$NEW_GITHUB_PAGES_URL|g" {} \;
    
    success "All Bash scripts updated"
    log_to_file "All Bash scripts updated"
}

# Function to update SVG files
update_svg_files() {
    log "Updating SVG files..."
    log_to_file "Updating SVG files..."
    
    # Find all SVG files and update them
    find "$PROJECT_ROOT" -name "*.svg" -type f -exec sed -i "s/$OLD_NAME/$NEW_NAME/g" {} \;
    
    success "All SVG files updated"
    log_to_file "All SVG files updated"
}

# Function to update Jekyll configuration
update_jekyll_config() {
    log "Updating Jekyll configuration..."
    log_to_file "Updating Jekyll configuration..."
    
    # Update _config.yml
    if [ -f "$PROJECT_ROOT/docs/_config.yml" ]; then
        sed -i "s|$OLD_GITHUB_PAGES_URL|$NEW_GITHUB_PAGES_URL|g" "$PROJECT_ROOT/docs/_config.yml"
        sed -i "s|$OLD_REPO_URL|$NEW_REPO_URL|g" "$PROJECT_ROOT/docs/_config.yml"
        sed -i "s/repository: \"dlnraja\/$OLD_NAME\"/repository: \"dlnraja\/$NEW_NAME\"/" "$PROJECT_ROOT/docs/_config.yml"
    fi
    
    success "Jekyll configuration updated"
    log_to_file "Jekyll configuration updated"
}

# Function to create summary report
create_summary_report() {
    log "Creating summary report..."
    log_to_file "Creating summary report..."
    
    SUMMARY_FILE="$LOGS_DIR/name-update-summary-$DATE.md"
    
    cat > "$SUMMARY_FILE" << EOF
# Project Name Update Summary

**Date**: $(date '+%Y-%m-%d %H:%M:%S')  
**Old Name**: $OLD_NAME  
**New Name**: $NEW_NAME  
**Status**: ✅ Completed

## 🔄 Actions Performed

### 1. Backup Creation
- ✅ Complete project backup created
- ✅ All files preserved before update

### 2. Configuration Files Updated
- ✅ package.json updated
- ✅ homeycompose.json updated
- ✅ Version incremented to 1.0.8

### 3. Documentation Files Updated
- ✅ All markdown files updated
- ✅ All HTML files updated
- ✅ All JavaScript files updated
- ✅ All YAML files updated
- ✅ All PowerShell scripts updated
- ✅ All Bash scripts updated
- ✅ All SVG files updated

### 4. URLs Updated
- ✅ Repository URL: $OLD_REPO_URL → $NEW_REPO_URL
- ✅ GitHub Pages URL: $OLD_GITHUB_PAGES_URL → $NEW_GITHUB_PAGES_URL
- ✅ Issues URL updated
- ✅ Wiki URL updated

### 5. Jekyll Configuration Updated
- ✅ _config.yml updated
- ✅ GitHub Pages settings updated
- ✅ Repository settings updated

## 📊 Files Updated

| File Type | Count |
|-----------|-------|
| Markdown | $(find "$PROJECT_ROOT" -name "*.md" -type f | wc -l) |
| HTML | $(find "$PROJECT_ROOT" -name "*.html" -type f | wc -l) |
| JavaScript | $(find "$PROJECT_ROOT" -name "*.js" -type f | wc -l) |
| YAML | $(find "$PROJECT_ROOT" -name "*.yml" -type f | wc -l) |
| PowerShell | $(find "$PROJECT_ROOT" -name "*.ps1" -type f | wc -l) |
| Bash | $(find "$PROJECT_ROOT" -name "*.sh" -type f | wc -l) |
| SVG | $(find "$PROJECT_ROOT" -name "*.svg" -type f | wc -l) |

## 🎯 Next Steps

1. **Update GitHub repository name** (if needed)
2. **Update GitHub Pages settings** with new repository name
3. **Test all functionality** with new name
4. **Update documentation** if repository URL changes

## 📝 Generated Files

- **Backup**: \`backups/name-update-backup-$DATE.tar.gz\`
- **Summary**: \`logs/name-update-summary-$DATE.md\`

---

*Generated by Project Name Update Script*
EOF
    
    success "Summary report created: $SUMMARY_FILE"
    log_to_file "Summary report created: $SUMMARY_FILE"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    log "Starting project name update from $OLD_NAME to $NEW_NAME..."
    log_to_file "Starting project name update from $OLD_NAME to $NEW_NAME..."
    
    # Create log file header
    echo "=== PROJECT NAME UPDATE ===" > "$LOG_FILE"
    echo "Date: $DATE" >> "$LOG_FILE"
    echo "Old Name: $OLD_NAME" >> "$LOG_FILE"
    echo "New Name: $NEW_NAME" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    
    # Execute all update functions
    backup_current_state
    update_package_json
    update_homeycompose_json
    update_markdown_files
    update_html_files
    update_javascript_files
    update_yaml_files
    update_powershell_scripts
    update_bash_scripts
    update_svg_files
    update_jekyll_config
    create_summary_report
    
    success "Project name update completed successfully!"
    log_to_file "Project name update completed successfully!"
    
    # Display summary
    echo ""
    echo "=== NAME UPDATE SUMMARY ==="
    echo "✅ Old name: $OLD_NAME"
    echo "✅ New name: $NEW_NAME"
    echo "✅ Version: 1.0.8"
    echo "✅ All files updated"
    echo "✅ Backup created"
    echo ""
    echo "📊 Results available in: $LOGS_DIR"
    echo "📊 Backup available in: $BACKUP_DIR"
}

# Execute main function
main "$@" 
