# nush-proctor

## TODO
[x] - Write script to auto create first admin user (init.js)
[ ] - Write init.sh
[ ] - Installation script?
[ ] - Check through Dependencies
[ ] - Add detailed installation instructions
[ ] - Clean up README

## Known Issues
* Disconnection detection does not work for Seer on Chrome

## Dependencies
* MongoDB ([install](https://docs.mongodb.com/manual/administration/install-community/))
* node.js ([install](https://nodejs.org/en/download/))
* npm

Make sure MongoDB is enabled and running, i.e. do sth like the following:
```shell
systemctl enable mongod
systemctl start mongod
```

## Installation
1. git clone
2. npm install
3. run init.sh

## Docker Notes
### Running
```
podman run --pod proctor --name nodetest --env DEBUG=proctor:* --rm -d 7d3948d3116e
podman run -it --pod proctor --name nodetest -v /home/ninja/dev/tmp:/usr/src/app/deploy --env DEBUG=proctor:* proctor
```
or refer to `./deploy/deploy.sh`

### Building
```
podman build .
```

### Deployment instructions (TODO)
# Proctor Deploy

## First things

Create running directory

```
mkdir proctor-deploy
cd proctor-deploy

mkdir deploy
mkdir data
```

## Firewall

```
firewall-cmd --set-default-zone=public
firewall-cmd --zone=public --add-port=3478/tcp --permanent
firewall-cmd --zone=public --add-port=3478/udp --permanent
firewall-cmd --zone=public --add-service=ssh --permanent
firewall-cmd --zone=public --add-service=dhcpv6-client --permanent
firewall-cmd --zone=public --add-port=49160-49200/tcp --permanent
firewall-cmd --zone=public --add-port=49160-49200/udp --permanent
firewall-cmd --zone=public --add-port 8080/tcp --permanent
```

## Create pod

```
podman pod create --name proctor -p 8080:8080
```

## MongoDB

```
podman pull mongo
```

## Proctor

```
podman login quay.io
```

type username and password

```
podman pull quay.io/l_yc/proctor:0.0.1
```

## TLS Certbot

```
sudo yum install certbot

# enable 80 port first
firewall-cmd --add-port=80/tcp
sudo certbot certonly --standalone
# ... follow instructions

firewall-cmd --remove-port=80/tcp
```

symlinks to keys are now in

**cert and chain:** /etc/letsencrypt/live/mystun.sytes.net/fullchain.pem

**key:** /etc/letsencrypt/live/mystun.sytes.net/privkey.pem

copy them to `proctor-deploy/deploy`

```
cp /etc/letsencrypt/archive/mystun.sytes.net/fullchain1.pem ./deploy/
cp /etc/letsencrypt/archive/mystun.sytes.net/privkey1.pem ./deploy/
```

for auto-renewal (**TODO**)

```
echo "0 0,12 * * * root python -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q --pre-hook 'service haproxy stop' --post-hook 'service haproxy start'" | sudo tee -a /etc/crontab > /dev/null
```

## Running

Create proctor config

```
// ./proctor-deploy/config.js

module.exports = {
  appName: 'nush-proctor',
  port: 8080,
  sessionSecret: 'D9QzvjnAQODzseeqPmI2DuAsZqu0oAyHNxnVgI5OtnHc1Od3v6upOZHp7Yvgmo6',
  tls: {
    privateKey: './deploy/privkey.pem',
    certificate: './deploy/fullchain.pem'
  },
  db: {
    url: 'mongodb://localhost/nush-proctor'
  },
  iceServers: [
    { urls:['stun:mystun.sytes.net:3478'] },
    {
      urls: ['turn:mystun.sytes.net:3478'],
      authSecret: 'aGVsbG90b2Z1c2FyZXRoZWJlc3R0aGluZ2ludGhld29ybGQ='
    }
  ]
};
```

Start TURN server

```
tmux # remember to install if not installed

turnserver -a -f -v -n --no-dtls --no-tls -r mystun.sytes.net -X 35.247.138.170 --use-auth-secret --static-auth-secret=aGVsbG90b2Z1c2FyZXRoZWJlc3R0aGluZ2ludGhld29ybGQ=
```

or,

```
podman run -d -p 3478:3478 \
    -v $(pwd)/my.conf:/etc/coturn/turnserver.conf \
    instrumentisto/coturn -c /etc/coturn/turnserver.conf \
    --external-ip='$(detect-external-ip)' \
    --relay-ip='$(detect-external-ip)'
```

Run mongo

```
podman run -d \
    -v $(pwd)/data:/data/db \
    --name mongodb \
    --pod proctor \
    mongo:4.0.18-xenial
```

Run proctor

```
setenforce 0
chmod -R 777 ./deploy

podman run -dit \
	--pod proctor \
	--name proctor-main \
	-v $(pwd)/deploy:/usr/src/app/deploy \
	--env DEBUG=proctor:* \
	proctor:0.0.1
```

First time: create admin user

```
podman exec -it proctor-main /bin/sh
node init.js
```

## Building

```
podman build . -t proctor
podman tag proctor quay.io/l_yc/proctor:0.0.1
podman push quay.io/l_yc/proctor:0.0.1
```
