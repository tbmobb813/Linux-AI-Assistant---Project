# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

- Rebased `fix/tauri-shim-typechecks` onto `fix/move-tauri-backend` and resolved merge conflicts in package manifests and docs.
- Unified package manager strategy to pnpm: removed `package-lock.json` and regenerated `pnpm-lock.yaml`.
- Removed invalid/non-published devDependency `@types/testing-library__react@^14.0.0` to allow dependency resolution.
- Ran local verification: TypeScript checks, Vite build, Vitest unit tests, and `cargo check` — all passed locally.
