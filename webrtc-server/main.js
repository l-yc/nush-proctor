var crypto = require('crypto');

var User = require('../models/user.js').model;
var UserLocal = require('../models/userLocal.js').model;

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

module.exports = function(server, sessionMiddleware) {
  const io = require('socket.io')(server);
  console.log('setting up webrtc server');

  io.use(function(socket, next){
    // Wrap the express middleware
    sessionMiddleware(socket.request, {}, next);
  })

  let online = {};
  let socketMap = {};
  let seer = null;  // TODO: allow more than 1 seer
  io.on('connection', socket => {
    if (!socket.request.session || !socket.request.session.passport) {
      socket.disconnect();
      return;
    }

    let user = null;

    socket.on('login', function(data) { // register user
      var userId = socket.request.session.passport.user;

      console.log(socket.id, userId, 'connected');

      new Promise((resolve, reject) => {
        if (global.config.db.enabled) {
          User.findById(userId, function(err, _user) {
            if (err) reject(err);
            else resolve({
              id: _user._id,
              username: _user.username,
              role: null  // TODO: fix this to work with db
            });
          });
        } else {
          UserLocal.findById(userId, function(err, _user) {
            console.log('got the user %s %o %s %s', userId, _user, userId, socket.id);
            if (err) reject(err);
            if (!_user) reject('cannot find user');
            user = {
              id: _user.id,
              username: _user.username,
              role: _user.role
            };
            if (_user.assignedProctor) {
              UserLocal.findOne({ username: _user.assignedProctor }, function(err, __user) {
                if (err) reject(err);
                user.seer = __user.id;
                resolve(user);
              });
            } else resolve(user);
          });
        }
      }).then(_user => {
        user = _user;

        let credentials;
        socketMap[user.id] = socket.id;  // TODO: need to give username also
        online[user.id] = user.username;
        socket.emit('config', {
          iceServers: getIceServers(user.id).iceServers,
          seer: (user.role === 'proctor' ? null : user.seer),
          username: user.username
        });
        io.sockets.emit('online users', online);
      }).catch(err => {
        console.log(err);
        socket.disconnect();
      });
    });

    socket.on('disconnect', () => {
      delete socketMap[user.id];
      delete online[user.id];
      io.sockets.emit('online users', online);
    });

    socket.on('submit offer', function(data) {
      console.log('Offer received: %o', data);
      console.log('Forwarding offer to ' + socketMap[data.to]);
      socket.to(socketMap[data.to]).emit('available offer', {
        offer: data.offer,
        from: user.id
      });
    });

    socket.on('accept offer', function(data) {
      console.log('Offer accepted');
      socket.to(socketMap[data.to]).emit('offer accepted', {
        answer: data.answer,
        from: user.id
      });
    });

    socket.on('submit candidate', function(data) {
      //console.log('Candidate received from %s: %o', user.id, data.candidate);
      console.log('Candidate received from %s', user.id);
      console.log('Sending candidate to ' + data.to);
      socket.to(socketMap[data.to]).emit('candidate available', {
        candidate: data.candidate,
        from: user.id
      });
    });
  });

  return io;
}
