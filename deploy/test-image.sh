#!/usr/bin/env bash
# An isolated real-container test; never uses the user's database.
set -euo pipefail
image=${1:?Image required}
container="savingsapp-image-check-${GITHUB_RUN_ID:-$$}"
port=${IMAGE_TEST_PORT:-8083}
trap 'docker rm -fv "$container" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$container" -p "127.0.0.1:$port:8080" "$image"
wait_for_health() {
  for attempt in $(seq 1 60); do
    if [[ $(docker inspect --format '{{.State.Health.Status}}' "$container") == healthy ]]; then
      return 0
    fi
    sleep 2
  done
  docker logs "$container"
  return 1
}
wait_for_health
curl --fail --silent "http://127.0.0.1:$port/api/users" >/dev/null
curl --fail --silent --show-error "http://127.0.0.1:$port/api/portfolio-changes" \
  -H 'Content-Type: application/json' \
  --data "{\"requestId\":\"851343e6-adfd-4a7d-bd6c-fcd825f6a39e\",\"kind\":\"DEPOSIT\",\"owner\":\"jakub\",\"type\":\"KONTO_BANKOWE\",\"date\":\"$(date -u +%F)\",\"amountPln\":1}" >/dev/null
docker exec "$container" test -s /app/data/portfolio.mv.db
docker restart "$container" >/dev/null
wait_for_health
curl --fail --silent --show-error "http://127.0.0.1:$port/api/portfolio-performance?owner=jakub" |
  python3 -c 'import json,sys; value=json.load(sys.stdin); assert value["currentValuePln"] == 1 and value["contributedCapitalPln"] == 1, value'
