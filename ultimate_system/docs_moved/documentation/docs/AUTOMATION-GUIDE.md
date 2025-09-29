# Tuya Zigbee SDK3 - Automation Guide

This document outlines the automation processes in place for the Tuya Zigbee SDK3 project, including monthly driver enrichment, testing, and validation.

## 📋 Table of Contents
- [Automation Overview](#-automation-overview)
- [Monthly Enrichment Process](#-monthly-enrichment-process)
- [Manual Execution](#-manual-execution)
- [Adding New Drivers](#-adding-new-drivers)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

## 🤖 Automation Overview

The project includes automated processes to:
- **Monthly** collect updates from source repositories
- Analyze and enrich existing drivers
- Generate placeholders for missing drivers
- Run tests and generate coverage reports
- Create pull requests with updates

## 🔄 Monthly Enrichment Process

Runs automatically on the 1st of each month via GitHub Actions:

1. **Source Collection**
   - Clones/updates source repositories
   - Extracts driver information
   - Identifies new devices and features

2. **Driver Analysis**
   - Scans for Tuya/Zigbee specific code
   - Identifies missing functionality
   - Checks for updates in dependencies

3. **Enrichment**
   - Updates existing drivers with new features
   - Creates placeholders for missing drivers
   - Updates documentation

4. **Testing & Validation**
   - Runs unit and integration tests
   - Generates coverage reports
   - Validates driver configurations

5. **Pull Request**
   - Creates a PR with all changes
   - Includes detailed changelog
   - Triggers CI/CD pipeline

## 🖥️ Manual Execution

To run the enrichment process manually:

```bash
# Install dependencies
npm ci

# Run the enrichment script
node tools/analyze-and-enrich-drivers.js

# Run tests and generate coverage
npm run test:coverage
```

## ➕ Adding New Drivers

1. Place new drivers in the `drivers/` directory
2. Follow the naming convention: `tuya-{model}`
3. Include these required files:
   - `device.js` - Device implementation
   - `driver.js` - Driver implementation
   - `driver.compose.json` - Driver metadata

Example structure:
```
drivers/
  tuya-ts011f/
    device.js
    driver.js
    driver.compose.json
    assets/
      images/
        large.png
        small.png
```

## 🐛 Troubleshooting

### Common Issues

1. **Missing Dependencies**
   ```bash
   npm ci
   ```

2. **Test Failures**
   Check the test output and logs in `test-results/`

3. **Coverage Issues**
   Review the coverage report at `coverage/`

4. **Enrichment Errors**
   Check the log file: `enrichment-log.txt`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure coverage remains high
5. Submit a pull request

### Code Style
- Follow existing code style
- Add JSDoc comments for all functions
- Include tests for new features
- Update documentation

## 📊 Monitoring

- **Test Coverage**: Check `coverage/` directory
- **Build Status**: View GitHub Actions
- **Enrichment Logs**: `enrichment-log.txt`

## 🔒 Security

- Never commit sensitive information
- Use environment variables for secret: "REDACTED"
- Follow security best practices in code

---

*Last updated: $(date +'%Y-%m-%d')*
