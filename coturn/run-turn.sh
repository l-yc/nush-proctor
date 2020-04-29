#!/bin/sh

#podman run -d --network=host \
#    -v $(pwd)/my.conf:/etc/coturn/turnserver.conf \
#    instrumentisto/coturn

sudo firewall-cmd --add-port=3478/tcp
sudo firewall-cmd --add-port=3478/udp

#podman run -d --network=host \
podman run -d -p 3478:3478 \
    -v $(pwd)/my.conf:/etc/coturn/turnserver.conf \
    instrumentisto/coturn -c /etc/coturn/turnserver.conf \
    --external-ip='$(detect-external-ip)' \
    --relay-ip='$(detect-external-ip)'
