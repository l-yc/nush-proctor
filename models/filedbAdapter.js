let dbConfig = global.config.db;

function loadAccounts() {
  let accounts = [];
  return new Promise((resolve, reject) => {
    const readline = require('readline');
    const fs = require('fs');

    const rl = readline.createInterface({
      input: fs.createReadStream(dbConfig.url)
    });

    rl.on('line', (line) => {
      /**
       * FORMAT
       * proctor: <username>; <password>; 
       * student: <username>; <password>; <assignedProctor>
       */

      let res = line.match('^(.+?):\\s*(.+?);\\s*(.+?)(;\\s*(.+))?$');
      const crypto = require("crypto");
      const id = crypto.randomBytes(16).toString("hex");

      accounts.push({
        _id: id,
        role: res[1],
        username: res[2],
        password: res[3],
        assignedProctor: res[5]
      });
    });

    rl.on('close', () => {
      console.log('Loaded all accounts.');
      resolve(accounts);
    });
  });
}

exports.connect = function() {
  return loadAccounts().then(_accounts => {
    exports.collections = {
      accounts: _accounts
    }

    return {}; // TODO: temporary connection object
  })
}

let UserHelper = require('./userLocal');
let User = UserHelper.model;

exports.models = {
  UserHelper: UserHelper
};

exports.serializeUser = function(user, done) {
  done(null, user._id);
};

exports.deserializeUser = function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
};
