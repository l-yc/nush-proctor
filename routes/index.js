var express = require('express');
var router = express.Router();

module.exports = function(middleware) {
  console.log(middleware.passport);
  /* GET home page. */
  router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
  });

  router.get('/login', function(req, res, next) {
    console.log(req.flash('message'));
    res.render('login', { title: 'Express', error: req.flash('message') });
  });

  router.post('/login', middleware.passport.authenticate('login', {
    successRedirect: '/users',
    failureRedirect: '/login',
    failureFlash: true
  }));

  router.post('/signup', middleware.passport.authenticate('signup', {
    successRedirect: '/users',
    failureRedirect: '/login',
    failureFlash: true
  }));

  //router.get('/demo', function(req, res, next) {
  //  res.render('demo', { title: 'Express' });
  //});
  return router;
};
