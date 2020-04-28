module.exports = {
  appName: 'nush-proctor',
  port: 8080,
  privateKey: '/etc/letsencrypt/live/parangninja.sytes.net/privkey.pem',
  certificate: '/etc/letsencrypt/live/parangninja.sytes.net/fullchain.pem',
  sessionSecret: 'D9QzvjnAQODzseeqPmI2DuAsZqu0oAyHNxnVgI5OtnHc1Od3v6upOZHp7Yvgmo6',
  db: {
      url: 'mongodb://localhost/nush-proctor'
  }
};
