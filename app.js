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

    let online = {};
    let offers = {};
    let candidates = {};
    let seer = {};
    io.on('connection', socket => {
        console.log(socket.id + ' connected');
        //online.push(socket.id);
        //io.emit('online users', JSON.stringify(online));

        socket.on('login', function(data) { // register username
            online[socket.id] = data.username;  // TODO: probably should have uniqueness check?
            io.sockets.emit('online users', JSON.stringify(online));
        });

        socket.on('disconnect', () => {
            //online.remove(socket.id);
            delete online[socket.id];
            delete offers[socket.id];
            delete candidates[socket.id];
        });

        socket.on('whos online', function() { // queries
            seer = socket.id;   // TODO: need to have a more legit way to identify seer
            io.to(socket.id).emit('online users', JSON.stringify(online));
        });

        socket.on('submit offer', function(data) {
            console.log('Offer received: ' + data);
            if (data.to == null) data.to = seer;
            console.log('forwarding to ' + data.to);
            io.to(data.to).emit('available offer', {
                offer: data.offer,
                from: socket.id
            });
            offers[socket.id] = data;
        });

        socket.on('accept offer', function(data) {
            console.log('Offer accepted');
            delete offers[data.to]; // each offer can only be accepted once
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
});


module.exports = app;
