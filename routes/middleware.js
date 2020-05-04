var express = require('express');
var router = express.Router();

//var Token = require('../models/token').model;

var debug = require('debug')('parangninja:routes:middleware.js');

module.exports = function(passport, acl) {
  middleware = {};
  middleware.passport = passport;

  // Abstraction for logins
  middleware.authenticate = function(req, strategy, params) {
    passport.authenticate(req, strategy, params);
  };

  middleware.checkAuthenticated = function(req, res, next) {
    //debug('Checking for authentication');
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
  };

  return middleware;
};
