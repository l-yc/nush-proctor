var express = require('express');
var router = express.Router();

var User = require('../models/user.js').model;
var UserLocal= require('../models/userLocal.js').model;

//var Token = require('../models/token').model;

var debug = require('debug')('parangninja:routes:middleware.js');

module.exports = function(passport, acl) {
  middleware = {};
  middleware.passport = passport;

  // Abstraction for logins
  middleware.authenticate = function(strategy, params) {
    return passport.authenticate(strategy, params);
  };

  middleware.checkAuthenticated = function(req, res, next) {
    //debug('Checking for authentication');
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
  };

  // ACL Controls
  middleware.getUserId = function(req, res) {
    // Since numbers are not supported by node_acl in this case, convert
    //  them to strings, so we can use IDs nonetheless.
    return req.user && req.user.id.toString() || false;
  }

  middleware.checkPermission = function(permission) {
    return function(req, res, next) {
      let userId = middleware.getUserId(req, res);
      if (global.config.db.enabled) {
        User.findById(userId, function(err, user) {
          if (!err && user) return next();
          res.redirect('/');
        });
      } else {
        UserLocal.findById(userId, function(err, user) {
          if (permission === 'restricted') {
            if (user.role === 'proctor') return next();
            else res.redirect('/'); // TODO: make this more robust
          }
        });
      }
    }
  };

  return middleware;
};
