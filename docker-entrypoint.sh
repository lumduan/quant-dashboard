#!/bin/sh
set -e

if [ -z "$API_UPSTREAM" ]; then
  echo "ERROR: API_UPSTREAM is not set" >&2
  exit 1
fi

# Substitute env vars in nginx template (only ${API_UPSTREAM} for now)
envsubst '${API_UPSTREAM}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
