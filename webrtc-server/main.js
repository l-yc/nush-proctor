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

async function fetchUserWithProctor(userId) {
  return new Promise((resolve, reject) => {
    User.findById(userId, function(err, _user) {
      //console.log('got user %s %o err %o', userId, _user, err);
      if (err) reject(err);
      else if (!_user) reject('cannot find user');
      else {
        user = {
          id: _user._id,
          username: _user.username,
          role: _user.role
        };

        if (_user.assignedProctor) {
          User.findOne({ username: _user.assignedProctor }, function(_err, __user) {
            if (_err) reject(_err);
            if (!__user) reject(err);
            user.seer = {
              id: __user._id
            }
            resolve(user);
          });
        } else resolve(user);
      }
    });
  });
}

module.exports = function(server, sessionMiddleware) {
  // variables and functions
  let online = {}; // TODO: if scaling, need a better storage 
  let socketUserMap = {};
  let seerSocketMap = {};

  function registerUser(socket, user) {
    if (online.hasOwnProperty(user.id)) {
      online[user.id].count += 1;
    } else {
      online[user.id] = {
        username: user.username,
        count: 1
      };  // Map of id to username. Ids are guaranteed to be unique
    }
    socketUserMap[socket.id] = user;
    if (user.role.includes('proctor')) seerSocketMap[user.id] = socket.id; // TODO: assuming seer only has 1 device

    socket.emit('config', {
      iceServers: getIceServers(user.id).iceServers,
      username: user.username
    });
    io.sockets.emit('online users', online);
  }

  function unregisterUser(socket, user) {
    delete socketUserMap[socket.id];
    if (user) {
      if (--online[user.id].count === 0) {
        delete online[user.id];
      }
      if (user.role.includes('proctor')) delete seerSocketMap[user.id];
    }
    io.sockets.emit('online users', online);
  }

  function getReceipient(srcSocketId, destSocketId) {
    console.log('Fetching receipient of %o using %o', srcSocketId, destSocketId);
    let user = socketUserMap[srcSocketId];
    if (user.role.includes('student')) {
      // Fixed destination for security
      return {
        socket: seerSocketMap[user.seer.id], // it's ok for seers to disconnect
        user: user.seer.id                   // students can reconnect back easily
      };                                     // once the seer reconnect
    } else { // proctor
      // for now, we'll trust the proctors
      // not anymore D:<
      if (!destSocketId || !socketUserMap[destSocketId]) {
        return {
          socket: null,
          user: null
        }
      } else {
        return {
          socket: destSocketId,                // don't care if this socket still exists
          user: socketUserMap[destSocketId].id // if it doesn't exist anymore, it will fail
        };                                     // which is handled by client-side js
      }
    }
  }

  // server
  const io = require('socket.io')(server);
  console.log('setting up webrtc server');

  io.use(function(socket, next){
    // Wrap the express middleware
    sessionMiddleware(socket.request, {}, next);
  })

  io.on('connection', socket => {
    if (!socket.request.session || !socket.request.session.passport) {
      console.log('Invalid connection: expired session or login.');
      socket.disconnect();
      return;
    }

    let user = null;

    socket.on('login', function(data) { // register user
      var userId = socket.request.session.passport.user;

      console.log(socket.id, userId, 'connected');

      fetchUserWithProctor(userId).then(_user => {
        console.log('fetched user %o', _user);
        user = _user;
        registerUser(socket, user);
      }).catch(err => {
        console.log('error %o', err);
        socket.disconnect();
      });
    });

    socket.on('disconnect', () => {
      if (user) console.log(socket.id, user.id, 'disconnected');
      unregisterUser(socket, user);
    });

    socket.on('submit offer', function(data) {
      console.log('Offer received from %o', {
        socket: socket.id,
        user: user.id
      });
      let to = getReceipient(socket.id, data.to);
      if (!to.socket) return; // nope, not a valid offer FIXME
      console.log('Forwarding offer to %o', to);
      socket.to(to.socket).emit('available offer', {
        offer: data.offer,
        from: {
          socket: socket.id,
          user: user.id
        }
      });
    });

    socket.on('accept offer', function(data) {
      console.log('Offer accepted');
      let to = getReceipient(socket.id, data.to);
      if (!to.socket) return; // something is wrong, FIXME
      console.log('Answering %o', to);
      socket.to(to.socket).emit('offer accepted', {
        answer: data.answer,
        from: {
          socket: socket.id,
          user: user.id
        }
      });
    });

    socket.on('submit candidate', function(data) {
      console.log('Candidate received from %o', {
        socket: socket.id,
        user: user.id
      });
      let to = getReceipient(socket.id, data.to);
      if (!to.socket) return; // something is wrong, FIXME
      console.log('Sending candidate to %o', to);
      socket.to(to.socket).emit('candidate available', {
        candidate: data.candidate,
        from: {
          socket: socket.id,
          user: user.id
        }
      });
    });

    socket.on('ping proctor', function(data) {
      console.log('Pinging proctor...');
      let to = getReceipient(socket.id, null); // slight abuse of the function
      if (!to.socket) return; // not a student or seer not available
      socket.to(to.socket).emit('student ping', {
        from: {
          socket: socket.id,
          user: user.id
        }
      });
    });
  });

  return io;
}
