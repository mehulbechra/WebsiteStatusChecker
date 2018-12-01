/*
* Primary file for the API
*/

// Dependencies
const cluster = require('cluster');
const os = require('os');
const server = require('./lib/server');
const workers = require('./lib/workers');
const cli = require('./lib/cli');

// Declare the app
const app = {};

// Init function
app.init = (callback) => {
  // If on master thread...
  if (cluster.isMaster) {
    // Starting background workers
    workers.init();

    // At last, start the cli
    setTimeout(() => {
      cli.init();
      callback();
    }, 50);

    // Fork the process
    for (let i = 0; i < os.cpus().length; i += 1) {
      cluster.fork();
    }
  } else {
    // Start the server
    server.init();
  }
};

// Self invoking only if directly required
if (require.main === module) {
  app.init(() => {});
}

// Export the app
module.exports = app;
