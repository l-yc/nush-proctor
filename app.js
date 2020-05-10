// imports
var express = require('express');
var createError = require('http-errors');
var cookieParser = require('cookie-parser');

var session = require('express-session')
var MemoryStore = require('memorystore')(session)

var flash = require('connect-flash');

var path = require('path');
var logger = require('morgan');

global.config = require('./deploy/config');
var debug = require('debug')('proctor:app');

var app = express();

// db setup
var db = require('./models/db');

let sessionMiddleware = session({
  cookie: { secure: true },
  key: 'express.sid',
  resave: false,
  secret: global.config.sessionSecret,
  saveUninitialized: false,
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  unset: 'destroy'
});

db.connect().then(connection => {
  console.log('Connected to database successfully: %o', connection);

  let acl = null;
  //acl = require('./routes/access-control.js')(connection);
  //console.log('Finished configuring acl');

  // Configuring Passport
  var passport = require('./models/passport.js')(acl);
  passport.serializeUser(db.serializeUser);
  passport.deserializeUser(db.deserializeUser);

  app.use(sessionMiddleware);
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());

  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');

  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));
  //app.use(favicon(path.join(__dirname, 'public', 'favicon.png')))

  global.appRoot = path.resolve(__dirname);

  // Middleware manager
  console.log('Setting up middleware');
  var middleware = require('./routes/middleware')(passport, acl);
  var indexRouter = require('./routes/index')(middleware);
  app.use('/', indexRouter);

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
}).catch(err => {
  debug('Failed to connect to database: ' + err);
  return;
});

console.log('set up app.');

// webrtc server
app.on('event:serverReady', function(server) { // runs after set up server;
  app.webrtcServer = require('./webrtc-server/main')(server, sessionMiddleware);
});

module.exports = app;
