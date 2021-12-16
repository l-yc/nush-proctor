module.exports = {
  appName: 'virtual-proctor',
  port: 8080,
  sessionSecret: 'changeme',
  db: {
    type: 'file',
    url: './deploy/accounts.csv'
  },
  iceServers: [
    { urls:['stun:localhost:3478'] },
    {
      urls: ['turn:localhost:3478'],
      authSecret: 'changeme'
    }
  ]
};
