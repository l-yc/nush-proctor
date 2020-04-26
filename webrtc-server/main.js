module.exports = function(server) {
  const io = require('socket.io')(server);

  let online = {};
  let candidates = {};
  let seer = null;  // TODO: allow more than 1 seer
  io.on('connection', socket => {
    console.log(socket.id + ' connected');

    socket.on('login', function(data) { // register user
      if (data.secret === 'AWTX2fBlP+6CDYamKfPZ+A==') {
        seer = socket.id;   // TODO: need to have a more legit way to identify seer
        console.log('Seer registered: ' + seer);
      } else {
        online[socket.id] = data.username;  // TODO: probably should have uniqueness check?
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

}
