#!/usr/bin/env bash
# Build code-relay's server locally and deploy to homelab over SSH/Tailscale.
# Run from any machine with this repo checked out: bash deploy.sh
set -euo pipefail

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST="homelab"

step() { echo; echo "▶ $*"; }
ok()   { echo "  ✓ $*"; }
fail() { echo; echo "✗ $*" >&2; exit 1; }

step "[0/6] Resolving ${HOST} home directory"
REMOTE_HOME="$(ssh "${HOST}" 'echo $HOME')"
[[ -n "${REMOTE_HOME}" ]] || fail "could not resolve \$HOME on ${HOST}"
DEST="${REMOTE_HOME}/.argus/code-relay"
ok "${HOST}:${DEST}"

step "[1/6] Building server + web"
cd "${SRC_DIR}"
pnpm install --frozen-lockfile
pnpm --filter @code-relay/server run build
pnpm --filter web run build
ok "apps/server/dist and apps/web/dist built"

step "[2/6] Syncing server to ${HOST}:${DEST}/server"
ssh "${HOST}" "mkdir -p ${DEST}/server"
rsync -a --delete "${SRC_DIR}/apps/server/dist/" "${HOST}:${DEST}/server/dist/"

# Ship a runtime-only package.json, not the source one: the source file's
# devDependencies can carry pnpm workspace-protocol specifiers
# ("@code-relay/types": "workspace:*") that plain npm can't even parse --
# not just "won't install", it errors immediately with EUNSUPPORTEDPROTOCOL
# regardless of --omit=dev, since that only skips *installing* the section,
# not parsing it. None of those packages are needed at runtime anyway (the
# build already happened locally, above); the remote only ever needs
# `dependencies`.
RUNTIME_PACKAGE_JSON="$(mktemp)"
node -e "
  const pkg = require('${SRC_DIR}/apps/server/package.json');
  const runtime = { name: pkg.name, version: pkg.version, private: pkg.private, type: pkg.type, dependencies: pkg.dependencies };
  console.log(JSON.stringify(runtime, null, 2));
" > "${RUNTIME_PACKAGE_JSON}"
rsync -a "${RUNTIME_PACKAGE_JSON}" "${HOST}:${DEST}/server/package.json"
rm -f "${RUNTIME_PACKAGE_JSON}"
ok "server dist/ synced"

step "[3/6] Syncing web to ${HOST}:${DEST}/web/dist"
ssh "${HOST}" "mkdir -p ${DEST}/web/dist"
rsync -a --delete "${SRC_DIR}/apps/web/dist/" "${HOST}:${DEST}/web/dist/"
ok "web dist/ synced"

step "[4/6] Installing prod deps on ${HOST}"
REMOTE_PATH_EXPORT='export PATH="$HOME/.local/share/fnm/aliases/default/bin:$PATH"'
ssh "${HOST}" "${REMOTE_PATH_EXPORT} && cd ${DEST}/server && npm install --omit=dev --silent"
ok "prod deps installed"

step "[5/6] Installing systemd unit"
rsync -a "${SRC_DIR}/systemd/code-relay-server.service" "${HOST}:.config/systemd/user/code-relay-server.service"
ssh "${HOST}" "systemctl --user daemon-reload"
ok "systemd unit installed"

step "[6/6] Enabling + restarting service"
ssh "${HOST}" "systemctl --user enable --now code-relay-server"
ssh "${HOST}" "systemctl --user restart code-relay-server"
ok "code-relay-server running"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploy complete — code-relay-server on ${HOST}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
