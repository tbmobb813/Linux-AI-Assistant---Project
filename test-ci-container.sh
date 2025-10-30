#!/bin/bash
set -e

echo "🐳 Building CI Test Container..."
echo "================================"

# Build the container with current codebase
docker build -f docker-ci-test.dockerfile -t linux-ai-ci-test .

echo ""
echo "🚀 Running CI Tests in Container..."
echo "=================================="

# Run the container and capture output
docker run --rm \
    -v "$(pwd):/github/workspace" \
    -w /github/workspace \
    linux-ai-ci-test

echo ""
echo "✅ CI Test Complete!"
