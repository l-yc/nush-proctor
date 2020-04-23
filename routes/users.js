var express = require('express');
var router = express.Router();

module.exports = function(middleware) {
  /* GET users listing. */
  router.get('/', middleware.checkAuthenticated, function(req, res, next) {
    //res.send('respond with a resource');
    res.render('users');
  });

  return router;
};
