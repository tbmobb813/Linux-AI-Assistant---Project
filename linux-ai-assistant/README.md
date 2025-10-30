# Linux AI Assistant

A native desktop AI assistant built specifically for Linux users.

## Features

- Multi-provider AI support (OpenAI, Anthropic, Gemini)
- Native Linux desktop integration
- Developer-optimized workflows
- Privacy-respecting local processing options
- CLI companion tool

### Global Shortcut

The app registers a global shortcut to toggle the window. By default this is:

- CommandOrControl+Space

You can change this at runtime:

- Open the app and click Settings (top-right), then edit the Global shortcut and Save.
- Use formats like CommandOrControl+Space or Ctrl+Shift+K.
- If the chosen shortcut is unavailable on your system, you'll see a toast error and the previous shortcut remains active.

## Development

### Prerequisites

- Rust 1.75+
- Node.js 18+
- System dependencies (installed via setup script)

### Running the App

```bash
# Development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

## Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## License

MIT

## Troubleshooting

Snap vs system terminal (important)

- If you run the development workflow from a terminal provided by a snap-packaged app (for example the VS Code snap), the Snap runtime can inject its own shared libraries (under `/snap/core20/...`) into processes. That can cause symbol lookup errors when running native binaries built against the system libraries (for example: "undefined symbol: \_\_libc_pthread_init, version GLIBC_PRIVATE").
- Workaround: run `npm run tauri dev` or execute the built binary from a normal system terminal (gnome-terminal, xterm, konsole) — not from a snap-wrapped terminal. This ensures the system loader uses your distribution's libraries.

Quick commands (system terminal):

```zsh
cd '$(pwd)'
# Start dev server + Tauri
npm run tauri dev
```

If you must run from a snap-wrapped environment, try a sanitized environment (may not always work):

```zsh
env -i HOME="$HOME" PATH="/usr/bin:/bin" DISPLAY="$DISPLAY" XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" \
 DBUS_SESSION_BUS_ADDRESS="$DBUS_SESSION_BUS_ADDRESS" XAUTHORITY="$XAUTHORITY" \
 bash --noprofile --norc -c "npm run tauri dev"
```

Note: the most reliable approach is to use a non-snap terminal for building and running native desktop apps.
