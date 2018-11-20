/*
* Server related tasks
*/

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');

// Instantiate server module object
const server = {};

// Instantiate http server
server.httpServer = http.createServer((req, res) => server.unifiedServer(req,res));

// Instantiate https server; To create key: openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
server.httpsServerOptions = {
    'key' : fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
    'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => server.unifiedServer(req,res));

// Server logic
server.unifiedServer = (req,res) => {

    // Get parsed url and trim it
    const parsedUrl = url.parse(req.url, true);             // true = calling query string module
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g,'');      // Removing / from beg and end
    // Get query string as an object
    const queryStringObject = parsedUrl.query;

    // Get the method
    const method = req.method.toLowerCase();

    // Get the headers as an object
    const headers = req.headers;

    // Get the payload, if any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', function(data) {
        buffer += decoder.write(data);
    });

    req.on('end', () => {
        buffer += decoder.end();

        // Choosing the handler the request should go to 
        const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        // Constructing the data object
        const data = {
            'trimmedPath' : trimmedPath,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : helpers.parseJsonToObject(buffer)
        };

        chosenHandler(data, (statusCode, payload) => {
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            payload = typeof(payload) == 'object' ? payload : {};
            const payloadString = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
            console.log("Returned Response : ",statusCode, payloadString);
        });
    });
};

// Request Router
server.router = {
    'ping' : handlers.ping,
    'users' : handlers.users,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks
};

// Init 
server.init = () => {
    // Start the http server
    server.httpServer.listen(config.httpPort, () => console.log("The server is listening on port "+config.httpPort));
    // Start the https server
    server.httpsServer.listen(config.httpsPort, () => console.log("The server is listening on port "+config.httpsPort));
};

// Export the module
module.exports = server;