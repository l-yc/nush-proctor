var mongoose = require('mongoose')

var userSchema = new mongoose.Schema({
  username: String,
  password: String
});

var User = mongoose.model('User', userSchema);

var bCrypt = require('bcryptjs');
module.exports = {
  model: User,
  // Compares hash of passwords
  isValidPassword: function(user, password){
    return bCrypt.compareSync(password, user.password);
  },
  // Generates hash using bCrypt
  createPasswordHash: function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
  }
};
