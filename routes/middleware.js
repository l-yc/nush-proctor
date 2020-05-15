var express = require('express');
var router = express.Router();

var User = require('../models/db').models.UserHelper.model;

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
    return req.user && req.user._id.toString() || false;
  }

  middleware.checkPermission = function(permission) { // quick and dirty ACL
    return function(req, res, next) {
      let userId = middleware.getUserId(req, res);

      User.findById(userId, function(err, user) {
        switch (permission) {
          case 'restricted':
            if (user.role.includes('proctor')) return next();
            else {
              req.flash('message', 'Permission Denied');
              res.redirect('error', req.flash({ message: 'Permission Denied' }));
            }
            break;
          case 'confidential':
            if (user.role.includes('admin')) return next();
            else {
              req.flash('message', 'Permission Denied');
              res.redirect('error');
            }
            break;
        }
      });
    }
  };

  return middleware;
};
