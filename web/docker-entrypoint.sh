#!/usr/bin/env sh
set -eo pipefail

config_file=/usr/share/nginx/html/app.properties.js
if [ ! -f $config_file ]; then
  cp $config_file.docker $config_file

  # fuzionOptions.apiEndpoint
  section=""
  if [ -n "$APP_WEB_HOST_PUBLIC" ]; then
    if [ "$APP_WEB_SECURE_PUBLIC" == "true" ]; then
      section="$section\nappOptions.apiEndpoint = 'https://$APP_WEB_HOST_PUBLIC:$APP_WEB_PORT_PUBLIC/api';"
    else
      section="$section\nappOptions.apiEndpoint = 'http://$APP_WEB_HOST_PUBLIC:$APP_WEB_PORT_PUBLIC/api';"
    fi
  fi

  # fuzionOptions.socketEndpoint
  if [ -n "$APP_WEB_HOST_PUBLIC" ]; then
    if [ "$APP_WEB_SECURE_PUBLIC" == "true" ]; then
      section="$section\nappOptions.socketEndpoint = 'wss://$APP_WEB_HOST_PUBLIC:$APP_WEB_PORT_PUBLIC/ws';"
    else
      section="$section\nappOptions.socketEndpoint = 'ws://$APP_WEB_HOST_PUBLIC:$APP_WEB_PORT_PUBLIC/ws';"
    fi
  fi

  section="$(echo "$section" | sed 's/\//\\\//g')"
  sed -i "s/\/\/##APP_WEB/${section:2}/g" $config_file
fi

config_file=/etc/nginx/conf.d/default.conf
if [ ! -f $config_file ]; then
  cp $config_file.docker $config_file

  # APP_SVC_HOST_DOCKER
  app_svc_host="app-svc"
  if [ -n "$APP_SVC_HOST_DOCKER" ]; then
    app_svc_host=$APP_SVC_HOST_DOCKER
  fi
  sed -i "s/\$APP_SVC_HOST_DOCKER/$app_svc_host/g" $config_file 

  # APP_SVC_PORT_DOCKER
  app_svc_port="8884"
  if [ -n "$APP_SVC_PORT_DOCKER" ]; then
    app_svc_port=$APP_SVC_PORT_DOCKER
  fi
  sed -i "s/\$APP_SVC_PORT_DOCKER/$app_svc_port/g" $config_file

  # Get resolver
  resolver=$(cat /etc/resolv.conf | grep nameserver | awk -F" " '{print $2}')
  sed -i "s/127.0.0.11/$resolver/g" $config_file
fi

exec "$@"
