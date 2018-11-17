/*
* Primary file for the API
*/

// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');

// Instantiate http server
var httpServer = http.createServer(function(req, res) {
    unifiedServer(req,res); 
});

//  Start the http server
httpServer.listen(config.httpPort, function(){
    console.log("The server is listening on port "+config.httpPort);
});

// Instantiate https server
var httpsServerOptions = {
    'key' : fs.readFileSync('./https/key.pem'),
    'cert' : fs.readFileSync('./https/cert.pem')
};

// Start the https server
var httpsServer = https.createServer(httpsServerOptions, function(req, res) {
    unifiedServer(req,res); 
});

//  Start the server
httpsServer.listen(config.httpsPort, function(){
    console.log("The server is listening on port "+config.httpsPort);
});

// Server logic for both http and https
var unifiedServer = function(req,res){

    // Get parsed url and trim it
    var parsedUrl = url.parse(req.url, true);           // true = calling query string module
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g,'');     // Removing / from beg and end
    // Get query string as an object
    var queryStringObject = parsedUrl.query;

    // Get the method
    var method = req.method.toLowerCase();

    // Get the headers as an object
    var headers = req.headers;

    // Get the payload, if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    req.on('data', function(data) {
        buffer += decoder.write(data);
    });

    req.on('end', function(){
        buffer += decoder.end();

        // Choosing the handler the request should go to 
        var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        // Constructing the data object
        var data = {
            'trimmedPath' : trimmedPath,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : buffer
        };

        chosenHandler(data, function(statusCode, payload){
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            payload = typeof(payload) == 'object' ? payload : {};
            var payloadString = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
            console.log("Returned Response : ",statusCode, payloadString);
        });
    });
};

// Handlers
var handlers = {};

// Ping Handler
handlers.ping = function(data, callback){
    callback(200);
};

// Not Found Handler
handlers.notFound = function(data, callback){
    callback(404);
};

// Request Router
var router = {
    'ping' : handlers.ping
};