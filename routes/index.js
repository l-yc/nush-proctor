var express = require('express');
var router = express.Router();

module.exports = function(middleware) {
  router.get('/login', function(req, res, next) {
    res.render('login', { title: global.config.appName, message: req.flash('message') });
  });

  router.post('/login', middleware.authenticate('login', {
    successRedirect: '/seer',
    failureRedirect: '/login',
    failureFlash: true
  }));

  router.post('/signup', middleware.authenticate('signup', {
    successRedirect: '/seer',
    failureRedirect: '/login',
    failureFlash: true
  }));

  router.get('/', middleware.checkAuthenticated, function(req, res, next) {
    res.render('proctor', { title: global.config.appName });
  });

  router.get('/seer', middleware.checkAuthenticated, function(req, res, next) {
    res.render('seer', { title: global.config.appName });
  });

  return router;
};
