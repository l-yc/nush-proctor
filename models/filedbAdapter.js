let dbConfig = global.config.db;

// This WILL throw an error if there is one.
function parseLine(line) {
  /**
   * FORMAT (<roles>; <login details>; [<proctor>])
   * Below are some example entries:
   * admin; <username>; <password>; 
   * proctor, admin; <username>; <password>; 
   * proctor: <username>; <password>; 
   * student: <username>; <password>; <assignedProctor>
   */

  try {
    let res = line.match('^(.+?);\\s*(.+?);\\s*(.+?)(;\\s*(.+))?$');
    const crypto = require('crypto');
    //const id = crypto.randomBytes(16).toString("hex");
    const id = crypto.createHash('md5').update(line).digest('hex'); // FIXME consistent hash for unmodified user. Good idea?

    let acc = {
      _id: id,
      role: res[1].split(',').map(item => item.trim()), // support a list of roles
      username: res[2],
      password: res[3],
      assignedProctor: res[5]
    };
    console.log(acc);
    return acc;
  } catch (err) {
    console.log(err);
    throw {
      name: 'SyntaxError',
      message: 'Invalid format. Accounts must be given as "<role1>, ... ,<roleN>; <username>; <password>; [<proctor>]".'
    };
  }
}

function loadAccounts() {
  let accounts = [];
  return new Promise((resolve, reject) => {
    const readline = require('readline');
    const fs = require('fs');

    const rl = readline.createInterface({
      input: fs.createReadStream(dbConfig.url)
    });

    rl.on('line', (line) => {
      line = line.trim();
      if (line) {
        try {
          accounts.push(parseLine(line));
        } catch (err) {
          console.log('Error parsing line: %o', err);
          reject(err);
        }
      }
    });

    rl.on('close', () => {
      console.log('Loaded all accounts.');
      resolve(accounts);
    });
  });
}

function checkAccounts(accounts) {
  return new Promise((resolve, reject) => {
    let lst = [];
    accounts.split(/\r?\n/).forEach((line) => {
      if (line) {
        try {
          lst.push(parseLine(line));
        } catch (err) {
          reject(err);
        }
      }
    });

    // validation...json errors are probably not the best.
    lst.forEach((acc) => {
      if (acc.role.length == 0) reject({ name: 'LogicError', message: `User ${acc.username} must have a role.` });
      acc.role.forEach(r => {
        if (r === 'student') {
          if (!acc.assignedProctor) reject({ name: 'LogicError', message: `Student ${acc.username} must be assigned to a proctor.` });
          let proc = lst.find(x => x.username === acc.assignedProctor);
          if (!proc) reject({ name: 'LogicError', message: `Student ${acc.username} is assigned to a proctor (${acc.assignedProctor}) that does not exist.` });
        } else if (r === 'proctor') {
          if (acc.assignedProctor) reject({ name: 'LogicError', message: `Proctor ${acc.username} cannot be assigned to a proctor.` });
        } else if (r === 'admin') {
          if (acc.assignedProctor) reject({ name: 'LogicError', message: `Admin ${acc.username} cannot be assigned to a proctor.` });
        } else {
          reject({ name: 'SyntaxError', message: `${r} assigned to ${acc.username} is not a valid role (student, proctor, or admin).` });
        }
      });
    });
    resolve();
  });
}

function setAccounts(accounts) {
  const fs = require('fs').promises;
  return checkAccounts(accounts).then(() => {
    console.log('succeed in loading saved accounts');
    return fs.writeFile(dbConfig.url, accounts, 'utf8');
  });
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
