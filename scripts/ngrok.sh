#!/usr/bin/env bash
set -e

CONFIGS="--config config/ngrok.yml"

if [[ "${OSTYPE}" == "darwin"* ]]; then
    CONFIGS="${CONFIGS} --config config/ngrok.yml"
fi

function stopitall {
  jobs -p | xargs kill
}

trap stopitall SIGINT

echo "[ngrok]: starting"

ngrok start ${CONFIGS} "$@" &

echo "[ngrok]: started"

WEBPACK_HOST=$(
  curl http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name == "watch") | .public_url' | \
  awk -F/ '{ print $3 }'
)
WEB_PUBLIC_URL=$(curl http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name == "web") | .public_url')

echo "============================================================="
echo "MicroMasters app hosted at: ${WEB_PUBLIC_URL}"
echo "============================================================="

echo "[docker-compose]: up"
docker-compose up \
  -e "WEBPACK_DEV_SERVER_HOST=${WEBPACK_HOST}" \
  -e WEBPACK_DEV_SERVER_HOST=80
