/*
*   Helpers
*/

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const queryString = require('querystring');
const https = require('https');

// Container for all helpers
const helpers = {};

// Create SHA256 hash
helpers.hash = (str) => {
    if(typeof(str) == 'string' && str.length > 0){
        const hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
}

// Parse JSON string to an object w/o throwing
helpers.parseJsonToObject = (str) => {
    try {
        const obj = JSON.parse(str);
        return obj;
    } catch(e) {
        return {};
    }
};

// Create a random string of alphanumeric characters of a given length
helpers.createRandomString = (strLength) => {
    strLength = typeof(strLength) == 'number' && strLength>0 ? strLength : false;
    if(strLength){
        // Define possible characters that could go in a string
        const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890';

        // Start the final string
        let str = '';
        for(let i=1; i<=strLength;i++){
            // Get and append a character from the possibleCharacters
            const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            str += randomCharacter;
        }

        return str;

    } else {
        return false;
    }
}

// Send an SMS message via twilio
helpers.sendTwilioSms = (phone,msg,callback) => {
    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length < 1600 ? msg.trim() : false;
    if(phone && msg) {

        // Configure the request payload
        const payload = {
            'From': config.twilio.fromPhone,
            'To': '+91'+phone,
            'Body': msg
        };

        // Stringify the payload
        const stringPayload = queryString.stringify(payload);

        // Configure the request details
        const requestDetails = {
            'protocol' : 'https:',
            'hostname' : 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };

        // Instantiate the request object
        const req = https.request(requestDetails,(res) => {
            // Grab the status of the sent request
            const status = res.statusCode;
            // Callback successfully if request went through
            if(status == 200 || status == 201){
                callback(false);
            } else {
                callback('Status code returned was:',statusCode);
            }
        });

        // Bind to the error event so it doesn't get thrown & kills the server
        req.on('error', (e) => {
            callback(e);
        });

        // Add the payload to the request
        req.write(stringPayload);

        // End and send the request
        req.end();

    } else {
        callback('Given parameters were missing or invalid');
    }
};

// Export container
module.exports = helpers;
