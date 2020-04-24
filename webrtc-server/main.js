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
      console.log('Offer received: ' + data);
      if (data.to == null) data.to = seer;
      console.log('forwarding to ' + data.to);
      io.to(data.to).emit('available offer', {
        offer: data.offer,
        from: socket.id
      });
    });

    socket.on('accept offer', function(data) {
      console.log('Offer accepted');
      socket.to(data.to).emit('offer accepted', {
        from: socket.id,
        answer: data.answer
      });
    });

    socket.on('submit candidate', function(data) {
      //console.log('Candidate received: ' + JSON.stringify(data.candidate));
      if (data.to == null) data.to = seer;
      io.to(data.to).emit('candidate available', {
        candidate: data.candidate,
        from: socket.id
      });
      candidates[socket.id] = data.candidate;
    });
  });

}
