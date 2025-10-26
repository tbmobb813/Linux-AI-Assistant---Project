# Contributing

Thanks for your interest in contributing to the Linux AI Assistant. Please follow these simple guidelines:

1. Fork the repository and create a feature branch from `main` or the appropriate development branch.
2. Run the project locally and make sure TypeScript and Rust checks pass.

Local checks to run before submitting a PR:

```zsh
# from repo root
npm ci
cd linux-ai-assistant
npx tsc --noEmit
cargo check --manifest-path=src-tauri/Cargo.toml
```

3. Follow the code style: run `npm run format` (or run `prettier`) and `cargo fmt` for Rust.
4. Add tests for new behavior where appropriate.
5. Open a pull request with a clear description and link to any related issue or design notes.

For PRs: tag reviewers and include screenshots or logs for UI or runtime changes.
