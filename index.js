/*
* Primary file for the API
*/

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

// Declare the app
const app = {};

// Init function
app.init = () => {
  // Starting server and background workers
  server.init();
  workers.init();
};

// Execute
app.init();

// Export the app
module.exports = app;
