module.exports = {
  appName: 'nush-proctor',
  port: 8080,
  sessionSecret: 'D9QzvjnAQODzseeqPmI2DuAsZqu0oAyHNxnVgI5OtnHc1Od3v6upOZHp7Yvgmo6',
  tls: {
    privateKey: '/etc/letsencrypt/live/parangninja.sytes.net/privkey.pem',
    certificate: '/etc/letsencrypt/live/parangninja.sytes.net/fullchain.pem'
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
