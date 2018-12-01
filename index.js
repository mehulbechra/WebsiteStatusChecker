/*
* Primary file for the API
*/

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');
const cli = require('./lib/cli');

// Declare the app
const app = {};

// Init function
app.init = (callback) => {
  // Starting server and background workers
  server.init();
  workers.init();

  // At last, start the cli
  setTimeout(() => {
    cli.init();
    callback();
  }, 50);
};

// Self invoking only if directly required
if (require.main === module) {
  app.init(() => {});
}

// Export the app
module.exports = app;
