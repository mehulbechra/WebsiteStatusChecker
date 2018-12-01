/*
*   API Tests
*/

// Dependencies
const assert = require('assert');
const http = require('http');
const app = require('./../index');
const config = require('./../lib/config');

// Container for the test
const api = {};

// Helpers
const helpers = {};
helpers.makeGetRequest = (path, callback) => {
  // Configure request details
  const requestDetails = {
    protocol: 'http:',
    hostname: 'localhost',
    port: config.httpPort,
    method: 'GET',
    path,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  // Send the request
  const req = http.request(requestDetails, (res) => {
    callback(res);
  });
  req.end();
};

// Main init function should run without throwing
api['app.init should start without throwing'] = (done) => {
  assert.doesNotThrow(() => {
    app.init((err) => {
      done();
    });
  }, TypeError);
};

// Make a request to ping
api['/ping should respond to GET with 200'] = (done) => {
  helpers.makeGetRequest('/ping', (res) => {
    assert.equal(res.statusCode, 200);
    done();
  });
};

// Make a request to api/users
api['/api/users should respond to GET with 400'] = (done) => {
  helpers.makeGetRequest('/api/users', (res) => {
    assert.equal(res.statusCode, 400);
    done();
  });
};

// Make a request to random path
api['A random path should respond to GET with 404'] = (done) => {
  helpers.makeGetRequest('/wrong/path', (res) => {
    assert.equal(res.statusCode, 404);
    done();
  });
};

// Export the test to runner
module.exports = api;
