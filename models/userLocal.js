let db = require('./filedbAdapter');

var UserLocal = {
  findById: function(id, cb) {
    try {
      let user = db.collections.accounts.find(a => a._id === id);
      cb(null, user);
    } catch (err) {
      cb(err, null);
    }
  },
  findOne: function(params, cb) {
    try {
      let user = db.collections.accounts.find(a => {
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

module.exports = {
  model: UserLocal,
  isValidPassword: function(user, password) {
    return password === user.password;
  },
  createPasswordHash: function(password) { 
    return password; // TODO: this function is only here for compatibility with the interface
  }
};
