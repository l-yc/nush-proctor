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

  // TODO: disabled signups for now
  //router.post('/signup', middleware.authenticate('signup', {
  //  successRedirect: '/seer',
  //  failureRedirect: '/login',
  //  failureFlash: true
  //}));

  // Protected
  router.use(middleware.checkAuthenticated);

  router.get('/', function(req, res, next) {
    res.render('proctor', { title: global.config.appName });
  });

  router.get('/seer', [
    middleware.checkPermission('restricted')
  ], function(req, res, next) {
    res.render('seer', { title: global.config.appName });
  });

  return router;
};
