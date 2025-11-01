# Linux AI Assistant (L.A.I.A.) — Public Beta Announcement

Short link to repo: https://github.com/tbmobb813/Linux-AI-Assistant---Project

## TL;DR

- Linux-native, privacy-first AI assistant for developers
- Local-first: SQLite, optional offline models, no cloud account required
- Desktop + CLI: global hotkey, tray, and terminal tooling
- Works great with your projects: Git-aware, file watcher, export/import
- Looking for real-world testers — tell us what works and what doesn’t!

---

## What is it?

L.A.I.A. is a Linux-native AI assistant focused on developer workflows. It integrates with your desktop (global hotkey, tray), your projects (Git and file watcher), and your terminal (CLI + command previews). It’s privacy-first: your data stays on your machine; remote calls are configurable and transparent.

## Why another assistant?

Most assistants are browser/SaaS-centric. L.A.I.A. is built for Linux developers who live in terminals, editors, and local repos — not dashboards. We bring AI into those workflows without forcing you into a cloud.

## Key features in v1.0

- Desktop app (Tauri) + CLI companion
- Markdown + code rendering, syntax highlighting
- Conversation history, export/import
- File watcher and project-aware context
- Git integration basics
- Configurable models/providers (see docs)

## What we want you to test

- Everyday dev workflows (reading logs, summarizing diffs, generating snippets)
- CLI usage (e.g., `lai last`, piping logs to ask for explanations)
- Stability across different distros and desktops (GNOME, KDE, etc.)
- Packaging and install experience (AppImage/DEB/RPM if available for your distro)

## How to get it

- Repo: https://github.com/tbmobb813/Linux-AI-Assistant---Project
- Releases: https://github.com/tbmobb813/Linux-AI-Assistant---Project/releases
- Build from source: see `docs/setup_guide.md` and `linux-ai-assistant/PACKAGING_GUIDE.md`

## How to give feedback

- Bugs: open an issue using the Bug Report form
- Feature ideas: use the Feature Request form
- General beta feedback: use the Beta Feedback form
- If Discussions are enabled, feel free to start a topic

Links will be in the repo sidebar under Issues/Discussions. See also `docs/beta/feedback.md`.

## Privacy

- Local SQLite DB; no telemetry
- Only the providers you explicitly configure are used
- Offline/local model options are supported (see docs)

## Roadmap highlights

- v1.1 (quick wins): rich chat editing, better hotkeys/UI, token tracking, search improvements, window position memory, PDF export
- v1.2 (developer power): command virtualization and deep file/document integration

## Call for testers

If you’re a Linux developer or power user, we’d love your feedback. Try the desktop app and CLI for a week and tell us what helps, what’s missing, and what’s rough.

Thank you!
— The L.A.I.A. Team
