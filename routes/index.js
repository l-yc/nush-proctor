var express = require('express');
var router = express.Router();

module.exports = function(middleware) {
  router.get('/login', function(req, res, next) {
    res.render('login', { title: 'Login', message: req.flash('message') });
  });

  router.post('/login', middleware.authenticate('login', {
    successRedirect: '/seer',
    failureRedirect: '/login',
    failureFlash: true
  }));

  router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/login');
  });

  // TODO: disabled signups for now
  //router.post('/signup', middleware.authenticate('signup', {
  //  successRedirect: '/seer',
  //  failureRedirect: '/login',
  //  failureFlash: true
  //}));

  router.get('/error', function(req, res) {
    res.render('error', { message: req.flash('message'), error: { status: null, stack: null }});
  });

  // Protected
  router.use(middleware.checkAuthenticated);

  router.get('/', function(req, res, next) {
    res.render('proctor', { title: 'Proctor', sessionName: global.config.appName });
  });

  router.get('/seer', [
    middleware.checkPermission('restricted')
  ], function(req, res, next) {
    res.render('seer', { title: 'Seer', sessionName: global.config.appName });
  });

  router.get('/seer', [
    middleware.checkPermission('restricted')
  ], function(req, res, next) {
    res.render('seer', { title: 'Seer', sessionName: global.config.appName });
  });

  router.get('/cockpit', [
    middleware.checkPermission('confidential')
  ], function(req, res, next) {
    res.render('cockpit', { title: 'Cockpit', sessionName: global.config.appName });
  });


  return router;
};
