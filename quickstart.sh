#!/bin/sh

# config
DOMAIN_NAME=
EXTERNAL_IP=
AUTH_SECRET=changeme

# reset
podman stop coturn
podman stop seer
podman rm coturn
podman rm seer

# coturn
podman run -d \
    --name coturn \
    --network=host coturn/coturn \
    -n --verbose \
    --lt-cred-mech --fingerprint \
    --no-dtls --no-tls \
    --realm=$DOMAIN_NAME --external-ip=$EXTERNAL_IP \
    --use-auth-secret \
    --static-auth-secret=$AUTH_SECRET \
    --min-port=49160 --max-port=49200

# seer: mount with :Z flag if selinux is enabled
podman run -dit \
    -p 8080:8080 \
    --name seer \
    -v $(pwd)/deploy:/usr/src/app/deploy:Z \
    --env DEBUG=proctor:* \
    proctor
