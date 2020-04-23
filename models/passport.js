var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var UserHelper = require('./user.js');
var User = UserHelper.model;

var debug = require('debug')('nush-proctor:models:passport.js');

function login(req, username, password, done) {
  // check in mongo if a user with username exists or not
  console.log('hello');
  User.findOne({ 'username' :  username },
    function(err, user) {
      // In case of any error, return using the done method
      if (err)
        return done(err);
      // Username does not exist, log error & redirect back
      if (!user){
        console.log('User Not Found with username '+username);
        return done(null, false,
          req.flash('message', 'User Not found.'));
      }
      // User exists but wrong password, log the error
      if (!UserHelper.isValidPassword(user, password)){
        console.log('Invalid Password');
        return done(null, false,
          req.flash('message', 'Invalid Password'));
      }

      //if (!user.isEnabled){
      //  console.log('User is disabled');
      //  return done(null, false,
      //    req.flash('message', 'User is disabled. Please contact the administrator for assistance.'));
      //}
      // User and password both match, return user from
      // done method which will be treated like success
      return done(null, user);
    }
  );
}

function signup(req, username, password, done) {
  // find a user in Mongo with provided username
  User.findOne({'username':username},function(err, user) {
    // In case of any error return
    if (err){
      console.log('Error in SignUp: '+err);
      return done(err);
    }
    // already exists
    if (user) {
      console.log('User already exists');
      return done(null, false,
        req.flash('message','User Already Exists'));
    } else {
      // if there is no user with that email
      // create the user
      var newUser = new User();
      // set the user's local credentials
      newUser.firstName = req.body.firstName;
      newUser.lastName = req.body.lastName;
      newUser.username = username;
      newUser.password = UserHelper.createPasswordHash(password);
      newUser.email = req.body.email;
      //newUser.firstName = req.param('firstName');
      //newUser.lastName = req.param('lastName');

      // save the user
      newUser.save(function(err) {
        if (err) {
          console.log('Error in Saving user: '+err);
          throw err;
        }
        console.log('Successfully registered ' + newUser.username);

        //acl.addUserRoles(newUser.id, 'user', function(err2) {
        //  if (err2) {
        //    console.log('Error in assigning user role: ' + err);
        //    throw err2;
        //  }
        //  console.log('Assigned default role of \'user\' to ' + newUser.username);
        //  return done(null, newUser);
        //});
      });
    }
  });
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

  //passport.use('changePassword', new LocalStrategy({
  //  usernameField: 'username',
  //  passwordField: 'currentPassword',
  //  passReqToCallback : true
  //},
  //  function(req, username, password, done) {
  //    // check in mongo if a user with username exists or not

  //    User.findOne({ 'username' :  username },
  //      function(err, user) {
  //        // In case of any error, return using the done method
  //        if (err)
  //          return done(err);
  //        // Username does not exist, log error & redirect back
  //        if (!user){
  //          console.log('User Not Found with username '+username);
  //          return done(null, false,
  //            req.flash('message', 'User Not found.'));
  //        }
  //        // User exists but wrong password, log the error
  //        if (!UserHelper.isValidPassword(user, password)){
  //          console.log('Invalid Password');
  //          return done(null, false,
  //            req.flash('message', 'Invalid Password'));
  //        }

  //        if (!user.isEnabled){
  //          console.log('User is disabled');
  //          return done(null, false,
  //            req.flash('message', 'User is disabled. Please contact the administrator for assistance.'));
  //        }

  //        // User and password both match, update the password
  //        user.password = UserHelper.createPasswordHash(req.body.newPassword);

  //        // save the user
  //        user.save(function(err) {
  //          if (err){
  //            console.log('Error in Saving user: '+err);
  //            throw err;
  //          }
  //          console.log('Password updated succesful');
  //          return done(null, user);
  //        });
  //      }
  //    );
  //  }));

  return passport;
};
