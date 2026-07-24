# Per-repo dev container image. Self-contained: the Node version comes from the
# NODE_VERSION build arg (set in devcontainer.json), and corepack covers both
# pnpm and yarn, so this same file works for every repo. Docker layer-caches the
# shared steps across repos on the same Node version, so the duplication is free.
#
# Tweak per repo only if a project needs extra system packages (see the bottom).
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim

# Non-interactive corepack: don't prompt before downloading the pnpm/yarn version
# pinned in package.json's "packageManager" field.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# git (hooks/tooling) + curl (downloads) + vim. corepack activates pnpm/yarn.
RUN apt-get update && apt-get install -y --no-install-recommends \
      git ca-certificates curl vim openssh-client \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

# GitHub CLI (gh) from GitHub's official apt repo — Debian's packaged gh is
# outdated and the maintainers recommend against it.
RUN mkdir -p -m 755 /etc/apt/keyrings \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
       -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

# Trust bind-mounted repos regardless of host uid (fixes git/lazygit "dubious
# ownership"). System-level so it coexists with the volume-based global config.
RUN git config --system --add safe.directory '*'

# lazygit — latest release at build time (rebuild picks up updates). Resolves the
# newest tag via the GitHub API; not in Debian apt, hence the binary.
RUN ARCH="$(uname -m | sed 's/aarch64/arm64/')" \
    && LAZYGIT_VERSION="$(curl -fsSL https://api.github.com/repos/jesseduffield/lazygit/releases/latest | grep -Po '"tag_name": *"v\K[^"]*')" \
    && curl -fsSL -o /tmp/lazygit.tar.gz \
       "https://github.com/jesseduffield/lazygit/releases/download/v${LAZYGIT_VERSION}/lazygit_${LAZYGIT_VERSION}_linux_${ARCH}.tar.gz" \
    && tar -xf /tmp/lazygit.tar.gz -C /usr/local/bin lazygit \
    && rm /tmp/lazygit.tar.gz

# Agent CLIs (node-based; global so the non-root `node` user can run them).
# Vendor-neutral spot — add/remove per your team. Auth is per-user (see README).
RUN npm install -g @anthropic-ai/claude-code @openai/codex

# One shared dir for ALL agent/tool state (agent logins, gh, git identity — see
# the *_CONFIG env vars in devcontainer.json). Created node-owned so the empty
# named volume inherits node ownership on first mount (login writes without sudo).
# The codex/ subdir is pre-created because Codex errors if CODEX_HOME doesn't
# already exist (claude/gh create their own dirs; Codex doesn't).
RUN mkdir -p /home/node/.agents/codex && chown -R node:node /home/node/.agents

# --- per-repo extras (uncomment/edit as needed) ----------------------------
# Native deps that fail to compile (node-gyp):
RUN apt-get update && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*
