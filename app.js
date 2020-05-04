var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var expressSession = require('express-session');
var flash = require('connect-flash');

global.config = require('./deploy/config');
var debug = require('debug')

var app = express();

// db setup
var User = require('./models/user').model;
var UserLocalHelper = require('./models/userLocal');
var UserLocal = UserLocalHelper.model;

var dbConfig = global.config.db;
var mongoose = require('mongoose');

let modelPromise = null;
if (dbConfig.enabled) {
  modelPromise = mongoose.connect(dbConfig.url, { useNewUrlParser: true, useUnifiedTopology: true });
} else {
  modelPromise = UserLocalHelper.connect();
}

let sessionMiddleware = expressSession({
  secret: global.config.sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true },
  key: 'express.sid'
});

modelPromise.then(connection => {
  debug('Connected to database successfully');

  let acl = null;
  //acl = require('./routes/access-control.js')(connection);
  //console.log('Finished configuring acl');

  // Configuring Passport
  var passport = require('./models/passport.js')(acl);
  if (dbConfig.enabled) {
    passport.serializeUser(function(user, done) {
      done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {
      User.findById(id, function(err, user) {
        done(err, user);
      });
    });
  } else {
    passport.serializeUser(function(user, done) {
      done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
      UserLocal.findById(id, function(err, user) {
        done(err, user);
      });
    });
  }

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
  debug('Setting up middleware');
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
