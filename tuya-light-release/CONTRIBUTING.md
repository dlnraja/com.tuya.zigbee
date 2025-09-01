# Contributing to Tuya Zigbee Universal

Thank you for your interest in contributing to the Tuya Zigbee Universal project! This document provides guidelines for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Adding New Devices](#adding-new-devices)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Translation Guidelines](#translation-guidelines)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/com.tuya.zigbee.git`
3. Install dependencies: `npm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Adding New Devices

### 1. Create a New Driver

Use the template from `/templates/driver-template` to create a new driver. Copy the template to the appropriate directory under `drivers/`.

### 2. Update Device List

Add your device to the appropriate section in `DEVICES.md` with the following information:

```markdown
### Device Name
- **Manufacturer**: [Manufacturer Name]
- **Model**: [Model Number]
- **Type**: [Device Type]
- **Supported**: ✅ Yes / ❌ No / ⚠️ Partial
- **Notes**: Any additional information
- **Tested By**: [Your GitHub Username]
- **Tested On**: [Date]
```

### 3. Add Device Images

Add device images in the following formats:
- `small.png` (100x100px)
- `large.png` (500x500px)
- `icon.svg` (vector format)

## Coding Standards

### JavaScript
- Use ES6+ syntax
- Use `async/await` for asynchronous operations
- Follow the existing code style (2 spaces, no semicolons)
- Add JSDoc comments for all functions

### Translations
- All user-facing strings must be translated to all supported languages
- Use the translation system provided by Homey
- Keep translations in the respective language files

## Pull Request Process

1. Ensure all tests pass
2. Update the README.md with details of changes if needed
3. Update the CHANGELOG.md with a summary of changes
4. Submit the pull request with a clear description of the changes

## Reporting Issues

When reporting issues, please include:
- Device model and manufacturer
- Firmware version
- Steps to reproduce the issue
- Logs (if applicable)
- Screenshots (if applicable)

## Translation Guidelines

1. All user-facing strings must be translated to:
   - English (en)
   - French (fr)
   - Dutch (nl)
   - Tamil (ta)

2. Keep the translations:
   - Clear and concise
   - Consistent with existing translations
   - Culturally appropriate

3. Use the following format for translation files:

```json
{
  "app": {
    "name": {
      "en": "Tuya Zigbee Universal",
      "fr": "Tuya Zigbee Universel",
      "nl": "Tuya Zigbee Universeel",
      "ta": "Tuya Zigbee உலகளாவிய"
    }
  }
}
```

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
