# Assets Directory

**Organization**: Homey SDK3 Standard Structure

## Structure

```
assets/
├── images/              # App images (PNG only)
│   ├── small.png       # 250x175px - App icon small
│   ├── large.png       # 500x350px - App icon large
│   └── xlarge.png      # 1000x700px - App icon extra large
│
├── icons/              # Reusable icons and badges
│   ├── power-ac.svg           # AC power badge
│   ├── power-battery.svg      # Battery power badge
│   ├── power-battery-low.svg  # Low battery badge
│   └── placeholder.svg        # Generic placeholder
│
└── templates/          # Source SVG files (not used in app)
    ├── icon.svg               # Source for app icon
    ├── small.svg              # Source template
    ├── large.svg              # Source template
    ├── xlarge.svg             # Source template
    └── [category]-icon.svg    # Category-specific templates
```

## Guidelines

### App Images (`images/`)
- **Format**: PNG only (optimized)
- **Purpose**: Main app icons in Homey App Store
- **Sizes**:
  - small: 250x175px (max 50KB)
  - large: 500x350px (max 100KB)
  - xlarge: 1000x700px (max 200KB)

### Icons (`icons/`)
- **Format**: SVG preferred (small file size)
- **Purpose**: Reusable badges and overlays
- **Usage**: Energy badges on driver images

### Templates (`templates/`)
- **Format**: SVG source files
- **Purpose**: Design source, not used in production
- **Usage**: Generate PNG from these

## Energy Badges

All driver images should have energy badge in **bottom-right corner**:
- Battery-powered devices: `icons/power-battery.svg`
- AC-powered devices: `icons/power-ac.svg`
- Low battery warning: `icons/power-battery-low.svg`

## Optimization

### PNG Files
Run optimization script to reduce file sizes:
```bash
node scripts/automation/OPTIMIZE_PNG_IMAGES.js
pwsh scripts/optimize-images.ps1
```

### SVG to PNG Conversion
Use ImageMagick to convert SVG templates to PNG:
```bash
magick convert template.svg -resize 500x500 output.png
magick convert template.svg -define png:compression-level=9 output.png
```

## Driver Images

Driver images are stored in each driver's `assets/` folder:
```
drivers/[driver-name]/
└── assets/
    ├── small.png      # 75x75px (max 10KB)
    └── large.png      # 500x500px (max 50KB)
```

### Adding Energy Badge to Driver Image

Use overlay script:
```bash
node scripts/automation/ADD_ENERGY_BADGES.js
```

Or manually with ImageMagick:
```bash
magick composite -gravity SouthEast -geometry +10+10 \
  assets/icons/power-battery.svg \
  drivers/[driver]/assets/large.png \
  drivers/[driver]/assets/large.png
```

## Validation

Check all image paths and sizes:
```bash
node scripts/automation/VERIFY_AND_FIX_IMAGE_PATHS.js
```

---

**Maintainer**: Dylan (dlnraja)  
**Last Updated**: 2025-10-13  
**Version**: v2.15.85
