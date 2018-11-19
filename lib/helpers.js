/*
*   Helpers
*/

// Dependencies
const crypto = require('crypto');
const config = require('./config')

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

// Export container
module.exports = helpers;
