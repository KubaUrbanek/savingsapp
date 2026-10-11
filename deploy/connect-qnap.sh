#!/usr/bin/env bash
# Runs on GitHub's runner, after joining Tailscale.
set -euo pipefail
umask 077
for setting in QNAP_HOST QNAP_SSH_USER QNAP_COMPOSE_FILE QNAP_COMPOSE_PROJECT QNAP_COMPOSE_SERVICE QNAP_SSH_PRIVATE_KEY QNAP_SSH_KNOWN_HOSTS IMAGE REGISTRY_USER REGISTRY_TOKEN; do
  [[ -n ${!setting:-} ]] || { printf 'Missing setting: %s\n' "$setting" >&2; exit 1; }
done
[[ $QNAP_HOST != -* && $QNAP_HOST != *[$'\n\r\t ']* ]] || exit 1
[[ $QNAP_SSH_USER =~ ^[a-zA-Z0-9_.-]+$ && $QNAP_SSH_USER != -* ]] || exit 1
[[ ${QNAP_SSH_PORT:-22} =~ ^[0-9]+$ ]] || exit 1
ssh_dir=$(mktemp -d)
trap 'rm -rf "$ssh_dir"' EXIT
printf '%s\n' "$QNAP_SSH_PRIVATE_KEY" > "$ssh_dir/key"
printf '%s\n' "$QNAP_SSH_KNOWN_HOSTS" > "$ssh_dir/known_hosts"
unset QNAP_SSH_PRIVATE_KEY QNAP_SSH_KNOWN_HOSTS
remote_command=$(python3 - <<'PY'
import os
import shlex
args = [os.environ[name] for name in (
    "IMAGE", "QNAP_COMPOSE_FILE", "QNAP_COMPOSE_PROJECT", "QNAP_COMPOSE_SERVICE", "REGISTRY_USER"
)]
args.append(os.environ.get("QNAP_DOCKER_BIN") or "docker")
print("IFS= read -r REGISTRY_TOKEN; export REGISTRY_TOKEN; sh -s -- " + shlex.join(args))
PY
)
# First line carries the ephemeral Actions token; remaining stdin is the script.
{
  printf '%s\n' "$REGISTRY_TOKEN"
  cat deploy/qnap-deploy.sh
} | ssh -T -p "${QNAP_SSH_PORT:-22}" -i "$ssh_dir/key" \
  -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$ssh_dir/known_hosts" -o ConnectTimeout=20 \
  -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
  "$QNAP_SSH_USER@$QNAP_HOST" "$remote_command"
