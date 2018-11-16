/*
* Primary file for the API
*/

// Dependencies
var http = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;

var server = http.createServer(function(req, res) {
    // Get parsed url and trim it
    var parsedUrl = url.parse(req.url, true);           // true = calling query string module
    var path = parsedUrl.pathname;
    var trimmedUrl = path.replace(/^\/+|\/+$/g,'');     // Removing / from beg and end

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

        res.end('Hello World\n');

        console.log("payload: ", buffer);
    });
});

//  Start the server at port 3000
server.listen(3000, function(){
    console.log("We are currently listening on port 3000");
});