#!/usr/bin/env sh
set -eo pipefail

config_file=/usr/local/etc/stream-overlay/stream-overlay.config.json

>&1 echo "Generating stream-overlay.config.json..."
cp $config_file.docker $config_file

## FUZION_LOGGING

# password
section=""
if [ -n "$APP_TWITCH_PASSWORD" ]; then
  section="$APP_TWITCH_PASSWORD"
fi
section="$(echo "$section" | sed 's/\//\\\//g')"
sed -i "s/#PASSWORD/${section}/g" $config_file

# password
section=""
if [ -n "$APP_TWITCH_CLIENT_ID" ]; then
  section="$APP_TWITCH_CLIENT_ID"
fi
section="$(echo "$section" | sed 's/\//\\\//g')"
sed -i "s/#CLIENT_ID/${section}/g" $config_file

# >&2 echo "$(cat $config_file)"

echo "su stream-overlay -c '$*'"
su stream-overlay -c "$*"
