# Project TODO

This file tracks higher-level tasks and progress for the Linux AI Assistant project.

## Current priorities

- [x] Repo hygiene, CI, and tests
- [x] Consolidate Tauri backend entrypoint & DB init
- [x] Dev runner and environment sanitization
- [x] Chat UI components, optimistic send flow, per-message statuses, retry UI
- [x] CI coverage upload (Codecov)

## Next: System tray & window management

- [ ] Add a system tray icon with menu entries: Show/Hide Window, Quit
- [ ] Register a global shortcut (configurable) to toggle the app window
- [ ] Ensure the tray works on common Linux desktops (GTK WebKit/Wayland/X11 path checks)
- [ ] Add handlers to persist tray/menu preferences in settings
- [ ] Add tests or smoke script to validate the tray toggles window show/hide

## Follow-ups

- [ ] Branch protection & release workflow
- [ ] Repo large-file prevention checks
- [ ] Dev-runner hardening and smoke scripts
- [ ] Packaging for DEB/RPM/AppImage

---
Generated/updated on: 2025-10-24
