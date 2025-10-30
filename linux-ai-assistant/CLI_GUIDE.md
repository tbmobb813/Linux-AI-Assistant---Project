# Linux AI Assistant - CLI Guide

The `lai` command-line companion tool provides powerful ways to interact with the Linux AI Assistant from your terminal.

## Installation & Setup

The CLI tool is automatically installed with the Linux AI Assistant.

**Location:**

- Binary: `/opt/linux-ai-assistant/lai` or available in PATH
- Configuration: `~/.config/linux-ai-assistant/cli.conf`

**Verify Installation:**

```bash
lai --version
```

## Basic Usage

### Starting a Chat Session

```bash
# Interactive chat mode (opens GUI chat window)
lai chat

# Send a single message
lai "What is the capital of France?"

# Start chat with context
lai chat --context "You are a Python expert"
```

### Viewing Recent Responses

```bash
# Show last response
lai last

# Show last N responses
lai last --count 5

# Show last response from specific conversation
lai last --conversation "Python Debugging"
```

### Managing Conversations

```bash
# List all conversations
lai list

# Search conversations
lai search "keyword"

# Show specific conversation
lai show <conversation-id>

# Create new conversation
lai new --title "My Topic"

# Delete conversation
lai delete <conversation-id>

# Archive conversation
lai archive <conversation-id>

# Unarchive conversation
lai unarchive <conversation-id>
```

### Exporting Data

```bash
# Export conversation as JSON
lai export <conversation-id> --format json --output ~/conversation.json

# Export conversation as Markdown
lai export <conversation-id> --format markdown --output ~/conversation.md

# Export all conversations
lai export-all --format markdown --output ~/my-conversations/

# Export as PDF (future)
lai export <conversation-id> --format pdf --output ~/conversation.pdf
```

### Importing Data

```bash
# Import conversation from JSON
lai import ~/conversation.json

# Import with merge
lai import ~/conversation.json --merge

# Import with new title
lai import ~/conversation.json --title "Imported Topic"
```

## Advanced Features

### Project Context

```bash
# Set project root
lai project set ~/my-project

# View project settings
lai project show

# Reset project context
lai project reset

# Watch project for changes (automatic in GUI)
lai project watch
```

### Model & Provider Management

```bash
# List available models
lai models list

# Show model details
lai models info <model-name>

# Set default model
lai models set-default <model-name>

# Download new model (Ollama)
lai models download <model-name>

# Remove model
lai models remove <model-name>

# List available providers
lai providers list

# Set default provider
lai providers set-default <provider-name>
```

### Settings & Configuration

```bash
# Show all settings
lai settings show

# Set a setting
lai settings set <key> <value>

# Reset to defaults
lai settings reset

# Show specific setting
lai settings show <key>

# List available keys
lai settings list-keys
```

**Common Settings:**

```bash
lai settings set theme dark
lai settings set default-provider ollama
lai settings set max-tokens 2000
lai settings set temperature 0.7
lai settings set global-hotkey "Ctrl+Alt+A"
```

### Execution & Code Running

```bash
# Run code snippet (stdin)
echo "print('Hello')" | lai run --language python

# Run from file
lai run --file script.py --language python

# Run with timeout
lai run --file command.sh --timeout 30

# Execute suggested command (with confirmation)
lai exec "npm install"
```

### Integration & Piping

```bash
# Get last response and pipe to another command
lai last --format text | less

# Use in scripts
response=$(lai "What's the weather?")
echo "Response: $response"

# Git integration - analyze diff
git diff | lai "What changed here?"

# Pipe command output for analysis
ls -la | lai "Explain what files these are"

# Process logs
tail -f logfile.log | lai "Highlight any errors"
```

## Scripting & Automation

### Batch Processing

```bash
#!/bin/bash

# Ask multiple questions
questions=(
  "What is Python?"
  "How do you install packages?"
  "Show me a hello world example"
)

for q in "${questions[@]}"; do
  echo "Q: $q"
  lai "$q"
  echo "---"
done
```

### Conditional Logic

```bash
#!/bin/bash

# Check if response is satisfactory
response=$(lai "Explain recursion")

if [[ $response == *"function calls itself"* ]]; then
  echo "Good response!"
else
  echo "Try again with different phrasing"
  lai "Explain recursion in detail"
fi
```

### Integration with Development Workflow

```bash
#!/bin/bash

# Pre-commit hook: Ask AI for commit message
staged_changes=$(git diff --cached)
commit_msg=$(echo "$staged_changes" | lai "Generate a concise commit message")
git commit -m "$commit_msg"

# Review code with AI
code_file=$1
lai "Review this code and suggest improvements" < "$code_file"

# Analyze test failures
test_output=$(./run_tests.sh 2>&1)
lai "Why might these tests be failing?" < <(echo "$test_output")
```

## Output Formats

```bash
# Human-readable (default)
lai "Question"

# JSON format (for parsing)
lai "Question" --format json

# Plain text (no formatting)
lai "Question" --format text

# CSV (for logging)
lai list --format csv > conversations.csv

# Markdown
lai last --format markdown
```

## Performance & Optimization

```bash
# Use local models for speed
lai settings set default-provider ollama

# Reduce token limit for faster responses
lai settings set max-tokens 500

# Set lower temperature for consistent results
lai settings set temperature 0.3

# Use smaller models for speed
lai models set-default mistral-7b
```

## Troubleshooting

### Command Not Found

```bash
# Ensure CLI is in PATH
export PATH="/opt/linux-ai-assistant:$PATH"

# Or use full path
/opt/linux-ai-assistant/lai --version
```

### Connection Issues

```bash
# Check if daemon is running
lai health

# Restart daemon
lai daemon restart

# Check configuration
lai config show
```

### Performance Issues

```bash
# Run in offline mode
lai --offline

# Use smaller response sizes
lai settings set max-tokens 500

# Clear cache
lai cache clear
```

## Configuration File

Location: `~/.config/linux-ai-assistant/cli.conf`

**Example:**

```toml
[default]
provider = "ollama"
model = "mistral:latest"
temperature = 0.7
max_tokens = 2000

[providers]
openai_api_key = "sk-..."
anthropic_api_key = "..."
gemini_api_key = "..."
ollama_endpoint = "http://localhost:11434"

[behavior]
auto_copy = true
confirm_execute = true
save_history = true
```

## Environment Variables

```bash
# Override default provider
export LAI_PROVIDER=ollama

# Override default model
export LAI_MODEL=mistral

# Override settings file location
export LAI_CONFIG_DIR=~/.config/lai

# Enable debug output
export LAI_DEBUG=1

# Set response timeout
export LAI_TIMEOUT=30
```

## Aliases & Shortcuts

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Quick question
alias ask='lai'

# Show last response
alias last='lai last'

# List conversations
alias laic='lai list'

# Export last conversation
alias export-last='lai last --format markdown | tee ~/exports/$(date +%s).md'

# Python helper
alias py-help='lai "Python expert" chat'

# Git helper
alias git-help='lai "Git expert" chat'
```

## Common Workflows

### Daily Development Routine

```bash
#!/bin/bash

# Start day - review yesterday's work
yesterday_convo=$(lai search "$(date -d yesterday +%Y-%m-%d)" | head -1)
lai show $yesterday_convo

# Get current tasks from notes
tasks=$(cat TODO.txt)
lai "Prioritize these tasks and suggest approach:" < TODO.txt

# End of day - summarize progress
lai new --title "Daily Standup $(date +%Y-%m-%d)"
lai "Summarize what I accomplished today on [project]"
```

### Code Review Assistant

```bash
#!/bin/bash

file=$1
echo "Reviewing $file..."

lai << EOF
Review this code for:
1. Security issues
2. Performance problems
3. Code style improvements
4. Potential bugs

Code:
$(cat "$file")
EOF
```

### Learning Assistant

```bash
#!/bin/bash

topic=$1
lai new --title "Learning: $topic"
lai "Explain $topic in simple terms for a beginner"
lai "Give me 3 practical examples of $topic"
lai "What are common mistakes beginners make with $topic?"
```

## Tips & Best Practices

1. **Use piping** for natural language processing of system output
2. **Leverage the search** feature to find relevant past solutions
3. **Create conversation templates** for common tasks
4. **Combine with aliases** for quick access to common queries
5. **Use exit codes** for scripting (0 = success, 1 = error)
6. **Enable confirmation prompts** for destructive operations
7. **Save useful one-liners** in your shell history or script library
8. **Use local models** for privacy-sensitive operations
9. **Batch operations** with loops for efficiency
10. **Monitor usage** with `lai stats` to track API costs

## Getting Help

```bash
# Show help
lai --help

# Show command-specific help
lai <command> --help

# List all commands
lai commands

# Show version and system info
lai --version
lai --system-info
```

---

**Version**: 1.0  
**Last Updated**: October 2025  
**See Also**: USER_GUIDE.md, DEVELOPER_GUIDE.md
