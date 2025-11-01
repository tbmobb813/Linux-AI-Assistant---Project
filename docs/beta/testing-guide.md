# L.A.I.A. Beta Testing Guide

This guide helps you install the beta, try common workflows, and share useful feedback.

## 1) Install options

- Releases (preferred): https://github.com/tbmobb813/Linux-AI-Assistant---Project/releases
  - Use AppImage/DEB/RPM if provided for your distro
- Build from source:
  - Read `docs/setup_guide.md` for prerequisites
  - Desktop app packaging: `linux-ai-assistant/PACKAGING_GUIDE.md`
  - Repository setup (APT/Copr): `linux-ai-assistant/REPOSITORY_SETUP.md`

## 2) First run

- Launch the app; configure your provider(s) if needed (see `docs/PROVIDER_AND_CI.md` and `docs/OPENAI_PROVIDER.md`)
- Try the global hotkey and tray controls (Phase 3)
- Start a conversation; send a few prompts to verify connectivity and rendering

## 3) CLI basics

- Try `lai last` to print the last assistant message
- Pipe logs/outputs into a question:
  - Example: `cat error.log | lai ask "explain why this failed"` (if available in your build)
- Confirm the app is reachable from CLI (IPC working)

## 4) Workflows to test

- Summarize a long README or code file
- Explain a compiler or test error; include the output in your prompt
- Draft commit messages from diffs
- Search conversation history; export a conversation and re-import
- Verify project-aware context with the file watcher (Phase 4)

## 5) What to look for

- Stability: any crashes, freezes, or memory spikes?
- Packaging: does the installer work on your distro/DE?
- Usability: does the UI feel responsive? Are hotkeys helpful?
- Accuracy: does the assistant understand your files/logs?

## 6) Capturing logs and details

- App logs: see `linux-ai-assistant/dev/logs/` during dev; packaged logs may differ
- CLI stderr/stdout: copy relevant snippets
- Environment details to include in bug reports:
  - Distro/version (e.g., Ubuntu 24.04, Fedora 40)
  - Desktop environment (GNOME/KDE/other)
  - Kernel version: `uname -r`
  - App version (from About or release tag)
  - Provider/model in use

### How to reproduce and capture logs (quick recipes)

Run the app from a terminal with verbose logs, then copy the output into your issue.

- Generic (run from build directory):

  ```bash
  # From repo root (dev build)
  RUST_LOG=info pnpm -w -C linux-ai-assistant run tauri -- dev 2>&1 | tee laia-dev.log
  ```

- Ubuntu/Debian (recent session logs):

  ```bash
  # Kernel and OS info
  uname -r
  cat /etc/os-release

  # User session logs from the last hour (adjust as needed)
  journalctl --user -o short-precise --since "-1h" | tee session-last-hour.log
  ```

- Fedora (recent session logs):

  ```bash
  uname -r
  cat /etc/os-release
  journalctl --user -o short-precise --since "-1h" | tee session-last-hour.log
  ```

- CLI only (capture a command’s output):
  ```bash
  # Print last assistant message and save output
  linux-ai-assistant/cli/target/release/lai last 2>&1 | tee lai-cli.log
  ```

Tips:

- If launching from a desktop icon, try running the binary from a terminal to see stdout/stderr.
- Redact any secrets or private paths before sharing logs.

## 7) Reporting

- Open Issues using the templates (Bug/Feature/Beta Feedback)
- If Discussions are enabled, start a topic for broader feedback
- See `docs/beta/feedback.md` for what info is most helpful

Thank you for testing and helping shape v1.1 and beyond!
