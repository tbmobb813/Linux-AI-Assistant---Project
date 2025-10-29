# Linux AI Assistant

A native desktop AI assistant built specifically for Linux users.

## Features

- Multi-provider AI support (OpenAI, Anthropic, Gemini)
- Native Linux desktop integration
- Developer-optimized workflows
- Privacy-respecting local processing options
- CLI companion tool

### CLI usage

The optional CLI lets you send prompts into the running app from a terminal and can bring the app window to front automatically.

Examples (from the repo's `cli` folder, app must be running):

```zsh
# Ask a question with defaults
cargo run -- ask "What changed in the last commit?"

# Choose a model and provider, and force a new conversation
cargo run -- ask "Summarize README" --model gpt-4o --provider openai --new

# Send a desktop notification via the app
cargo run -- notify "Build finished"
```

Flags currently supported by `ask`:

- `--model <name>`: e.g., `gpt-4o`
- `--provider <id>`: e.g., `openai`
- `--new`: always create a new conversation for this prompt

When unspecified, the app's defaults (Settings → Default provider/model) are used.

### Project watcher

You can enable a project file watcher to surface changes as small toasts in the app (e.g., when files change). This is groundwork for richer project-aware context.

How to enable:

1. Open Settings in the app.
2. Enter your project root path and click "Watch folder".
3. You'll see brief toasts when files change. The watcher auto-starts on next launch.
4. Click "Stop watching" in Settings or use the small badge at the top-left to stop.

Notes:

- The watcher runs locally and does not send paths or file contents anywhere.
- This is an early feature; future versions may surface summaries or context in chat.

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
