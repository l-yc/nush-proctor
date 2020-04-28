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
  }/*,
  // Select keys
  PRIVATE_DATA: 'firstName lastName username email points',
  PUBLIC_DATA: 'username points',
  // Creates a filtered JSON object containing all private and public info
  getPrivateDataAsJson: function(user) {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      points: user.points
    };
  },
  // Creates a filtered JSON object containing only public info
  getPublicDataAsJson: function(user) {
    return {
      username: user.username,
      points: user.points
    };
  }*/
};
