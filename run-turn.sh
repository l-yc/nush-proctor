#!/bin/sh

podman run -d --network=host \
    -v $(pwd)/my.conf:/etc/coturn/turnserver.conf \
    instrumentisto/coturn
