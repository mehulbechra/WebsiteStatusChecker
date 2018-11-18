/*
* Primary file for the API
*/

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');

// Instantiate & start http
const httpServer = http.createServer((req, res) => unifiedServer(req,res));
httpServer.listen(config.httpPort, () => console.log("The server is listening on port "+config.httpPort));

// Instantiate & start https server; To create key: openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
const httpsServerOptions = {
    'key' : fs.readFileSync('./https/key.pem'),
    'cert' : fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => unifiedServer(req,res));
httpsServer.listen(config.httpsPort, () => console.log("The server is listening on port "+config.httpsPort));

// Server logic
const unifiedServer = (req,res) => {

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
        const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        // Constructing the data object
        const data = {
            'trimmedPath' : trimmedPath,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : buffer
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

// Handlers
const handlers = {};

// Ping Handler
handlers.ping = (data, callback) => callback(200);

// Not Found Handler
handlers.notFound = (data, callback) => callback(404);

// Request Router
const router = {
    'ping' : handlers.ping
};