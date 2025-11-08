# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2024-11-08

### Added
- Comprehensive test suite with 126 tests covering plugin initialization, layer configuration, environment variables, global variables integration, and error handling
- Technical documentation (DOCUMENTATION.md) explaining lifecycle hooks and plugin architecture
- MIT License file
- .npmignore to exclude test files from npm package

### Fixed
- Fixed .gitignore to properly ignore node_modules, coverage, and build artifacts
- Fixed typo in example-serverless.yml

### Changed
- Improved README.md with clearer configuration examples and usage instructions

## [1.1.0] - Previous Release

### Added
- Support for custom OpenTelemetry environment variables
- Support for custom layer ARN configuration
- Integration with global variables for OTLP endpoints

### Changed
- Improved error handling and validation
- Enhanced logging for better debugging

## [1.0.5] - Initial Stable Release

### Added
- Initial release of serverless-aws-otel plugin
- Automatic injection of AWS OpenTelemetry Distro Python layer
- Default OpenTelemetry environment variables configuration
- Support for both `before:package:createDeploymentArtifacts` and `before:aws:package:finalize` hooks
- Duplicate execution prevention with configuration flag

### Features
- Provider-level layer injection
- Provider-level environment variable injection
- Configurable layer ARN
- Configurable environment variables
- Resource attributes with service name, version, and stage

---

## Legend

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes

[Unreleased]: https://github.com/krcpr007/serverless-aws-otel/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/krcpr007/serverless-aws-otel/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/krcpr007/serverless-aws-otel/compare/v1.0.5...v1.1.0
[1.0.5]: https://github.com/krcpr007/serverless-aws-otel/releases/tag/v1.0.5
