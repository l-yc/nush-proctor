var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


// sockets
// craziness here
app.on('event:serverReady', function(server) {
    const io = require('socket.io')(server);

    let online = [];
    let offers = {};
    let candidates = {};
    let seer = null;
    io.on('connection', socket => {
        console.log(socket.id + ' connected');
        online.push(socket.id);
        io.emit('online users', JSON.stringify(online));

        socket.on('offer stream', function(data) {
            console.log('offer owo: ' + data);
            offers[socket.id] = data;
        });

        socket.on('whos online', function() {
            seer = socket.id;
            io.to(socket.id).emit('online users', JSON.stringify(online));
        });

        socket.on('what offers', function() {
            io.to(socket.id).emit('pending offers', JSON.stringify(offers));
        });

        socket.on('accepted offer', function(data) {
            console.log('wow accept');
            socket.to(data.to).emit('youre accepted', {
                from: socket.id,
                answer: data.answer
            });
        });

        socket.on('sending candidate', function(data) {
            if (data.to == null) data.to = seer;
            io.to(seer).emit('heres the candidate', {
                candidate: data.candidate,
                from: socket.id
            });
            candidates[data.from] = data.candidate;
        });

        socket.on('disconnect', () => {
            //online.remove(socket.id);
            delete offers[socket.id];
        });

        //socket.on('video stream', (stream) => {
        //    //socket.broadcast.emit('video stream', stream);
        //    io.broadcast.emit('video stream', stream);
        //});

        // To keep track of online users
        //socket.on('userPresence', function (data) {
        //    io.broadcast.emit('onlineUsers', onlineUsers);
        //});
    });
});


module.exports = app;
