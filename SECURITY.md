# Security Policy

## Supported Versions

We actively support security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email the maintainer directly at: **krcpr007@gmail.com**
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- You will receive an acknowledgment within 48 hours
- We will investigate and provide an initial assessment within 7 days
- We will keep you informed of the progress
- Once fixed, we will credit you in the security advisory (unless you prefer to remain anonymous)

### Disclosure Policy

- We will disclose the vulnerability after it has been fixed and a patch is available
- We will coordinate with you on the disclosure timeline
- Security fixes will be released as soon as possible

## Security Best Practices

When using this plugin:

1. **Keep dependencies updated**: Regularly update the plugin and Serverless Framework
2. **Review configuration**: Ensure your OpenTelemetry configuration follows security best practices
3. **Environment variables**: Never commit sensitive OTLP endpoint credentials to version control
4. **Layer versions**: Use specific layer ARN versions rather than `latest` to avoid unexpected changes

## Known Security Considerations

- This plugin modifies Lambda function configurations but does not handle authentication credentials
- OTLP endpoint URLs and credentials should be managed through AWS Secrets Manager or similar secure storage
- The plugin does not validate endpoint URLs - ensure you're using trusted endpoints

## Security Updates

Security updates will be:
- Released as patch versions (e.g., 1.1.1 → 1.1.2)
- Documented in the CHANGELOG.md under the "Security" section
- Announced via GitHub releases

---

Thank you for helping keep this project secure!

