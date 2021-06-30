# nush-proctor

A proctoring application written in Node.js that allows webcam and screen sharing.

## TODO

- [x] Write script to auto create first admin user (init.js)
- [ ] Write init.sh
- [ ] Installation script?
- [x] Check through Dependencies
- [x] Add detailed installation instructions
- [x] Clean up README
- [ ] Improve README
- [ ] Add usage guide
- [ ] Add system requirements

## Known Issues
* ~~Disconnection detection does not work for Seer on Chrome~~ Fixed in v0.0.2
* ~~Cockpit crashes when empty lines are saved in accounts.csv~~ Fixed in v0.2.1

## Dependencies

* Node.js > v10 ([install](https://nodejs.org/en/download/))
* npm
* [Optional] MongoDB ([install](https://docs.mongodb.com/manual/administration/install-community/))
* [Optional] CoTURN ([install](https://github.com/coturn/coturn))

## Installation

```shell
git clone https://github.com/l-yc/nush-proctor && cd nush-proctor
npm install
```

## Building

```
VERSION= 		# specify a version
podman build . -t proctor
podman tag proctor quay.io/l_yc/proctor:$VERSION
podman push quay.io/l_yc/proctor:$VERSION
```

## Configuration

A sample configuration file for local development is provided in `./deploy/config.js`.

```javascript
module.exports = {
  appName: 'nush-proctor',
  port: 8080,
  sessionSecret: 'insertsessionsecret',
  tls: {
    privateKey: './testing/server.key',
    certificate: './testing/server.crt'
  },
  db: {
    type: 'file',
    url: './deploy/accounts.csv'
  },
  iceServers: [
    { urls:['stun:localhost:3478'] },
    {
      urls: ['turn:localhost:3478'],
      authSecret: 'insertauthsecret'
    }
  ]
};
```

* **appName:** Name to display on  the page
* **port:** Port for the web server and signaling server to listen on
* **sessionSecret:** Secret used by express-sessions.
* **tls:** Configuration for HTTPS (required for media sharing)
  * **privateKey:** Path to your private key, relative to the root directory of the repository
  * **certificate:** Path to your TLS certificate, relative to the root directory of the repository
* **db:** Configuration for Database:
  * **type:** Type of data storage you want to use (currently only for user logins)
    * `'mongo'`: Uses MongoDB to store data. MongoDB dependency is required. **WARNING: This feature has not been robustly tested.**
    * `'file'`: Uses a csv file to store data.
  * **url:** Connection information for the database:
    * `'mongo'`: Use the database url, e.g. `'mongodb://localhost/nush-proctor'`
    * `'file'`: Uses a csv file to store data.
* **iceServers:** Configuration for ICE Servers used by WebRTC. Contains a list of servers, which have the following fields:
  * **url:** Url to the ICE Server, takes the form `<protocol>:<domain>:<port>`.
  * **authSecret:** Required if you are using TURN REST api.

## Deployment

There are two options, podman is recommended in most cases unless you would like to modify the code.

### Direct

Ensure you have installed all the dependencies correctly.

Make sure MongoDB is enabled and running, i.e. do sth like the following:

```shell
systemctl enable mongod
systemctl start mongod
```

Start the proctor

```shell
npm start
```

For details on TURN server, refer to Podman section or Google.

### With Podman

#### Running
```
podman run --pod proctor --name nodetest --env DEBUG=proctor:* --rm -d 7d3948d3116e
podman run -it --pod proctor --name nodetest -v /home/ninja/dev/tmp:/usr/src/app/deploy --env DEBUG=proctor:* proctor
```
or refer to `./deploy/deploy.sh`


##### First things
Create running directory
```
mkdir proctor-deploy
cd proctor-deploy

mkdir deploy
mkdir data
```

Make sure you have all the necessary tools

````
yum install vim firewalld tmux podman wget
systemctl enable --now firewalld
````

##### Configure firewall

```
firewall-cmd --set-default-zone=public
firewall-cmd --zone=public --add-port=3478/tcp --permanent
firewall-cmd --zone=public --add-port=3478/udp --permanent
firewall-cmd --zone=public --add-service=ssh --permanent
firewall-cmd --zone=public --add-service=dhcpv6-client --permanent
firewall-cmd --zone=public --add-port=49160-49200/tcp --permanent
firewall-cmd --zone=public --add-port=49160-49200/udp --permanent
firewall-cmd --zone=public --add-port=8080/tcp --permanent
sudo systemctl restart firewalld # load in the changes
```

##### Create pod
```
podman pod create --name proctor -p 8080:8080
```
##### Pull Images
Fetch proctor
```
podman login quay.io
```
Type username and password
```
podman pull quay.io/l_yc/proctor:$VERSION
```
Fetch MongoDB (optional)
```
podman pull mongo
```
##### Set up TLS Certbot
```
# CentOS 7
sudo yum install certbot

# enable 80 port first
firewall-cmd --add-port=80/tcp
sudo certbot certonly --standalone
# ... follow instructions

firewall-cmd --remove-port=80/tcp

# CentOS 8
wget https://dl.eff.org/certbot-auto
sudo mv certbot-auto /usr/local/bin/certbot-auto
sudo chown root /usr/local/bin/certbot-auto
sudo chmod 0755 /usr/local/bin/certbot-auto

sudo /usr/local/bin/certbot-auto certonly --standalone # remaining steps are the same
```
Symlinks to keys are now in (copy them to `./proctor-deploy/deploy`)

* **cert and chain:** `/etc/letsencrypt/live/$DOMAIN/fullchain.pem`
* **key:** `/etc/letsencrypt/live/$DOMAIN/privkey.pem`

```
cp /etc/letsencrypt/archive/mystun.sytes.net/fullchain1.pem ./deploy/
cp /etc/letsencrypt/archive/mystun.sytes.net/privkey1.pem ./deploy/
```
For auto-renewal (**TODO**)
```
echo "0 0,12 * * * root python -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q --pre-hook 'service haproxy stop' --post-hook 'service haproxy start'" | sudo tee -a /etc/crontab > /dev/null
```

##### Running
Create proctor config (follow instructions from **Configuration**):
```
// ./proctor-deploy/deploy/config.js

module.exports = {
  appName: 'nush-proctor',
  port: 8080,
  sessionSecret: <SESSIONSECRET>,
  tls: {
    privateKey: './deploy/privkey.pem',
    certificate: './deploy/fullchain.pem'
  },
  db: {
    url: 'mongodb://localhost/nush-proctor'
  },
  iceServers: [
    { urls:['stun:offbyone.xyz:3478'] },
    {
      urls: ['turn:offbyone.xyz:3478'],
      authSecret: <AUTHSECRET>
    }
  ]
};
```

Start TURN server (run `sudo yum install tmux coturn` if they are not installed)
```
tmux
# inside tmux
turnserver -a -f -v -n --no-dtls --no-tls -r mystun.sytes.net -X 35.247.138.170 --use-auth-secret --static-auth-secret=<AUTHSECRET>
```

or,
```
# use this
podman run -d \
	--name coturn \
	--network=host docker.io/instrumentisto/coturn \
    -n --verbose \
    --lt-cred-mech --fingerprint \
    --no-dtls --no-tls \
    --realm=seer.offbyone.xyz --external-ip=167.71.208.87 \
    --use-auth-secret \
    --static-auth-secret=<AUTHSECRET>= \
    --min-port=49160 --max-port=49200
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
setenforce 0	# TODO need a policy for this
#chmod -R 777 ./deploy

podman run -it \
    --pod proctor \
    --name proctor-main \
    -v $(pwd)/deploy:/usr/src/app/deploy \
    --env DEBUG=proctor:* \
    quay.io/l_yc/proctor:0.2.0
```

(OPTIONAL, if using MongoDB) First time: create admin user
```
podman exec -it proctor-main /bin/sh
node init.js
```

Combined run script

```
# pod
podman pod create --name proctor -p 8080:8080

# coturn
podman run -d \
    --name coturn \
    --network=host docker.io/instrumentisto/coturn \
    -n --verbose \
    --lt-cred-mech --fingerprint \
    --no-dtls --no-tls \
    --realm=seer.offbyone.xyz --external-ip=167.71.208.87 \
    --use-auth-secret \
    --static-auth-secret=<AUTHSECRET> \
    --min-port=49160 --max-port=49200

# seer
podman run -dit \
    --pod proctor \
    --name proctor-main \
    -v $(pwd)/deploy:/usr/src/app/deploy \
    --env DEBUG=proctor:* \
    quay.io/l_yc/proctor:0.2.0
```

### Changelog

* v0.2.0
  * UI Enhancements
  * Improved error handling
  * Admin Cockpit
  * Proctor pinging
* v0.1.0
  * Student Login
  * Student Proctor Mapping
* v0.0.2
  * Chrome disconnection issue bug fixes
* v0.0.1
* v0.0.0
