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

// Export container
module.exports = helpers;
