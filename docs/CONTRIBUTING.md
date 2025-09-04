# Contributing to Universal Tuya Zigbee

Thank you for your interest in contributing to the Universal Tuya Zigbee project! This document outlines the process for contributing to our project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)
- [Code Style and Standards](#code-style-and-standards)
- [Localization](#localization)

## Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs
- Check if the bug has already been reported in the [Issues](https://github.com/dlnraja/com.tuya.zigbee/issues) section.
- If not, create a new issue with a clear title and description.
- Include steps to reproduce the issue and any relevant logs.

### Suggesting Enhancements
- Open an issue with the `enhancement` label.
- Clearly describe the enhancement and why it would be useful.
- Include any relevant examples or references.

### Pull Requests
1. Fork the repository and create a new branch for your feature or bugfix.
2. Ensure your code follows our coding standards.
3. Add or update tests as needed.
4. Update the documentation if necessary.
5. Submit a pull request with a clear description of the changes.

## Development Process

1. **Fork** the repository on GitHub
2. **Clone** the project to your own machine
3. **Commit** changes to your own branch
4. **Push** your work back up to your fork
5. Submit a **Pull Request** so that we can review your changes

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Each commit message consists of a **type**, a **scope**, and a **subject**:

```
<type>(<scope>): <subject>
<BLANK LINE>
[optional body]
<BLANK LINE>
[optional footer(s)]
```

### Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries

### Examples
```
feat(drivers): add support for TS011F plug

- Added new driver for TS011F smart plug
- Implemented power monitoring capability
- Added device pairing flow

Closes #123
```

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2. Update the README.md with details of changes to the interface, including new environment variables, exposed ports, useful file locations, and container parameters.
3. Increase the version numbers in any examples files and the README.md to the new version that this Pull Request would represent. The versioning scheme we use is [SemVer](http://semver.org/).
4. You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

## Code Style and Standards

### JavaScript/Node.js
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use ES6+ features
- Use async/await instead of callbacks
- Use destructuring and object/array spread operators
- Use template literals for string interpolation

### Python
- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- Use type hints (PEP 484)
- Use f-strings for string formatting (Python 3.6+)
- Use `pathlib` for file system operations

## Localization

All user-facing strings must be localized. The project supports multiple languages:
- English (en) - Primary
- French (fr) - Secondary
- Dutch (nl) - Tertiary
- Tamil (ta) - Quaternary

### Adding New Strings
1. Add the string to the appropriate language file in `locales/`
2. Use the translation key in the code:
   ```javascript
   // JavaScript
   this.homey.__(`my.translation.key`);
   ```
   ```python
   # Python
   _("my.translation.key")
   ```

## Testing

Before submitting a pull request, please ensure:

1. All tests pass: `npm test`
2. Linting passes: `npm run lint`
3. No TypeScript/Flow type errors
4. New code is covered by tests

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
