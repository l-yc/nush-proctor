var express = require('express');
var router = express.Router();

//var Token = require('../models/token').model;

var debug = require('debug')('parangninja:routes:middleware.js');

function loadAccounts() {
  //return fs.promises.readFile('./deploy/accounts.csv')
  console.log('loading accounts');
  return new Promise((resolve, reject) => {
    const readline = require('readline');
    const fs = require('fs');

    const rl = readline.createInterface({
      input: fs.createReadStream('./deploy/accounts.csv')
    });

    let accounts = [];

    rl.on('line', (line) => {
      //console.log('Line from file:', line);
      /** FORMAT
       * proctor: <username>; <password>; 
       * student: <username>; <password>; <assignedProctor>
       */

      let res = line.match('^(.+?):\\s*(.+?);\\s*(.+?)(;\\s*(.+))?$');
      //console.log(res);
      const crypto = require("crypto");
      const id = crypto.randomBytes(16).toString("hex");

      accounts.push({
        id: id,
        role: res[1],
        username: res[2],
        password: res[3],
        assignedProctor: res[5]
      });
    });

    rl.on('close', () => {
      console.log('closing');
      resolve(accounts);
    });
  });
}

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

  return middleware;
};
