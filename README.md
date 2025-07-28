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
        └── wall_switch_1_gang/
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

Last synchronized: 2025-07-28

---

*This is a minimal fallback version. For full features, use the master branch.* 