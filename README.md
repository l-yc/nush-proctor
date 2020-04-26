# nush-proctor

## TODO
[x] - Write script to auto create first admin user (init.js)
[ ] - Write init.sh
[ ] - Installation script?
[ ] - Check through Dependencies
[ ] - Add detailed installation instructions

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
