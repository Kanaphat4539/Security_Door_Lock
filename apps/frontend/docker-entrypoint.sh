#!/bin/sh
set -e

until wget -qO- http://backend:3001/api >/dev/null 2>&1; do
  echo "Waiting for backend..."
  sleep 2
done

exec npm run dev
