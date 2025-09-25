# Tuya Zigbee Development Guide

This guide provides instructions for setting up the development environment and working with the Tuya Zigbee project.

## Prerequisites

1. **Node.js** (v18 or higher)
   - Download and install from [nodejs.org](https://nodejs.org/)
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **Homey CLI**
   ```bash
   npm install -g homey
   ```
   - Verify installation:
     ```bash
     homey --version
     ```

3. **Git**
   - Download and install from [git-scm.com](https://git-scm.com/)
   - Verify installation:
     ```bash
     git --version
     ```

## Project Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/com.tuya.zigbee.git
   cd com.tuya.zigbee
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify setup**
   ```bash
   node scripts/check-environment.js
   ```

## Development Workflow

### Running the app
```bash
npm start
```

### Building the app
```bash
npm run build
```

### Running tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

### Linting and formatting
```bash
# Fix linting issues
npm run lint

# Format code
npm run format
```

### Validating the project
```bash
# Run validation and fix common issues
npm run validate

# Run verification only
npm run verify

# Fix common issues
npm run fix
```

## Project Structure

```
com.tuya.zigbee/
├── drivers/                  # Device drivers
│   ├── _templates/          # Driver templates
│   └── ...                 # Device-specific driver directories
├── common/                  # Shared code
├── scripts/                 # Build and utility scripts
├── test/                    # Test files
├── app.js                  # Main application file
├── app.json                # Homey app configuration
└── package.json            # Project dependencies and scripts
```

## Creating a New Driver

1. **Create a new driver directory**
   ```bash
   mkdir -p drivers/your-device-id
   ```

2. **Copy template files**
   ```bash
   cp -r drivers/_templates/* drivers/your-device-id/
   ```

3. **Update driver configuration**
   - Edit `drivers/your-device-id/driver.compose.json`
   - Update `device.js` with your device logic

4. **Add driver to app.json**
   - Add an entry to the `drivers` array in `app.json`

## Troubleshooting

### Common Issues

1. **Node.js version mismatch**
   - Ensure you're using Node.js v18 or higher
   - Use `nvm` (Node Version Manager) to manage multiple Node.js versions

2. **Missing dependencies**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Homey CLI not found**
   ```bash
   npm install -g homey
   ```

4. **Permission issues**
   - On Linux/macOS, you might need to use `sudo` for global installations
   - Alternatively, fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and lint your code
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
