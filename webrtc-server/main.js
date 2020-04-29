var crypto = require('crypto');

function getTURNCredentials(name, secret){
  var unixTimeStamp = parseInt(Date.now()/1000) + 24*3600,   // this credential would be valid for the next 24 hours
    username = [unixTimeStamp, name].join(':'),
    password,
    hmac = crypto.createHmac('sha1', secret);
  hmac.setEncoding('base64');
  hmac.write(username);
  hmac.end();
  password = hmac.read();
  return {
    username: username,
    password: password
  };
}

function getIceServers(name) {
  return {
    iceServers: global.config.iceServers.map(server => {
      if (server.urls[0].substr(0,4) === 'turn') {
        let credentials = getTURNCredentials(name,server.authSecret)
        server = {
          urls: server.urls,
          username: credentials.username,
          credential: credentials.password
        }
      }
      return server;
    })
  };
}

module.exports = function(server) {
  const io = require('socket.io')(server);

  let online = {};
  let candidates = {};
  let seer = null;  // TODO: allow more than 1 seer
  io.on('connection', socket => {
    console.log(socket.id + ' connected');

    socket.on('login', function(data) { // register user
      let credentials;
      if (data.secret === 'AWTX2fBlP+6CDYamKfPZ+A==') {
        seer = socket.id;   // TODO: need to have a more legit way to identify seer
        console.log('Seer registered: ' + seer);
        socket.emit('iceServers', getIceServers('seer'));
      } else {
        online[socket.id] = data.username;  // TODO: probably should have uniqueness check?
        socket.emit('iceServers', getIceServers(data.username));
      }
      io.sockets.emit('online users', online);
    });

    socket.on('disconnect', () => {
      //online.remove(socket.id);
      delete online[socket.id];
      delete candidates[socket.id];
      io.sockets.emit('online users', online);
    });

    socket.on('submit offer', function(data) {
      console.log('Offer received: %o', data);
      if (data.to == null) data.to = seer;
      console.log('Forwarding offer to ' + data.to);
      socket.to(data.to).emit('available offer', {
        offer: data.offer,
        from: socket.id
      });
    });

    socket.on('accept offer', function(data) {
      console.log('Offer accepted');
      socket.to(data.to).emit('offer accepted', {
        answer: data.answer,
        from: socket.id
      });
    });

    socket.on('submit candidate', function(data) {
      console.log('Candidate received from %s: %o', socket.id, data.candidate);
      if (data.to == null) data.to = seer;
      console.log('Sending candidate to ' + data.to);
      socket.to(data.to).emit('candidate available', {
        candidate: data.candidate,
        from: socket.id
      });
      candidates[socket.id] = data.candidate;
    });
  });

  return io;
}
