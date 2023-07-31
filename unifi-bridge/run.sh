#!/usr/bin/with-contenv bashio
set +u

export USERNAME=$(bashio::config 'username')
bashio::log.info "Username configured as ${USERNAME}."

export PASSWORD=$(bashio::config 'password')
bashio::log.info "Password configured as ********."

export SITE=$(bashio::config 'site')
bashio::log.info "Site configured as ${SITE}."

export HOST=$(bashio::config 'host')
bashio::log.info "Host configured as ${HOST}."

export PORT=$(bashio::config 'port')
bashio::log.info "Port configured as ${PORT}."

bashio::log.info "Starting bridge service."
npm run start