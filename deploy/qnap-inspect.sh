#!/bin/sh
# Read-only diagnostics. Never print the full inspect output or environment.
set -eu
container=${1:?Existing container required}
docker_bin=${2:-docker}
case "$container" in ''|*[!a-zA-Z0-9_.-]*|[-.]*) echo 'Invalid container name.' >&2; exit 1 ;; esac
printf 'Architecture: '; uname -m
"$docker_bin" version --format 'Docker server: {{.Server.Version}}'
if "$docker_bin" compose version >/dev/null 2>&1; then
    "$docker_bin" compose version
elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose version
else
    printf '%s\n' 'Docker Compose: unavailable'
fi
"$docker_bin" inspect --format 'Running: {{.State.Running}}
Image: {{.Config.Image}}
User: {{.Config.User}}
Restart: {{.HostConfig.RestartPolicy.Name}}
Compose project: {{index .Config.Labels "com.docker.compose.project"}}
Compose service: {{index .Config.Labels "com.docker.compose.service"}}
Compose files: {{index .Config.Labels "com.docker.compose.project.config_files"}}' "$container"
"$docker_bin" port "$container"
"$docker_bin" inspect --format '{{range .Mounts}}{{println .Type .Name .Source "->" .Destination "writable=" .RW}}{{end}}' "$container"
"$docker_bin" inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$container" |
    awk '/^APP_DATABASE_FILE=/ {print}'
project=$("$docker_bin" inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$container")
case "$project" in ''|'<no value>')
    printf '%s\n' 'Deployment not ready: standalone container. Migrate to Compose before enabling QNAP_DEPLOY_ENABLED.'
    exit 1
    ;;
esac
printf '%s\n' 'Compose labels found. Verify the reported file and service before enabling deployment.'
