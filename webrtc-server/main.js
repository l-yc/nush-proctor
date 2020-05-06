var crypto = require('crypto');

var User = require('../models/db').models.UserHelper.model;

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
        User.findById(userId, function(err, _user) {
          //console.log('got user %s %o %s %s', userId, _user, userId, socket.id);
          if (err) reject(err);
          else if (!_user) reject('cannot find user');
          else {
            user = {
              id: _user._id,
              username: _user.username,
              role: _user.role
            };

            if (_user.assignedProctor) {
              User.findOne({ username: _user.assignedProctor }, function(err, __user) {
                if (err) reject(err);
                if (!__user) reject(err);
                user.seer = {
                  socket: null, // we dont know this yet
                  user: __user._id
                }
                resolve(user);
              });
            } else resolve(user);
          }
        });
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
      //console.log('Offer received: %o', data);
      console.log('Offer received from %o', {
        socket: socket.id,
        user: user.id
      });
      if (!data.to.socket) { // this only happens when sending to the seer
        data.to.socket = socketMap[data.to.user]; // TODO: assuming seer only has 1 device
      }
      console.log('Forwarding offer to %o', data.to);
      socket.to(data.to.socket).emit('available offer', {
        offer: data.offer,
        from: {
          socket: socket.id,
          user: user.id
        }
      });
    });

    socket.on('accept offer', function(data) {
      console.log('Offer accepted');
      if (!data.to.socket) { // this only happens when sending to the seer
        data.to.socket = socketMap[data.to.user]; // TODO: assuming seer only has 1 device
      }
      console.log('Answering %o', data.to);
      socket.to(data.to.socket).emit('offer accepted', {
        answer: data.answer,
        from: {
          socket: socket.id,
          user: user.id
        }
      });
    });

    socket.on('submit candidate', function(data) {
      //console.log('Candidate received from %s: %o', user.id, data.candidate);
      console.log('Candidate received from %o', {
        socket: socket.id,
        user: user.id
      });
      if (!data.to.socket) { // this only happens when sending to the seer
        data.to.socket = socketMap[data.to.user]; // TODO: assuming seer only has 1 device
      }
      console.log('Sending candidate to %o', data.to);
      socket.to(data.to.socket).emit('candidate available', {
        candidate: data.candidate,
        from: {
          socket: socket.id,
          user: user.id
        }
      });
    });
  });

  return io;
}
