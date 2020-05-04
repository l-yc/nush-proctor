let accounts = [];

var UserLocal = {
  findById: function(id, cb) {
    try {
      let user = accounts.find(a => a.id === id);
      cb(null, user);
    } catch (err) {
      cb(err, null);
    }
  },
  findOne: function(params, cb) {
    try {
      console.log()
      let user = accounts.find(a => {
        let ok = true;
        Object.keys(params).forEach(key => {
          ok &= a[key] === params[key];
        });
        return ok;
      });
      cb(null, user);
    } catch (err) {
      cb(err, null);
    }
  }
};

function loadAccounts() {
  return new Promise((resolve, reject) => {
    const readline = require('readline');
    const fs = require('fs');

    const rl = readline.createInterface({
      input: fs.createReadStream('./deploy/accounts.csv')
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
        id: id,
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

module.exports = {
  model: UserLocal,
  connect: loadAccounts
};
