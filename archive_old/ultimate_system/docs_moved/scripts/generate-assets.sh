
#!/bin/bash
# Generate missing driver images

DRIVERS_DIR="C:\Users\HP\Desktop\tuya_repair\drivers"

# Function to create placeholder images
create_images() {
  local driver_path="$1"
  local driver_name="$2"
  
  mkdir -p "$driver_path/assets/images"
  
  # Create small.png (75x75)
  if [ ! -f "$driver_path/assets/images/small.png" ]; then
    echo "Creating small.png for $driver_name"
    convert -size 75x75 xc:transparent \
      -fill '#FF6B35' \
      -draw "circle 37,37 37,5" \
      -fill white \
      -pointsize 20 \
      -gravity center \
      -annotate +0+0 "Z" \
      "$driver_path/assets/images/small.png" 2>/dev/null || true
  fi
  
  # Create large.png (500x500)
  if [ ! -f "$driver_path/assets/images/large.png" ]; then
    echo "Creating large.png for $driver_name"
    convert -size 500x500 xc:transparent \
      -fill '#FF6B35' \
      -draw "circle 250,250 250,50" \
      -fill white \
      -pointsize 120 \
      -gravity center \
      -annotate +0+0 "Z" \
      "$driver_path/assets/images/large.png" 2>/dev/null || true
  fi
  
  # Create icon.svg if missing
  if [ ! -f "$driver_path/assets/icon.svg" ]; then
    echo "Creating icon.svg for $driver_name"
    cat > "$driver_path/assets/icon.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="#FF6B35"/>
  <text x="50" y="65" font-family="Arial, sans-serif" font-size="40" font-weight="bold" text-anchor="middle" fill="white">Z</text>
</svg>
EOF
  fi
}

# Process all drivers
for driver_dir in "$DRIVERS_DIR"/*; do
  if [ -d "$driver_dir" ]; then
    driver_name=$(basename "$driver_dir")
    create_images "$driver_dir" "$driver_name"
  fi
done

echo "✅ Asset generation completed"
