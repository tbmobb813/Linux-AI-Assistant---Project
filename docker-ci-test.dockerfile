# Mirror GitHub Actions Ubuntu environment for CI debugging
FROM ubuntu:22.04

# Install GitHub Actions runner dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    jq \
    wget \
    sudo \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 (same as GitHub Actions)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - \
    && apt-get install -y nodejs

# Install Rust (latest stable)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install pnpm
RUN npm install -g pnpm

# Create workspace directory
WORKDIR /github/workspace

# Copy project files
COPY . .

# Set environment variables to match GitHub Actions
ENV CI=true
ENV GITHUB_ACTIONS=true
ENV NODE_ENV=test

# Run the CI pipeline exactly as GitHub Actions does
CMD ["bash", "-c", "pnpm install --frozen-lockfile && pnpm run test:coverage && tsc --noEmit && pnpm prettier --check ."]
