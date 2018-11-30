/*
*   Helpers
*/

/* global statusCode */

// Dependencies
const crypto = require('crypto');
const queryString = require('querystring');
const https = require('https');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Container for all helpers
const helpers = {};

// Sample for testing that simply returns a number
helpers.getANumber = () => 1;

// Create SHA256 hash
helpers.hash = (str) => {
  if (typeof (str) === 'string' && str.length > 0) {
    const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  }
  return false;
};

// Parse JSON string to an object w/o throwing
helpers.parseJsonToObject = (str) => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

// Create a random string of alphanumeric characters of a given length
helpers.createRandomString = (strLength) => {
  strLength = typeof (strLength) === 'number' && strLength > 0 ? strLength : false;
  if (strLength) {
    // Define possible characters that could go in a string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890';

    // Start the final string
    let str = '';
    for (let i = 1; i <= strLength; i += 1) {
      // Get and append a character from the possibleCharacters
      const randomCharacter = possibleCharacters
        .charAt(Math.floor(Math.random() * possibleCharacters.length));
      str += randomCharacter;
    }

    return str;
  }
  return false;
};

// Send an SMS message via twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
  phone = typeof (phone) === 'string' && phone.trim().length === 10 ? phone.trim() : false;
  msg = typeof (msg) === 'string' && msg.trim().length > 0 && msg.trim().length < 1600 ? msg.trim() : false;
  if (phone && msg) {
    // Configure the request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: `+91${phone}`,
      Body: msg,
    };

    // Stringify the payload
    const stringPayload = queryString.stringify(payload);

    // Configure the request details
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload),
      },
    };

    // Instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      const status = res.statusCode;
      // Callback successfully if request went through
      if (status === 200 || status === 201) {
        callback(false);
      } else {
        callback('Status code returned was:', statusCode);
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

// Get the string content of a template
helpers.getTemplate = (templateName, data, callback) => {
  templateName = typeof (templateName) === 'string' && templateName.length > 0 ? templateName : false;
  data = typeof (data) === 'object' && data !== null ? data : {};
  if (templateName) {
    const templatesDir = path.join(__dirname, '/../templates/');
    fs.readFile(`${templatesDir + templateName}.html`, 'utf8', (err, str) => {
      if (!err && str && str.length > 0) {
        // Do interpolation on string
        const finalString = helpers.interpolate(str, data);
        callback(false, finalString);
      } else {
        callback('No template could be found');
      }
    });
  } else {
    callback('Valid template name was not specified');
  }
};

// Add the header and footer to a string, and pass provided data object to the header and footer for interpolation
helpers.addUniversalTemplates = (str, data, callback) => {
  // Get Header
  helpers.getTemplate('_header', data, (headerErr, headerString) => {
    if (!headerErr && headerString) {
      // Get the footer
      helpers.getTemplate('_footer', data, (footerErr, footerString) => {
        if (!footerErr && footerString) {
          const fullString = headerString + str + footerString;
          callback(false, fullString);
        } else {
          callback('Could not find the footer string');
        }
      });
    } else {
      callback('Could not find the header template');
    }
  });
};

// Take a string and a data object and find/replace all the keys within it
helpers.interpolate = (str, data) => {
  str = typeof (str) === 'string' && str.length > 0 ? str : '';
  data = typeof (data) === 'object' && data !== null ? data : {};

  // Add the template globals to data object, prepending their key name with global
  Object.keys(config.templateGlobals).forEach((keyName) => {
    if (Object.prototype.hasOwnProperty.call(config.templateGlobals, keyName)) {
      data[`global.${keyName}`] = config.templateGlobals[keyName];
    }
  });

  // For each key in the data object, insert its value into the string at the corresponding placeholder
  Object.keys(data).forEach((key) => {
    const replace = data[key];
    const find = `{${key}}`;
    str = str.replace(find, replace);
  });

  return str;
};

// Get the contents of static asset
helpers.getStaticAsset = (fileName, callback) => {
  fileName = typeof (fileName) === 'string' && fileName.length > 0 ? fileName : false;
  if (fileName) {
    const publicDir = path.join(__dirname, '/../public/');
    fs.readFile(publicDir + fileName, (err, data) => {
      if (!err && data) {
        callback(false, data);
      } else {
        callback('No file could be found');
      }
    });
  } else {
    callback('Valid file name was not specified');
  }
};

// Export container
module.exports = helpers;
