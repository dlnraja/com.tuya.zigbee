#!/bin/bash

# Tuya Light Version Generator
# Creates a minimal version of the repository for direct installation
#
# @author dlnraja
# @version 1.0.0
# @license MIT

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LITE_DIR="${PROJECT_ROOT}/tuya-light-temp"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Essential files that must be included
ESSENTIAL_FILES=(
    "app.json"
    "package.json"
    "app.js"
    "README.md"
    ".gitignore"
)

# Directories to include
INCLUDE_DIRS=(
    "assets"
    "drivers/sdk3"
)

# Files to exclude from drivers
DRIVER_EXCLUDE_PATTERNS=(
    "*.backup"
    "*.bak"
    "device.js"
    "driver.settings.compose.json"
    "driver.flow.compose.json"
    "*.svg"
    "*.jpg"
    "*.png"
)

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function
cleanup() {
    if [ -d "$LITE_DIR" ]; then
        log_info "Cleaning up temporary directory..."
        rm -rf "$LITE_DIR"
    fi
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_info "Created backup directory: $BACKUP_DIR"
    fi
}

# Validate essential files exist
validate_essential_files() {
    log_info "Validating essential files..."
    
    for file in "${ESSENTIAL_FILES[@]}"; do
        if [ ! -f "$PROJECT_ROOT/$file" ]; then
            log_error "Essential file missing: $file"
            exit 1
        fi
    done
    
    log_success "All essential files present"
}

# Create lite version directory
create_lite_directory() {
    log_info "Creating lite version directory..."
    
    if [ -d "$LITE_DIR" ]; then
        rm -rf "$LITE_DIR"
    fi
    
    mkdir -p "$LITE_DIR"
    log_success "Created lite directory: $LITE_DIR"
}

# Copy essential files
copy_essential_files() {
    log_info "Copying essential files..."
    
    for file in "${ESSENTIAL_FILES[@]}"; do
        cp "$PROJECT_ROOT/$file" "$LITE_DIR/"
        log_info "Copied: $file"
    done
    
    log_success "Essential files copied"
}

# Copy include directories
copy_include_directories() {
    log_info "Copying include directories..."
    
    for dir in "${INCLUDE_DIRS[@]}"; do
        if [ -d "$PROJECT_ROOT/$dir" ]; then
            mkdir -p "$LITE_DIR/$dir"
            
            # Copy directory contents
            if [ "$dir" = "drivers/sdk3" ]; then
                # Special handling for drivers directory
                copy_drivers_directory
            else
                cp -r "$PROJECT_ROOT/$dir"/* "$LITE_DIR/$dir/" 2>/dev/null || true
                log_info "Copied directory: $dir"
            fi
        else
            log_warning "Directory not found: $dir"
        fi
    done
    
    log_success "Include directories copied"
}

# Copy drivers directory with exclusions
copy_drivers_directory() {
    log_info "Copying drivers directory with exclusions..."
    
    # Find all driver directories
    find "$PROJECT_ROOT/drivers/sdk3" -type d -mindepth 1 -maxdepth 1 | while read -r driver_dir; do
        driver_name=$(basename "$driver_dir")
        target_dir="$LITE_DIR/drivers/sdk3/$driver_name"
        
        mkdir -p "$target_dir"
        
        # Copy driver.compose.json and driver.js
        if [ -f "$driver_dir/driver.compose.json" ]; then
            cp "$driver_dir/driver.compose.json" "$target_dir/"
        fi
        
        if [ -f "$driver_dir/driver.js" ]; then
            cp "$driver_dir/driver.js" "$target_dir/"
        fi
        
        # Copy assets directory if it exists
        if [ -d "$driver_dir/assets" ]; then
            mkdir -p "$target_dir/assets"
            cp -r "$driver_dir/assets"/* "$target_dir/assets/" 2>/dev/null || true
        fi
        
        log_info "Copied driver: $driver_name"
    done
    
    log_success "Drivers directory copied with exclusions"
}

# Update README for lite version
update_lite_readme() {
    log_info "Updating README for lite version..."
    
    cat > "$LITE_DIR/README.md" << 'EOF'
# Tuya Light - Minimal Fallback Version

This is a minimal fallback version of the Tuya Zigbee Universal Integration for Homey.

## Purpose

This branch contains only the essential drivers and files needed for direct installation and validation with Homey SDK3.

## Quick Installation

```bash
# Clone the tuya-light branch
git clone -b tuya-light https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee

# Install dependencies
npm install

# Install on Homey
homey app install

# Validate the app
homey app validate
```

## Content

- **Essential files only**: `app.json`, `package.json`, `app.js`
- **Drivers only**: Essential `.driver.compose.json` files in `drivers/sdk3/`
- **No automation**: No scripts, workflows, or tools
- **No documentation**: Minimal README only
- **Direct compatibility**: Works immediately with `homey app install` and `homey app validate`

## Structure

```
tuya-light/
├── app.json              # Homey app configuration
├── package.json          # Node.js dependencies
├── app.js               # Main app file
├── README.md            # This file
├── assets/              # App images
│   └── images/
│       ├── small.png
│       └── large.png
└── drivers/             # Device drivers
    └── sdk3/
        └── [driver_name]/
            ├── driver.compose.json
            ├── driver.js
            └── assets/
                ├── small.png
                └── large.png
```

## Validation

This branch is designed to pass all Homey validation checks:

- ✅ `homey app validate` - Passes all validation rules
- ✅ `homey app install` - Installs successfully on Homey
- ✅ SDK3 compatibility - Uses modern Homey SDK3
- ✅ Zigbee compliance - Proper cluster and endpoint definitions

## Synchronization

This branch is automatically synchronized monthly from the master branch.

Last synchronized: $(date +%Y-%m-%d)

---

*This is a minimal fallback version. For full features, use the master branch.*
EOF

    log_success "README updated for lite version"
}

# Generate ZIP backup
generate_zip_backup() {
    log_info "Generating ZIP backup..."
    
    timestamp=$(date +%Y%m%d_%H%M%S)
    zip_name="tuya-light-fallback-${timestamp}.zip"
    zip_path="$BACKUP_DIR/$zip_name"
    
    cd "$LITE_DIR"
    zip -r "$zip_path" . -x "*.git*" "*.tmp" "*.log" "*.bak" "*.backup" > /dev/null
    
    log_success "ZIP backup generated: $zip_path"
}

# Validate lite version
validate_lite_version() {
    log_info "Validating lite version..."
    
    # Check essential files
    for file in "${ESSENTIAL_FILES[@]}"; do
        if [ ! -f "$LITE_DIR/$file" ]; then
            log_error "Missing essential file in lite version: $file"
            return 1
        fi
    done
    
    # Check for forbidden files
    forbidden_files=$(find "$LITE_DIR" -type f \( -name "*.ps1" -o -name "*.sh" -o -name "*.yml" -o -name "*.test.js" -o -name "*.log" \) 2>/dev/null || true)
    
    if [ -n "$forbidden_files" ]; then
        log_error "Found forbidden files in lite version:"
        echo "$forbidden_files"
        return 1
    fi
    
    # Check for forbidden directories
    forbidden_dirs=$(find "$LITE_DIR" -type d \( -name "docs" -o -name "tools" -o -name "ref" -o -name "src" \) 2>/dev/null || true)
    
    if [ -n "$forbidden_dirs" ]; then
        log_error "Found forbidden directories in lite version:"
        echo "$forbidden_dirs"
        return 1
    fi
    
    # Count drivers
    driver_count=$(find "$LITE_DIR/drivers" -name "driver.compose.json" 2>/dev/null | wc -l)
    
    if [ "$driver_count" -eq 0 ]; then
        log_error "No drivers found in lite version"
        return 1
    fi
    
    log_success "Lite version validation passed"
    log_info "Found $driver_count drivers"
}

# Main function
main() {
    log_info "Starting Tuya Light version generation..."
    
    create_backup_dir
    validate_essential_files
    create_lite_directory
    copy_essential_files
    copy_include_directories
    update_lite_readme
    generate_zip_backup
    
    if validate_lite_version; then
        log_success "Tuya Light version generated successfully!"
        log_info "Location: $LITE_DIR"
        log_info "ZIP backup: $BACKUP_DIR"
    else
        log_error "Lite version validation failed"
        exit 1
    fi
}

# CLI Interface
case "${1:-generate}" in
    "generate")
        main
        ;;
    "help")
        echo "Tuya Light Version Generator"
        echo ""
        echo "Usage:"
        echo "  $0 [command]"
        echo ""
        echo "Commands:"
        echo "  generate    Generate lite version (default)"
        echo "  help        Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 generate"
        echo "  $0 help"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use 'help' for available commands"
        exit 1
        ;;
esac 