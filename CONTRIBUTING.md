# Contributing to Linux AI Assistant

Thank you for your interest in contributing to the Linux AI Assistant! This guide will help you get started with contributing to our project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Documentation](#documentation)
- [Testing](#testing)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Rust** (latest stable version)
- **Node.js** (18+ with Corepack enabled)
- **pnpm** (via Corepack: `corepack enable && corepack prepare pnpm@latest --activate`)
- **Git** with proper configuration

### Required System Dependencies

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
  build-essential curl wget file \
  libssl-dev libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev libsqlite3-dev
```

**Fedora/RHEL:**

```bash
sudo dnf install webkit2gtk3-devel.x86_64 \
  openssl-devel curl wget file \
  libappindicator-gtk3-devel \
  librsvg2-devel sqlite-devel
```

## Development Environment

### Initial Setup

1. **Fork and Clone:**

   ```bash
   git clone https://github.com/your-username/Linux-AI-Assistant---Project.git
   cd Linux-AI-Assistant---Project
   ```

2. **Install Dependencies:**

   ```bash
   # Enable pnpm via Corepack
   corepack enable
   corepack prepare pnpm@latest --activate

   # Install workspace dependencies
   pnpm -w install
   ```

3. **Build and Test:**

   ```bash
   # Run type checking
   pnpm -w -C linux-ai-assistant run typecheck

   # Run tests
   pnpm -w -C linux-ai-assistant test

   # Start development server
   pnpm -w -C linux-ai-assistant run tauri -- dev
   ```

### Development Workflow

**Using DevContainer (Recommended):**

```bash
# Open in VS Code with DevContainer
code .
# VS Code will prompt to reopen in container
```

**Manual Development:**

```bash
# Frontend development
cd linux-ai-assistant
pnpm dev                    # Vite dev server
pnpm test:watch            # Watch mode testing
pnpm run tauri -- dev      # Full Tauri development

# CLI development
cd linux-ai-assistant/cli
cargo build                # Build CLI
cargo test                 # Run CLI tests
```

**Development Scripts:**

```bash
# Smoke testing
./dev/smoke_test_ipc.sh

# Development server with workarounds
./dev/tauri-dev.sh

# Insert test data
pnpm -w -C linux-ai-assistant run dev:insert-message
```

## Contributing Guidelines

### Code Style

**Rust:**

- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Run `cargo clippy` and fix all warnings
- Format with `cargo fmt`
- Write documentation for public APIs

**TypeScript:**

- Use strict TypeScript configuration
- Follow ESLint and Prettier rules
- Prefer functional components and hooks
- Write JSDoc for complex functions

**General:**

- Use meaningful variable and function names
- Keep functions small and focused
- Write self-documenting code
- Add comments for complex logic

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(cli): add last command to retrieve recent responses
fix(ipc): resolve connection timeout issues
docs(readme): update installation instructions
test(cli): add unit tests for command parsing
```

### Branch Naming

Use descriptive branch names:

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

## Pull Request Process

### Before Submitting

1. **Update Documentation:**
   - Update relevant documentation files
   - Add/update inline code comments
   - Update CHANGELOG.md if applicable

2. **Test Your Changes:**

   ```bash
   # Run all tests
   pnpm -w -C linux-ai-assistant test
   pnpm -w -C linux-ai-assistant test:e2e

   # Type checking
   pnpm -w -C linux-ai-assistant run typecheck

   # Rust tests and checks
   cd linux-ai-assistant/cli && cargo test
   cd ../src-tauri && cargo clippy && cargo test
   ```

3. **Verify Build:**

   ```bash
   # Frontend build
   pnpm -w -C linux-ai-assistant build

   # Tauri build (optional for development)
   pnpm -w -C linux-ai-assistant run tauri build
   ```

### Submitting the PR

1. **Create the Pull Request:**
   - Use a clear, descriptive title
   - Reference related issues: "Fixes #123"
   - Provide detailed description of changes
   - Include screenshots/videos for UI changes

2. **PR Template Checklist:**
   - [ ] Tests pass locally
   - [ ] Documentation updated
   - [ ] Changelog updated (if applicable)
   - [ ] Screenshots included (for UI changes)
   - [ ] Breaking changes documented

3. **Review Process:**
   - Respond to review feedback promptly
   - Make requested changes in new commits
   - Squash commits before merge (if requested)

## Issue Reporting

### Bug Reports

When reporting bugs, include:

1. **Environment Information:**
   - OS and version
   - Application version
   - Installation method (AppImage, DEB, etc.)

2. **Steps to Reproduce:**
   - Clear, numbered steps
   - Expected vs actual behavior
   - Screenshots/videos if applicable

3. **Debug Information:**

   ```bash
   # Collect debug logs
   RUST_LOG=debug pnpm -w -C linux-ai-assistant run tauri -- dev

   # System information
   uname -a
   ldd --version
   ```

### Feature Requests

For feature requests, provide:

- Clear description of the feature
- Use cases and benefits
- Possible implementation approaches
- Mockups or examples (if applicable)

## Documentation

### Documentation Standards

- Write clear, concise documentation
- Include code examples
- Use proper Markdown formatting
- Test all code examples
- Keep documentation up-to-date with code changes

### Documentation Structure

```
docs/
├── user-guides/          # End-user documentation
├── developer-guides/     # Development documentation
├── api-reference/        # API documentation
└── troubleshooting/     # Problem-solving guides
```

## Testing

### Test Categories

1. **Unit Tests:**

   ```bash
   # Frontend unit tests
   pnpm -w -C linux-ai-assistant test

   # Rust unit tests
   cd linux-ai-assistant/cli && cargo test
   cd ../src-tauri && cargo test
   ```

2. **Integration Tests:**

   ```bash
   # End-to-end testing
   pnpm -w -C linux-ai-assistant test:e2e

   # IPC smoke testing
   ./dev/smoke_test_ipc.sh
   ```

3. **Manual Testing:**
   - Test on multiple Linux distributions
   - Verify keyboard shortcuts and accessibility
   - Test with different AI providers
   - Validate export/import functionality

### Writing Tests

**Frontend (Vitest):**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Component from './Component'

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

**Rust (cargo test):**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function() {
        assert_eq!(add(2, 2), 4);
    }
}
```

## Release Process

1. **Version Bump:**
   - Update version in `package.json`
   - Update version in `Cargo.toml` files
   - Update CHANGELOG.md

2. **Testing:**
   - Run full test suite
   - Test on multiple Linux distributions
   - Verify all packaging formats

3. **Documentation:**
   - Update documentation
   - Generate API documentation
   - Update installation guides

## Getting Help

- **Documentation**: Start with [DOCUMENTATION_INDEX.md](linux-ai-assistant/DOCUMENTATION_INDEX.md)
- **Issues**: Search existing [GitHub Issues](https://github.com/tbmobb813/Linux-AI-Assistant---Project/issues)
- **Discussions**: Use [GitHub Discussions](https://github.com/tbmobb813/Linux-AI-Assistant---Project/discussions)
- **Discord**: Join our community (link in README)

## Recognition

Contributors are recognized in:

- CHANGELOG.md for their contributions
- README.md contributors section
- GitHub contributors graph
- Release notes

Thank you for contributing to the Linux AI Assistant! 🚀
Title: Move Tauri backend into crate and fix frontend invoke keys

## Summary

This branch moves the Tauri backend Rust modules into `linux-ai-assistant/src-tauri/src` and splits combined files into proper `commands/` and `database/` submodules. It also fixes the frontend Tauri invoke wrapper to use snake_case payload keys matching the Rust command parameters and adds typed invoke generics for safer TypeScript checks.

## Changes

- Moved backend modules from top-level `src/` into `linux-ai-assistant/src-tauri/src/`
  - `commands/` (conversations, messages, settings)
  - `database/` (schema, conversations, messages, settings)
- Updated frontend API wrapper `lib/api/types.ts` to use `system_prompt`, `conversation_id`, `tokens_used` and added `invoke<T>()` generics.
- Committed changes on branch `fix/move-tauri-backend`.

## Why

Tauri expects the Rust source for the app to live in the `src-tauri` crate. The previous placement caused the crate to miss module definitions. The frontend and backend argument naming needed to match exactly for Tauri's invoke argument mapping.

## How to test

1. From a system (non-snap) terminal, run:

```bash
cd linux-ai-assistant
npm ci
npx tsc --noEmit
npm run tauri dev
```

2. The app should start and open the Tauri window. If you see a symbol lookup error referencing `libpthread` or `GLIBC_PRIVATE`, run the dev commands from a non-snap-wrapped terminal (for example a terminal launched from the system menu, not from a snap-packaged VS Code).

## Notes

- I intentionally added typed invoke calls to catch mismatches earlier.
- Consider adding a CI job that runs the frontend `npx tsc --noEmit` and Rust `cargo check` to catch regressions.
