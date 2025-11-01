# Security Policy

## Supported Versions

We actively support the following versions of the Linux AI Assistant with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| Beta    | :white_check_mark: |

## Reporting a Vulnerability

We take the security of the Linux AI Assistant seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please send an email to: **[security@linuxai-assistant.org]** (replace with actual security email)

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### What to Expect

You can expect to receive:

1. **Acknowledgment** within 48 hours of your report
2. **Initial assessment** within 1 week
3. **Regular updates** on our progress
4. **Credit** in our security advisories (if desired)

### Security Update Process

1. **Triage**: We assess the severity and impact
2. **Fix Development**: We develop and test a fix
3. **Coordinated Disclosure**: We work with you on disclosure timing
4. **Release**: We release the security update
5. **Advisory**: We publish a security advisory

## Security Features

### Data Protection

- **Local Storage**: All conversations are stored locally by default
- **Secure API Keys**: API keys are stored in the system keyring
- **No Tracking**: No telemetry or usage data collection
- **Privacy Indicators**: Clear visual indicators for local vs cloud processing

### Code Security

- **Rust Backend**: Memory-safe Rust code for system integration
- **TypeScript Frontend**: Type-safe frontend development
- **Dependency Scanning**: Regular automated dependency vulnerability scanning
- **Code Review**: All changes undergo security-focused code review

### IPC Security

- **Local-only**: IPC server only binds to localhost (127.0.0.1)
- **Port Binding**: Uses specific port (39871) with connection validation
- **Development Gating**: Sensitive operations require DEV_MODE flag
- **Input Validation**: All IPC messages are validated and sanitized

## Security Best Practices for Users

### API Key Management

- Store API keys only in the application (uses system keyring)
- Never share API keys in conversations or screenshots
- Rotate API keys regularly
- Use separate API keys for different applications

### Local AI Security

- Keep Ollama updated to the latest version
- Review models before download from third-party sources
- Monitor system resources when running local models
- Use trusted model sources (Ollama official library)

### System Security

- Keep your Linux distribution updated
- Use the official packages from our repositories when possible
- Verify package signatures before installation
- Run the application with standard user permissions (not root)

### Development Security

- Only enable DEV_MODE in development environments
- Never expose development features in production builds
- Use secure development practices when contributing
- Follow our security guidelines in CONTRIBUTING.md

## Known Security Considerations

### AI Provider Communication

- **Cloud Providers**: Communications are encrypted in transit (HTTPS)
- **Data Processing**: Some providers may log conversations for improvement
- **Privacy Mode**: Use local models (Ollama) for sensitive conversations
- **API Limits**: Rate limiting and token management prevent abuse

### Local Model Security

- **Ollama**: Local processing ensures data never leaves your machine
- **Model Sources**: Only download models from trusted sources
- **Resource Usage**: Monitor CPU/memory usage to prevent DoS
- **Network Isolation**: Local models don't require internet access

### Database Security

- **SQLite**: Local database with file system permissions
- **Encryption**: Consider using full-disk encryption for sensitive data
- **Backups**: Regular backups of ~/.local/share/linux-ai-assistant/
- **Access Control**: Standard file permissions protect the database

## Dependency Security

We use several automated tools to maintain dependency security:

- **Dependabot**: Automated dependency updates
- **GitHub Security Advisories**: Monitoring for known vulnerabilities
- **Cargo Audit**: Rust dependency vulnerability scanning
- **npm audit**: Node.js dependency vulnerability scanning

## Security Headers and Configurations

### Tauri Security Configuration

```json
{
  "security": {
    "csp": "default-src 'self'; connect-src https: http://localhost:*"
  },
  "allowlist": {
    "all": false,
    "shell": {
      "all": false,
      "open": false
    }
  }
}
```

### IPC Security Settings

- Localhost-only binding (127.0.0.1)
- Connection timeout limits
- Message size limits
- Command validation and sanitization

## Incident Response

In the event of a security incident:

1. **Containment**: Immediate steps to limit exposure
2. **Assessment**: Evaluation of impact and affected systems
3. **Communication**: Transparent communication with users
4. **Remediation**: Rapid development and deployment of fixes
5. **Recovery**: Assistance for affected users
6. **Lessons Learned**: Process improvements to prevent recurrence

## Security Contact Information

- **Security Email**: [security@linuxai-assistant.org] (replace with actual)
- **PGP Key**: Available at [URL] (if applicable)
- **Response Time**: 48 hours for acknowledgment
- **Languages**: English

## Legal and Compliance

- We follow responsible disclosure practices
- We respect security researchers and their work
- We do not pursue legal action against security researchers who follow this policy
- We may provide rewards for qualifying security discoveries (bug bounty)

## Security Acknowledgments

We thank the following security researchers for their responsible disclosure:

_(This section will be updated as we receive and address security reports)_

---

**Last Updated**: November 2025  
**Next Review**: February 2026

For general questions about security, please see our [documentation](linux-ai-assistant/DOCUMENTATION_INDEX.md) or [open an issue](https://github.com/tbmobb813/Linux-AI-Assistant---Project/issues).
