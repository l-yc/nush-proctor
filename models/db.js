var dbConfig = global.config.db;

if (dbConfig.type === 'mongo') {
  module.exports = require('./mongodbAdapter');
} else if (dbConfig.type === 'file') {
  module.exports = require('./filedbAdapter');
} else {
  throw Error('invalid db type specified');
}
