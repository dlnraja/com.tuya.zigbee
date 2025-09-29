# Contribution Guidelines

## Commit Message Format
We follow [Conventional Commits](https://www.conventionalcommits.org/) standards:

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style/formatting
- `refactor`: Code changes that neither fix nor add a feature
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples
```
feat(drivers): add support for Tuya water sensor
fix(validation): handle missing compose files
docs: update device matrix with new models
```

## Development Workflow
1. Create a feature branch from `main`
2. Make your changes
3. Write tests for new features
4. Run validation and tests
5. Submit a pull request

## Adding New Drivers
1. Use the template from `drivers/_template`
2. Add device to `DEVICE-MATRIX.md`
3. Include test cases
