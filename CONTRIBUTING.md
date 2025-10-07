# Contributing to Universal Tuya Zigbee Device App

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🎯 How to Contribute

### Reporting Bugs

1. **Check existing issues** - Your bug might already be reported
2. **Create detailed report** including:
   - Device model and manufacturer
   - Homey diagnostic report
   - Expected vs actual behavior
   - Steps to reproduce

### Requesting Features

1. **Search existing requests** - Avoid duplicates
2. **Describe the use case** - Why is this feature needed?
3. **Provide examples** - Help us understand your needs

### Adding Device Support

To add support for a new device:

1. **Gather Information:**
   - Manufacturer name (e.g., _TZ3000_xxxxx)
   - Product ID (e.g., TS0001)
   - Device capabilities
   - Zigbee handshake data (if available)

2. **Submit via GitHub Issue:**
   - Use "New Device Request" template
   - Include all gathered information
   - Attach diagnostic reports if possible

3. **Testing:**
   - We'll add the device
   - You test and provide feedback
   - Iteration until working correctly

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes:**
   - Follow existing code style
   - Test thoroughly
   - Update documentation

4. **Commit with clear messages:**
   ```bash
   git commit -m "feat: Add support for XYZ device"
   ```

5. **Push and create Pull Request:**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Coding Standards

### File Structure
- Drivers in `drivers/`
- Scripts in `scripts/`
- Documentation in `reports/`

### Naming Conventions
- Drivers: Function-based (e.g., `smart_switch_1gang_ac`)
- Scripts: UPPER_SNAKE_CASE for main scripts
- Variables: camelCase for JavaScript

### Documentation
- All new features must be documented
- Update README.md if adding major features
- Include comments in complex code

## 🧪 Testing

### Before Submitting PR

1. **Validation:**
   ```bash
   homey app validate --level=publish
   ```

2. **Build:**
   ```bash
   homey app build
   ```

3. **Test on real device:**
   - Install on your Homey
   - Test all affected functionality
   - Verify no regressions

## 📋 Pull Request Process

1. **Update documentation** - README, CHANGELOG, etc.
2. **Ensure all tests pass** - Validation and build
3. **Describe your changes** - Clear PR description
4. **Link related issues** - Reference issue numbers
5. **Wait for review** - Maintainer will review and provide feedback

## 🔄 Review Process

- PRs reviewed within 48-72 hours
- Feedback provided for improvements
- Approved PRs merged to master
- Included in next release

## 💡 Getting Help

- **GitHub Discussions** - Ask questions
- **Homey Forum** - Community support
- **GitHub Issues** - Report bugs

## 🎖️ Recognition

Contributors will be:
- Listed in CHANGELOG
- Mentioned in release notes
- Credited in app.json (for major contributions)

## 📜 Code of Conduct

### Our Pledge
- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the community

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or insulting comments
- Personal attacks

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to the Homey community! 🙏**
