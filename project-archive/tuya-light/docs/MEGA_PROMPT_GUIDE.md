# 🧠 Mega-Prompt Guide - Tuya Zigbee Project

## 📝 Introduction

This document serves as a comprehensive guide for the Tuya Zigbee project, providing a detailed, step-by-step plan for rebuilding, fixing, and enriching the project. The guide is designed to be used with AI assistants like Cursor to ensure consistent and high-quality contributions.

## 🎯 Project Overview

- **Repository**: `dlnraja/com.tuya.zigbee`
- **Type**: Homey App for Tuya Zigbee Devices
- **Languages**: English (primary), French, Dutch, Tamil
- **Status**: Active Development

## 🔄 Workflow Rules

1. **Language Priority**: English first, then French for all documentation and commits
2. **Commit Messages**: Bilingual format (English + French)
3. **Code Style**: Follow existing ESLint and Prettier configurations
4. **Branching**: Use feature branches from `master`
5. **Testing**: All changes must include relevant tests

## 🏗️ Project Structure

```
.
├── .github/                 # GitHub workflows and templates
├── drivers/                # Device drivers
├── scripts/                # Automation scripts
├── src/                    # Core application code
│   ├── services/           # Business logic
│   ├── utils/              # Utility functions
│   └── config/             # Configuration files
├── tests/                  # Test files
├── docs/                   # Documentation
├── data/                   # Generated data files
└── tuya-light/             # Lite version of the project
```

## 🔄 Development Workflow

### 1. Setup Environment
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
```

### 2. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes
- Follow the coding standards
- Add tests for new features
- Update documentation

### 4. Run Tests
```bash
npm test
npm run lint
```

### 5. Commit Changes
```bash
git add .
git commit -m "feat(scope): add new feature

Ajout d'une nouvelle fonctionnalité"
```

### 6. Push Changes
```bash
git push origin feature/your-feature-name
```

## 📊 Device Matrix Management

The device matrix is automatically updated via GitHub Actions. To update it manually:

```bash
node scripts/update_device_matrix.mjs
```

## 🌍 Multilingual Support

All documentation should be available in:
1. English (primary)
2. French
3. Dutch
4. Tamil

## 🔄 CI/CD Pipeline

The project uses GitHub Actions for:
- Automated testing
- Code quality checks
- Monthly device matrix updates
- Documentation generation

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📅 Maintenance Schedule

- **Daily**: Check for critical issues
- **Weekly**: Review and merge PRs
- **Monthly**: Update device matrix and dependencies

## 📚 Additional Resources

- [Homey Developer Documentation](https://developers.athom.com/)
- [Zigbee2MQTT Device Database](https://www.zigbee2mqtt.io/)
- [Blakadder's Zigbee Database](https://github.com/blakadder/zigbee)

## 🚀 Quick Start for New Developers

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Start developing!

## 🔍 Code Review Guidelines

- Check for proper error handling
- Verify test coverage
- Ensure documentation is updated
- Validate multilingual support

## 📈 Performance Monitoring

- Monitor memory usage
- Track response times
- Log important metrics

## 🔒 Security Best Practices

- Never commit sensitive data
- Use environment variables for configuration
- Regularly update dependencies
- Follow the principle of least privilege

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
