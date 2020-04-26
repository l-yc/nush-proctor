var UserHelper = require('./models/user.js');
var User = UserHelper.model;

var debug = require('debug')('nush-proctor:models:init.js');

// db setup
var dbConfig = require('./models/db');
var mongoose = require('mongoose');
mongoose.connect(dbConfig.url, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, connection) {
    if (err) {
        debug('Failed to connect to database: ' + err);
        return;
    }
    debug('Connected to database successfully');

    var newUser = new User();
    //newUser.firstName = req.body.firstName;
    //newUser.lastName = req.body.lastName;
    newUser.username = 'admin';
    newUser.password = UserHelper.createPasswordHash('admin');
    //newUser.email = req.body.email;

    console.log(newUser);
    // save the user
    newUser.save(function(err) {
        if (err) {
            console.log('Error in saving user:', err);
            throw err;
        }
        console.log('Successfully registered ' + newUser.username);
    });
});
