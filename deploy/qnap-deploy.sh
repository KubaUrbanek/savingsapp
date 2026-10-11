#!/bin/sh
# Runs on the NAS. Existing Compose configuration remains authoritative.
set -eu
umask 077

image=${1:?Image digest required}
compose_file=${2:?Absolute Compose file required}
project=${3:?Existing Compose project required}
service=${4:?Existing Compose service required}
registry_user=${5:?Registry user required}
docker_bin=${6:-docker}
resource_file=${7:-}

fail() { printf '%s\n' "$*" >&2; exit 1; }
case "$image" in ghcr.io/*@sha256:*) ;; *) fail 'Use an immutable GHCR digest.' ;; esac
repository=${image%@sha256:*}
case "$repository" in *[!a-z0-9/._-]*) fail 'Invalid image repository.' ;; esac
digest=${image##*@sha256:}
case "$digest" in *[!a-f0-9]*) fail 'Invalid image digest.' ;; esac
[ "${#digest}" -eq 64 ] || fail 'Invalid image digest length.'
case "$compose_file" in /*) ;; *) fail 'Compose path must be absolute.' ;; esac
for name in "$project" "$service"; do
    case "$name" in ''|*[!a-zA-Z0-9_-]*|[-_]*) fail 'Invalid project or service name.' ;; esac
done
[ -f "$compose_file" ] || fail 'Existing Compose file not found.'
if [ -n "$resource_file" ]; then
    case "$resource_file" in /*) ;; *) fail 'Resource Compose path must be absolute.' ;; esac
    [ -f "$resource_file" ] || fail 'Resource Compose file not found.'
fi
cd "$(dirname "$compose_file")"

if "$docker_bin" compose version >/dev/null 2>&1; then
    compose_backend=plugin
elif command -v docker-compose >/dev/null 2>&1; then
    compose_backend=standalone
else
    fail 'Docker Compose v2 is required.'
fi
compose_raw() {
    if [ "$compose_backend" = plugin ]; then
        "$docker_bin" compose "$@"
    else
        docker-compose "$@"
    fi
}
case "$(compose_raw version --short)" in v2.*|2.*) ;; *) fail 'Docker Compose v2 is required.' ;; esac

state_dir=$(pwd)/.savingsapp-deploy
mkdir -p "$state_dir"
chmod 700 "$state_dir"
mkdir "$state_dir/lock" 2>/dev/null || fail 'Another deployment holds the lock. Check it before removing .savingsapp-deploy/lock.'
override=$state_dir/override.yml
rollback_needed=false
registry_config=
old_container=
old_image=

compose_base() {
    if [ -n "$resource_file" ]; then
        compose_raw -p "$project" -f "$compose_file" -f "$resource_file" "$@"
    else
        compose_raw -p "$project" -f "$compose_file" "$@"
    fi
}
compose() {
    if [ -f "$override" ]; then
        compose_base -f "$override" "$@"
    else
        compose_base "$@"
    fi
}
write_image() {
    printf 'services:\n  %s:\n    image: "%s"\n' "$service" "$1" > "$override.tmp"
    mv "$override.tmp" "$override"
}
finish() {
    result=$?
    trap - 0 HUP INT TERM
    if [ "$rollback_needed" = true ]; then
        printf '%s\n' 'Deployment failed; restoring the previous image. The data file is preserved.' >&2
        if write_image "$old_image" && compose up -d --no-deps --force-recreate --pull never "$service"; then
            printf '%s\n' 'Previous image restarted. The pre-deployment data backup remains on the NAS.' >&2
        else
            printf '%s\n' 'ROLLBACK FAILED: manual recovery is required; backup is in .savingsapp-deploy.' >&2
        fi
        result=1
    fi
    [ -z "$registry_config" ] || rm -rf "$registry_config"
    rm -f "$override.tmp"
    rmdir "$state_dir/lock"
    exit "$result"
}
trap finish 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

old_container=$(compose ps -q "$service")
[ -n "$old_container" ] || fail 'No running service found. Set up the existing Compose service first.'
case "$old_container" in *[!a-zA-Z0-9]*) fail 'Exactly one existing container is required.' ;; esac
[ "$("$docker_bin" inspect --format '{{.State.Running}}' "$old_container")" = true ] || fail 'Existing service is not running.'
old_image=$("$docker_bin" inspect --format '{{.Image}}' "$old_container")
database=$("$docker_bin" inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$old_container" | awk '/^APP_DATABASE_FILE=/ {sub(/^APP_DATABASE_FILE=/, ""); print; exit}')
case "$database" in /*) ;; *) fail 'Set APP_DATABASE_FILE to an absolute path in a persistent volume first.' ;; esac
case "$database" in */../*|*/..|*/./*|*/.) fail 'Database path must be normalized.' ;; esac
mounts=$("$docker_bin" inspect --format '{{range .Mounts}}{{if .RW}}{{println .Destination}}{{end}}{{end}}' "$old_container")
persisted=false
while IFS= read -r mount; do
    [ -n "$mount" ] || continue
    case "$database" in "$mount"/*) persisted=true ;; esac
done <<EOF
$mounts
EOF
[ "$persisted" = true ] || fail 'Database is not inside a writable persistent directory mount.'

# Login is isolated and removed on all exit paths; no permanent PAT on the NAS.
registry_config=$(mktemp -d)
[ -n "${REGISTRY_TOKEN:-}" ] || fail 'Registry token is required.'
printf '%s\n' "$REGISTRY_TOKEN" | DOCKER_CONFIG="$registry_config" "$docker_bin" login ghcr.io --username "$registry_user" --password-stdin >/dev/null
unset REGISTRY_TOKEN
# Keep the NAS's normal CLI config for Compose/plugin discovery.
DOCKER_CONFIG="$registry_config" "$docker_bin" pull "$image"
new_image=$("$docker_bin" image inspect --format '{{.Id}}' "$image")
backup=$(mktemp -d "$state_dir/backup.XXXXXXXX")
printf '%s\n' "$old_image" > "$backup/previous-image.txt"

# Never run two JVMs against the same JSON file. Pull before downtime starts.
rollback_needed=true
compose stop -t 30 "$service"
"$docker_bin" cp "$old_container:$database" "$backup/database.json"
chmod 600 "$backup/database.json"
write_image "$image"
compose up -d --no-deps --force-recreate --pull never "$service"
new_container=$(compose ps -q "$service")
[ -n "$new_container" ] || fail 'New container was not created.'
[ "$("$docker_bin" inspect --format '{{.Image}}' "$new_container")" = "$new_image" ] || fail 'Compose did not start the requested image.'
attempt=0
health_attempts=${HEALTH_ATTEMPTS:-60}
case "$health_attempts" in ''|*[!0-9]*) fail 'Invalid health attempts.' ;; esac
while [ "$attempt" -lt "$health_attempts" ]; do
    [ "$("$docker_bin" inspect --format '{{.State.Running}}' "$new_container")" = true ] || fail 'New container exited.'
    health=$("$docker_bin" inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$new_container")
    if [ "$health" = healthy ]; then
        rollback_needed=false
        printf 'Deployment healthy. Backup: %s\n' "$backup"
        exit 0
    fi
    [ "$health" != missing ] || fail 'The deployed image must have a health check.'
    attempt=$((attempt + 1))
    sleep 2
done
fail 'Health check timed out.'
