# Contributing to serverless-aws-otel

Thank you for your interest in contributing to serverless-aws-otel! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Please be kind, considerate, and constructive in your interactions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/serverless-aws-otel.git
   cd serverless-aws-otel
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/gushwork/serverless-aws-otel.git
   ```

## Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Link for local testing**:
   ```bash
   npm link
   cd /path/to/test-serverless-project
   npm link serverless-aws-otel
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Run tests with coverage**:
   ```bash
   npm run test:coverage
   ```

## Making Changes

1. **Create a new branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following the coding standards

3. **Test your changes**:
   ```bash
   npm test
   ```

4. **Test in a real Serverless project** to ensure it works end-to-end

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Tests are located in the `__tests__/` directory
- Use Jest as the testing framework
- Follow the existing test structure and naming conventions
- Aim for high test coverage (currently at 126 tests)

Example test structure:
```javascript
describe('Feature Name', () => {
  let serverless;
  let plugin;

  beforeEach(() => {
    serverless = createMockServerless();
    plugin = new ServerlessAwsOtelPlugin(serverless, {});
  });

  test('should do something', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Test Categories

- **Plugin Initialization**: Tests for constructor and hooks registration
- **Layer Configuration**: Tests for layer injection
- **Environment Variables**: Tests for env var configuration
- **Global Variables Integration**: Tests for global variables support
- **Error Handling**: Tests for error cases and validation

## Submitting Changes

1. **Commit your changes** with clear commit messages:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

2. **Keep your fork updated**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

3. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request**:
   - Go to the GitHub repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template with:
     - Clear description of changes
     - Related issue numbers (if applicable)
     - Testing performed
     - Breaking changes (if any)

## Coding Standards

### JavaScript Style

- Use modern JavaScript (ES6+)
- Use meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic
- Follow existing code patterns

### Code Structure

```javascript
// Good: Clear, descriptive naming
const otelLayerArn = pluginConfig.layerArn || defaultLayerArn;

// Bad: Unclear, abbreviated naming
const arn = cfg.larn || def;
```

### Error Handling

```javascript
// Always provide clear error messages
if (!isValid) {
  throw new Error('Invalid configuration: please provide a valid layer ARN');
}
```

### Documentation

- Update README.md for user-facing changes
- Update DOCUMENTATION.md for technical/architectural changes
- Add JSDoc comments for public methods
- Update CHANGELOG.md for all changes

## Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **test**: Adding or updating tests
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **chore**: Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat: add support for custom OTEL propagators"

# Bug fix
git commit -m "fix: prevent duplicate layer injection"

# Documentation
git commit -m "docs: update README with new configuration options"

# Test
git commit -m "test: add tests for error handling"

# Multiple lines
git commit -m "feat: add support for per-function configuration

This allows users to override OTEL settings at the function level
instead of only at the provider level.

Closes #123"
```

## Pull Request Guidelines

### PR Checklist

Before submitting a PR, ensure:

- [ ] Code follows the project's coding standards
- [ ] All tests pass (`npm test`)
- [ ] New tests added for new features
- [ ] Documentation updated (README.md, DOCUMENTATION.md)
- [ ] CHANGELOG.md updated
- [ ] No breaking changes (or clearly documented if necessary)
- [ ] Commit messages follow conventional commits format

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Changes
- Change 1
- Change 2
- Change 3

## Related Issues
Closes #123

## Testing
How did you test these changes?

## Breaking Changes
Are there any breaking changes? If yes, describe them.

## Screenshots/Examples
If applicable, add examples or screenshots
```

## Development Tips

### Testing Locally

Create a test `serverless.yml` file:

```yaml
service: test-otel-plugin

provider:
  name: aws
  runtime: python3.9

plugins:
  - serverless-aws-otel

functions:
  hello:
    handler: handler.hello
```

Run with verbose output:
```bash
serverless package --verbose
```

### Debugging

Add debug logs to your changes:
```javascript
console.log('Debug:', variable);
this.serverless.cli.log('Info message');
```

Run with verbose Serverless output:
```bash
serverless deploy --verbose
```

## Questions or Need Help?

- **Issues**: Open an issue on [GitHub Issues](https://github.com/gushwork/serverless-aws-otel/issues)
- **Discussions**: Start a discussion for questions or ideas
- **Email**: Contact the maintainer at krcpr007@gmail.com

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes
- Project README (for significant contributions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to serverless-aws-otel!
