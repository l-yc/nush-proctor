var mongoose = require('mongoose');

let dbConfig = global.config.db;

let UserHelper = require('./user')
let User = UserHelper.model;

exports.models = {
  UserHelper: UserHelper
};

exports.connect = function() {
  return mongoose.connect(dbConfig.url, { useNewUrlParser: true, useUnifiedTopology: true });
};

exports.serializeUser = function(user, done) {
  done(null, user._id);
};

exports.deserializeUser = function(id, done) {
  User.findById(id, function(err, user) {
    if (err || !user) done(null, null); // this user cannot be found...
    else done(err, user);
  });
};
