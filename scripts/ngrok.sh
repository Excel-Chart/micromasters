#!/usr/bin/env bash
set -e

CONFIGS="--config config/ngrok.yml"

if [[ "${OSTYPE}" == "darwin"* ]]; then
    CONFIGS="${CONFIGS} --config config/ngrok.yml"
fi

function stopitall {
  jobs -p | xargs kill
}

trap stopitall SIGHUP SIGINT SIGTERM

echo "[ngrok]: starting"

ngrok start ${CONFIGS} "$@" &

echo "[ngrok]: started"

sleep 5

export WEBPACK_DEV_SERVER_HOST=$(
  curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name == "watch") | .public_url' | \
  awk -F/ '{ print $3 }'
)
export WEBPACK_DEV_SERVER_PORT=80
WEB_PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name == "web") | .public_url')

echo "============================================================="
echo "MicroMasters app hosted at: ${WEB_PUBLIC_URL}"
echo "============================================================="
read -n 1 -s -p "Copy the url above, then press any key to continue launching the app"
echo ""
echo "[docker-compose]: up"
docker-compose up
