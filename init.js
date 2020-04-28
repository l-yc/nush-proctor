var UserHelper = require('./models/user.js');
var User = UserHelper.model;

// db setup
var dbConfig = require('./config').db;
var mongoose = require('mongoose');
mongoose.connect(dbConfig.url, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, connection) {
    if (err) {
        console.log('Failed to connect to database: %o', err);
        return;
    }
    console.log('Connected to database successfully');

    var newUser = new User();
    newUser.username = 'admin';
    newUser.password = UserHelper.createPasswordHash('c3RyaW5nIGdlbmVyYXRvcg==');

    console.log('Creating user: %o', newUser);
    // save the user
    newUser.save(function(err) {
        if (err) {
            console.log('Error in saving user:', err);
            process.exit(1);
        }
        console.log('Successfully registered ' + newUser.username);
        process.exit(0);
    });
});
