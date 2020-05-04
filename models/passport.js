var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var UserHelper = require('./user.js');
var User = UserHelper.model;

var UserLocal = require('./userLocal.js').model;

var debug = require('debug')('nush-proctor:models:passport.js');

function login(req, username, password, done) {
  if (global.config.db.enabled) {
    // check in mongo if a user with username exists or not
    User.findOne({ 'username' :  username },
      function(err, user) {
        // In case of any error, return using the done method
        if (err)
          return done(err);
        // Username does not exist, log error & redirect back
        if (!user){
          console.log('User not found for username:', username);
          return done(null, false,
            req.flash('message', 'User not found.'));
        }
        // User exists but wrong password, log the error
        if (!UserHelper.isValidPassword(user, password)){
          console.log('Invalid Password');
          return done(null, false,
            req.flash('message', 'Invalid password.'));
        }

        // User and password both match, return user from
        // done method which will be treated like success
        return done(null, user);
      }
    );
  } else {
    UserLocal.findOne({ 'username': username }, function(err, user) {
      if (user === undefined) return done(null, false, req.flash('message', 'User not found.'));
      if (user.password !== password) return done(null, false, req.flash('message', 'Invalid password.'));
      return done(null, user);
    });
  }
}

function signup(req, username, password, done) {
  if (global.config.db.enabled) {
    // find a user in Mongo with provided username
    User.findOne({ 'username': username }, function(err, user) {
      // In case of any error return
      if (err){
        console.log('Error in signing up: ', err);
        return done(err);
      }
      if (user) { // already exists
        console.log('User already exists');
        return done(null, false,
          req.flash('message','User already exists.'));
      } else { // create the user
        var newUser = new User();
        // set the user's local credentials
        newUser.username = username;
        newUser.password = UserHelper.createPasswordHash(password);

        // save the user
        newUser.save(function(err) {
          if (err) {
            console.log('Error in saving user:', err);
            throw err;
          }
          console.log('Successfully registered ' + newUser.username);
        });
      }
    });
  } else {
    UserLocal.findOne({ 'username': username }, function(err, user) {
      return done(null, false, req.flash('message','User signups are disabled.'));
    });
  }
}

module.exports = function(acl) {
  passport.use('login', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback : true
  }, login));

  passport.use('signup', new LocalStrategy({
    passReqToCallback : true
  }, signup));

  return passport;
};
