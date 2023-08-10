#!/usr/bin/with-contenv bashio
set +u

bashio::log.info "Running version 1.0.40"

export UNIFI_USERNAME=$(bashio::config 'unifi_username')
bashio::log.info "Unifi username configured as ${UNIFI_USERNAME}"

export UNIFI_PASSWORD=$(bashio::config 'unifi_password')
bashio::log.info "Unifi password configured as ********"

export UNIFI_SITE=$(bashio::config 'unifi_site')
bashio::log.info "Unifi site configured as ${UNIFI_SITE}"

export UNIFI_HOST=$(bashio::config 'unifi_host')
bashio::log.info "Unifi host configured as ${UNIFI_HOST}"

export UNIFI_PORT=$(bashio::config 'unifi_port')
bashio::log.info "Unifi port configured as ${UNIFI_PORT}"

export MQTT_ENDPOINT=$(bashio::config 'mqtt_endpoint')
bashio::log.info "MQTT endpoint as ${MQTT_ENDPOINT}"

export MQTT_USERNAME=$(bashio::config 'mqtt_username')
bashio::log.info "MQTT username as ${MQTT_USERNAME}"

export MQTT_PASSWORD=$(bashio::config 'mqtt_password')
bashio::log.info "MQTT password configured as ********"

export LISTENERS=$(bashio::config 'listeners')
bashio::log.info "LISTENERS configured as ${LISTENERS}"

bashio::log.info "Starting bridge service"
npm run start