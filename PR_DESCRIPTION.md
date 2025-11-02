# Add Development Tooling for IPC Testing and CLI Integration

## 🎯 Purpose

This PR adds comprehensive development tooling to support CLI ↔ backend testing and integration workflows. All features are **dev-only** and do not affect production builds or runtime.

## ✨ Features Added

### 1. IPC Create Handler (Dev-Only)

- **What**: New TCP IPC command `"create"` that programmatically inserts conversations and assistant messages
- **Why**: Enables E2E testing, demo data seeding, and CLI integration verification
- **Safety**: Only available when `DEV_MODE=1` environment variable is set
- **API**: `{"type": "create", "payload": {"content": "message", "conversation_id": "optional"}}`

### 2. CLI Create Command

- **What**: New `lai create <message>` subcommand for the CLI
- **Why**: Provides simple developer UX to exercise backend without UI
- **Usage**: `cargo run -- create "Test message from CLI"`
- **Integration**: Calls IPC create, then fetches last message to confirm

### 3. Development Helper Script

- **What**: `dev/insert_test_message.py` - Python script for direct DB insertion
- **Why**: Supports environments without sqlite3 CLI (uses Python stdlib)
- **Usage**: `python3 dev/insert_test_message.py --content "Test message"`
- **Convenience**: Added pnpm script: `pnpm -w -C linux-ai-assistant run dev:insert-message`

### 4. Automated Smoke Testing

- **What**: `dev/smoke_test_ipc.sh` - E2E test with temp database
- **Why**: Prevents regressions in IPC/CLI/DB integration
- **Coverage**: Backend startup → IPC create → CLI last → verification → cleanup
- **Safety**: Uses temporary database, no side effects

### 5. CI Integration (Opt-In)

- **What**: GitHub Actions workflow for dev smoke tests
- **When**: Manual dispatch or PR labeled with `run-dev-smoke`
- **Why**: Automated verification without slowing normal CI
- **Output**: Test logs uploaded on failure for debugging

### 6. Documentation Updates

- **What**: Enhanced README and dev docs with DEV_MODE info
- **Coverage**: Usage examples, gating explanation, cross-references
- **Location**: Updated `README.md` and comprehensive `dev/README.md`

## 🔒 Production Safety

- **IPC create handler**: Startup-gated by `DEV_MODE` environment variable
- **Dev scripts**: Located under `dev/` (excluded from releases)
- **CLI command**: Functions but fails gracefully when backend lacks dev mode
- **Zero production impact**: No new dependencies, no runtime overhead when disabled

## 📋 Usage Examples

**Enable dev mode and test IPC flow:**

```bash
export DEV_MODE=1
pnpm -w -C linux-ai-assistant run run-dev  # Start with dev features

# In another terminal:
cd linux-ai-assistant/cli
cargo run -- create "Hello from CLI"
cargo run -- last  # Should return "Hello from CLI"
```

**Run automated smoke test:**

```bash
bash dev/smoke_test_ipc.sh
```

**Insert test data via helper script:**

```bash
pnpm -w -C linux-ai-assistant run dev:insert-message -- --content "Test data"
```

## 🧪 Testing

- [x] Manual verification: IPC create/last roundtrip works
- [x] Smoke test passes: `bash dev/smoke_test_ipc.sh`
- [x] Dev mode gating: create handler disabled without `DEV_MODE=1`
- [x] Code quality: `cargo fmt` and `cargo clippy` pass
- [x] Documentation: README updated with cross-references

**CI Note**: This PR includes opt-in smoke tests. To run them, add the `run-dev-smoke` label to this PR.

## 🗂️ Files Changed

**Core Implementation:**

- `linux-ai-assistant/src-tauri/src/ipc.rs` - IPC create handler with startup gating
- `linux-ai-assistant/cli/src/main.rs` - CLI create subcommand

**Development Tools:**

- `dev/insert_test_message.py` - Python helper for DB insertion
- `dev/smoke_test_ipc.sh` - Automated E2E test script
- `linux-ai-assistant/package.json` - Added dev:insert-message script

**CI & Documentation:**

- `.github/workflows/dev-smoke-tests.yml` - Opt-in smoke test workflow
- `README.md` - Cross-reference to dev tools
- `dev/README.md` - Comprehensive dev tool documentation

## 🎯 Benefits

1. **Developer Experience**: Easy CLI testing without manual UI interaction
2. **Quality Assurance**: Automated E2E verification prevents IPC regressions
3. **Contributor Onboarding**: Clear dev helpers for database seeding
4. **CI Confidence**: Opt-in comprehensive testing for dev features
5. **Zero Bloat**: All features properly gated and dev-only

---

**Ready for review!** This provides a solid foundation for CLI/backend integration testing while maintaining clean production builds.
