/*
* Server related tasks
*/

/* eslint-disable no-console */

// Dependencies
const util = require('util');
const http = require('http');
const https = require('https');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

const debug = util.debuglog('server'); // NODE_DEBUG=server node index.js

// Instantiate server module object
const server = {};

// Instantiate http server
server.httpServer = http.createServer((req, res) => server.unifiedServer(req, res));

// Instantiate https server; To create key: openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => server.unifiedServer(req, res));

// Server logic
server.unifiedServer = (req, res) => {
  // Get parsed url and trim it
  const parsedUrl = url.parse(req.url, true); // true = calling query string module
  const urlPath = parsedUrl.pathname;
  const trimmedPath = urlPath.replace(/^\/+|\/+$/g, ''); // Removing / from beg and end
  // Get query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const { headers } = req;

  // Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', (data) => {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer += decoder.end();

    // Choosing the handler the request should go to
    let chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    // Use public handler, if request is within public directory
    chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

    // Constructing the data object
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    chosenHandler(data, (statusCode, payload, contentType) => {
      // Default contentType to JSON
      contentType = typeof (contentType) === 'string' ? contentType : 'json';

      statusCode = typeof (statusCode) === 'number' ? statusCode : 200;

      // Return response parts that are content specific
      let payloadString = '';

      if (contentType === 'json') {
        res.setHeader('Content-Type', 'application/json');
        payload = typeof (payload) === 'object' ? payload : {};
        payloadString = JSON.stringify(payload);
      }
      if (contentType === 'html') {
        res.setHeader('Content-Type', 'text/html');
        payloadString = typeof (payload) === 'string' ? payload : '';
      }

      if (contentType === 'favicon') {
        res.setHeader('Content-Type', 'image/x-icon');
        payloadString = typeof (payload) !== 'undefined' ? payload : '';
      }
      if (contentType === 'css') {
        res.setHeader('Content-Type', 'text/css');
        payloadString = typeof (payload) !== 'undefined' ? payload : '';
      }
      if (contentType === 'png') {
        res.setHeader('Content-Type', 'image/png');
        payloadString = typeof (payload) !== 'undefined' ? payload : '';
      }
      if (contentType === 'jpg') {
        res.setHeader('Content-Type', 'image/jpeg');
        payloadString = typeof (payload) !== 'undefined' ? payload : '';
      }
      if (contentType === 'plain') {
        res.setHeader('Content-Type', 'text/plain');
        payloadString = typeof (payload) !== 'undefined' ? payload : '';
      }

      // Return response parts common to all content types
      res.writeHead(statusCode);
      res.end(payloadString);

      // If response is 200 , print green otherwise red
      if (statusCode === 200) {
        debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
      } else {
        debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
      }
    });
  });
};

// Request Router
server.router = {
  '': handlers.index,
  'account/create': handlers.accountCreate,
  'account/edit': handlers.accountEdit,
  'account/deleted': handlers.accountDeleted,
  'session/create': handlers.sessionCreate,
  'session/deleted': handlers.sessionDeleted,
  'checks/all': handlers.checksList,
  'checks/create': handlers.checksCreate,
  'checks/edit': handlers.checksEdit,
  ping: handlers.ping,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks,
  'favicon.ico': handlers.favicon,
  public: handlers.public,
};

// Init
server.init = () => {
  // Start the http server
  server.httpServer.listen(config.httpPort, () => console.log('\x1b[36m%s\x1b[0m', `The server is listening on port${config.httpPort}`));

  // Start the https server
  server.httpsServer.listen(config.httpsPort, () => console.log('\x1b[35m%s\x1b[0m', `The server is listening on port${config.httpsPort}`));
};

// Export the module
module.exports = server;
