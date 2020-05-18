let dbConfig = global.config.db;

function parseLine(accounts, line) {
  /**
   * FORMAT (<roles>:<account details>)
   * admin: <username>; <password>; 
   * proctor; admin: <username>; <password>; 
   * proctor: <username>; <password>; 
   * student: <username>; <password>; <assignedProctor>
   */

  let res = line.match('^(.+?):\\s*(.+?);\\s*(.+?)(;\\s*(.+))?$');
  const crypto = require("crypto");
  const id = crypto.randomBytes(16).toString("hex");

  accounts.push({
    _id: id,
    role: res[1].split(';').map(item => item.trim()), // support a list of roles
    username: res[2],
    password: res[3],
    assignedProctor: res[5]
  });
}

function loadAccounts() {
  let accounts = [];
  return new Promise((resolve, reject) => {
    const readline = require('readline');
    const fs = require('fs');

    const rl = readline.createInterface({
      input: fs.createReadStream(dbConfig.url)
    });

    rl.on('line', (line) => parseLine(accounts, line));

    rl.on('close', () => {
      console.log('Loaded all accounts.');
      resolve(accounts);
    });
  });
}

function setAccounts(accounts) {
  const fs = require('fs').promises;
  return fs.writeFile(dbConfig.url, accounts, 'utf8');
}

exports.connect = function() {
  return loadAccounts().then(_accounts => {
    exports.collections = {
      accounts: _accounts
    }

    //console.log(_accounts);
    exports.connection = {
      setAccounts: setAccounts
    }; // TODO: temporary connection object

    return exports.connection;
  });
}

let UserHelper = require('./userLocal');
let User = UserHelper.model;

exports.models = {
  UserHelper: UserHelper
};

exports.serializeUser = function(user, done) { // actually, this should be in the helper
  done(null, user._id);
};

exports.deserializeUser = function(id, done) {
  User.findById(id, function(err, user) {
    if (err || !user) done(null, null); // this user cannot be found...
    else done(err, user);
  });
};
