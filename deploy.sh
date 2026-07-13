#!/usr/bin/env bash
# Build code-relay's server locally and deploy to homelab over SSH/Tailscale.
# Run from any machine with this repo checked out: bash deploy.sh
set -euo pipefail

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST="homelab"

step() { echo; echo "▶ $*"; }
ok()   { echo "  ✓ $*"; }
fail() { echo; echo "✗ $*" >&2; exit 1; }

step "[0/5] Resolving ${HOST} home directory"
REMOTE_HOME="$(ssh "${HOST}" 'echo $HOME')"
[[ -n "${REMOTE_HOME}" ]] || fail "could not resolve \$HOME on ${HOST}"
DEST="${REMOTE_HOME}/.argus/code-relay"
ok "${HOST}:${DEST}"

step "[1/5] Building server"
cd "${SRC_DIR}"
pnpm install --frozen-lockfile
pnpm --filter @code-relay/server run build
ok "apps/server/dist built"

step "[2/5] Syncing to ${HOST}:${DEST}/server"
ssh "${HOST}" "mkdir -p ${DEST}/server"
rsync -a --delete "${SRC_DIR}/apps/server/dist/" "${HOST}:${DEST}/server/dist/"
rsync -a "${SRC_DIR}/apps/server/package.json" "${HOST}:${DEST}/server/package.json"
ok "dist/ synced"

step "[3/5] Installing prod deps on ${HOST}"
REMOTE_PATH_EXPORT='export PATH="$HOME/.local/share/fnm/aliases/default/bin:$PATH"'
ssh "${HOST}" "${REMOTE_PATH_EXPORT} && cd ${DEST}/server && npm install --omit=dev --silent"
ok "prod deps installed"

step "[4/5] Installing systemd unit"
rsync -a "${SRC_DIR}/systemd/code-relay-server.service" "${HOST}:.config/systemd/user/code-relay-server.service"
ssh "${HOST}" "systemctl --user daemon-reload"
ok "systemd unit installed"

step "[5/5] Enabling + restarting service"
ssh "${HOST}" "systemctl --user enable --now code-relay-server"
ssh "${HOST}" "systemctl --user restart code-relay-server"
ok "code-relay-server running"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploy complete — code-relay-server on ${HOST}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
