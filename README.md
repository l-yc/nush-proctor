# Seer
[![Docker Repository on Quay](https://quay.io/repository/l_yc/seer/status "Docker Repository on Quay")](https://quay.io/repository/l_yc/seer)

A simple web-based e-proctoring app that supports multiple inputs and devices.

*Note: These instructions are written for Linux.*

## Quick Start

You will need `podman` installed.

Paste the following code into the terminal:

```shell
git clone https://github.com/l-yc/nush-proctor && cd nush-proctor
cd deploy
mv config.example.js config.js
mv accounts.example.csv accounts.csv
cd ..
./quickstart.sh
```

Navigate to `localhost:8080` with your browser. The following default logins are available:

1. Admin/Proctor: username=`adminproctor`, password=`passadmin`
2. Proctor Only: username=`proctor`, password=`passproctor`
3. Student (under admin): username=`student1`, password=`pass1`
4. Student: (under proctor) username=`student2`, password=`pass2`

Caveat: This only work with STUN, i.e. you should refer to the next section for how to deploy it to the public.

## Configuration

To configure the coturn server, edit `quickstart.sh`:
- `DOMAIN_NAME`: Use the server's domain name.
- `EXTERNAL_IP`: Use the server's external IP.
- `AUTH_SECRET`: Generate a random string.

For `deploy/config.js`, the following fields should be changed:
- `sessionSecret`: Generate a random string. ([Best Practice](https://github.com/expressjs/session#secret))
- `iceServers.urls`: Replace `localhost` with the `DOMAIN_NAME` of your coturn server.
- `iceServers.auth`: Must be set to `AUTH_SECRET`.

When editing `accounts.csv`, the following rules must be followed:
- Format: `<role1>, ... ,<roleN>; <username>; <password>; [<proctor>]`
- One account per line. Accounts may be specified in any order.
- `<roleN>`: Must be one of `admin`, `proctor`, or `student`. Multiple roles may be specified in any order
- `[<proctor>]`: Optional. Should be a proctor's username.
Note that the validation does **not** check if a proctor specified exists.

## Building

WIP
