# Changelog

All notable changes to the Linux AI Assistant project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive IPC-based CLI tool with `ask`, `notify`, `last`, and `create` commands
- Enhanced development workflow with smoke testing and integration validation
- Performance optimizations for IPC communication (TCP_NODELAY, timeouts, buffering)
- Complete documentation overhaul with CLI_GUIDE.md and improved README.md
- Development mode features for testing and validation (DEV_MODE gated)
- Unit testing for CLI components with comprehensive test coverage

### Changed

- CLI implementation migrated from file-based to TCP IPC communication
- Documentation structure reorganized with comprehensive guides and references
- Development scripts enhanced with better error handling and validation
- Package management unified to pnpm workspace configuration

### Fixed

- Resolved git push conflicts and improved branch management workflow
- IPC server stability improvements with proper connection handling
- CLI error handling and graceful failure modes
- Development environment setup issues with snap library compatibility

## [0.1.0] - 2025-10-25

### Added

- Initial project structure with Tauri backend and React frontend
- Multi-provider AI support (OpenAI, Anthropic, Google Gemini, Ollama)
- Conversation management with SQLite database
- Desktop integration with global shortcuts and system tray
- Secure API key storage using system keyring
- Real-time streaming responses from AI providers
- Export/import functionality for conversations (JSON and Markdown)
- Local AI support through Ollama integration
- Privacy indicators and hybrid routing system
- Project-aware context injection for development workflows
- Comprehensive documentation system
- Package building for multiple Linux distributions (AppImage, DEB, RPM)
- Performance optimization with 67% binary size reduction
- End-to-end testing with Playwright
- Unit testing with Vitest
- CI/CD pipeline with GitHub Actions

### Security

- Secure API key storage in system keyring
- Local data processing options for privacy
- No mandatory cloud syncing or data collection

## [Phase 6.6] - 2025-10-24

### Added

- APT PPA repository setup for Debian/Ubuntu distribution
- Copr repository setup for Fedora/RHEL distribution
- Automated repository management scripts
- Package signing and verification

## [Phase 6.5] - 2025-10-23

### Added

- Automatic update system with background checking
- Update notifications and user consent flow
- Rollback functionality for failed updates
- Update configuration and scheduling

## [Phase 6.4] - 2025-10-22

### Added

- Multi-format packaging system (AppImage, DEB, RPM, Snap, Flatpak)
- Automated build pipeline for all package formats
- Distribution-specific package metadata
- Installation and upgrade scripts

## [Phase 6.3] - 2025-10-21

### Added

- Complete user documentation with USER_GUIDE.md
- Developer documentation with DEVELOPER_GUIDE.md
- Troubleshooting guide with common issues and solutions
- Documentation index for easy navigation

## [Phase 6.2] - 2025-10-20

### Added

- Comprehensive error handling across all components
- User-friendly error messages and recovery suggestions
- Logging system for debugging and diagnostics
- Error reporting mechanisms

## [Phase 6.1] - 2025-10-19

### Added

- Performance optimization with bundle splitting
- Memory usage optimization
- Startup time improvements
- Database query optimization

## [Phase 5] - 2025-10-18

### Added

- Ollama integration for local AI models
- Model download and management UI
- Hybrid routing between local and cloud providers
- Privacy indicators showing data processing location
- Enhanced export/import system with multiple formats
- Data retention controls and automatic cleanup
- Conversation metadata and tagging system

## [Phase 4] - 2025-10-15

### Added

- CLI companion tool for terminal integration
- File system watcher for project context
- Git integration with repository awareness
- Code block enhancements (copy, run, save)
- Terminal command suggestions
- Project-aware context injection

## [Phase 3] - 2025-10-10

### Added

- Global hotkey registration and handling
- Clipboard integration for copy/paste functionality
- Desktop notifications for AI responses
- System tray integration with quick actions
- Theme integration with system preferences
- Application launcher integration (.desktop file)

## [Phase 2] - 2025-10-05

### Added

- OpenAI API integration with streaming support
- Anthropic Claude integration
- Google Gemini integration
- Provider abstraction layer for multi-model support
- API key management with secure storage
- Model selection UI and configuration
- Error handling and retry logic for API calls

## [Phase 1] - 2025-09-30

### Added

- Initial Tauri project setup with React frontend
- Basic window management and system tray
- Chat interface UI components
- SQLite database with conversation schema
- Conversation storage and retrieval
- Settings panel for configuration
- Project foundation and development environment

---

## Version History

- **v0.1.0**: Initial release with full feature set
- **Phase 6.x**: Production polish and distribution
- **Phase 5**: Local AI and privacy features
- **Phase 4**: Developer workflow integration
- **Phase 3**: System integration features
- **Phase 2**: Multi-provider AI support
- **Phase 1**: Foundation and chat interface

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for information on how to contribute to this project.

## License

This project is licensed under the [LICENSE](LICENSE) file in the repository.
