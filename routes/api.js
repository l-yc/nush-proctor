var express = require('express');
var router = express.Router();

var db = require('../models/db');
var UserHelper = db.models.UserHelper;
var User = UserHelper.model;

module.exports = function(middleware) {
  router.use(middleware.checkAuthenticated);
  router.use(middleware.checkPermission('confidential'));

  router.get('/accounts/get', function(req, res) {
    User.find({}, function(err, users) {
      if (err) {
        console.log('Failed to fetch accounts: %o', err);
        res.status(500).json({ success: false, error: 'Failed to fetch accounts.' });
      } else {
        console.log('Fetched accounts.');
        res.status(200).json({ success: true, users: users }); // this is terrible with no filtering, but that's okay for now
      }
    });
  });

  router.get('/accounts/sync', function(req, res) {
    db.connect().then(conn => {
      console.log('Synced accounts.');
      res.status(200).json({ success: true, users: db.collections.accounts }); // probably shouldn't access this directly.
    }).catch(err => {
      console.log(err);
      res.status(500).json({ success: false, error: 'Failed to sync accounts.' });
    });
  });

  router.post('/accounts/update', function(req, res) {
    db.connection.setAccounts(req.body.accounts).then(() => {
      // FIXME: this is not compatible with mongoDB! Rewrite this another time
      console.log('Updated accounts.');
      res.status(200).json({ success: true });
    }).catch(err => {
      console.log(err);
      res.status(500).json({ success: false, error: err });
    });
  });

  return router;
}
