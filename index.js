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
app.init = () => {
  // Starting server and background workers
  server.init();
  workers.init();

  // At last, start the cli
  setTimeout(() => {
    cli.init();
  }, 50);
};

// Execute
app.init();

// Export the app
module.exports = app;
