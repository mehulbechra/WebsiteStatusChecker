/*
*   Request handlers
*/

/* eslint-disable no-console */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// Handlers
const handlers = {};

/*
*   HTML HANDLERS
*/

// Index handler
handlers.index = (data, callback) => {
  // Reject request other than GET
  if (data.method === 'get') {
    // Prepare data for interpolation
    const templateData = {
      'head.title': 'This is a title',
      'head.description': 'This is a meta description',
      'body.title': 'Hello templated world',
      'body.class': 'index',
    };

    // Read index template as string
    helpers.getTemplate('index', templateData, (indexErr, indexStr) => {
      if (!indexErr && indexStr) {
        // Add the universal header and footer
        helpers.addUniversalTemplates(indexStr, templateData, (err, str) => {
          if (!err && str) {
            callback(200, str, 'html');
          } else {
            callback(500, undefined, 'html');
          }
        });
      } else {
        callback(500, undefined, 'html');
      }
    });
  } else {
    callback(405, undefined, 'html');
  }
};

// Favicon Handler
handlers.favicon = (data, callback) => {
  // Reject request other than GET
  if (data.method === 'get') {
    // Read in the favicons data
    helpers.getStaticAsset('favicon.ico', (err, faviconData) => {
      if (!err && faviconData) {
        callback(200, faviconData, 'favicon');
      } else {
        callback(500);
      }
    });
  } else {
    callback(405);
  }
};

// Public Assets
handlers.public = (data, callback) => {
  // Reject request other than GET
  if (data.method === 'get') {
    // Get the fileName being requesting
    const trimmedAssetName = data.trimmedPath.replace('public/', '').trim();
    if (trimmedAssetName.length > 0) {
      // Read in the assets data
      helpers.getStaticAsset(trimmedAssetName, (err, assetData) => {
        if (!err && assetData) {
          // Determine the content type; default to plain text
          let contentType = 'plain';

          if (trimmedAssetName.indexOf('.css') > -1) {
            contentType = 'css';
          }
          if (trimmedAssetName.indexOf('.png') > -1) {
            contentType = 'png';
          }
          if (trimmedAssetName.indexOf('.jpeg') > -1) {
            contentType = 'jpg';
          }
          if (trimmedAssetName.indexOf('.ico') > -1) {
            contentType = 'favicon';
          }

          // Callback the data
          callback(200, assetData, contentType);
        } else {
          callback(404);
        }
      });
    } else {
      callback(404);
    }
  } else {
    callback(405);
  }
};

/*
*   JSON API HANDLERS
*/

// Users
handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
  // Check all required fields are filled out
  const firstName = typeof (data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof (data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  const password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  const tosAgreement = typeof (data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? data.payload.tosAgreement : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Check for duplicate user
    _data.read('users', phone, (readErr) => {
      if (readErr) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        // Store the user
        if (hashedPassword) {
          // Create user Object
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement: true,
          };

          _data.create('users', phone, userObject, (err) => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(400, { Error: 'Could not create the new user' });
            }
          });
        } else {
          callback(500, { Error: 'Could not hash the user password' });
        }
      } else {
        callback(400, { Error: 'A user with that phone number already exist' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = (data, callback) => {
  // Check that the phone number is valid
  const phone = typeof (data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {
    // Get the token from the headers
    const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
    // Verify that token matches phone
    handlers.tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            // Remove the hashed password
            delete data.hashedPassword;
            callback(200, userData);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, { Error: 'Missing required token in header, or token is invalid' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one req.)
handlers._users.put = (data, callback) => {
  // Check the required field
  const phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  // Check for optional field
  const firstName = typeof (data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof (data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if (phone) {
    // Error if nothing is available to update
    if (firstName || lastName || password) {
      // Get the token from the headers
      const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
      // Verify that token matches phone
      handlers.tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          // Look up the user
          _data.read('users', phone, (readErr, userData) => {
            if (!readErr && userData) {
              // Update the necessary fields
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              // Store the new update
              _data.update('users', phone, userData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: 'Could not update the user' });
                }
              });
            } else {
              callback(400, { Error: 'The specified user does not exist' });
            }
          });
        } else {
          callback(403, { Error: 'Missing required token in header, or token is invalid' });
        }
      });
    } else {
      callback(400, { Error: 'Missing field to update' });
    }
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Users - delete
// Required data: phone
handlers._users.delete = (data, callback) => {
  // Check that the phone number is valid
  const phone = typeof (data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {
    // Get the token from the headers
    const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
    // Verify that token matches phone
    handlers.tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read('users', phone, (readErr, userData) => {
          if (!readErr && userData) {
            _data.delete('users', phone, (deleteErr) => {
              if (!deleteErr) {
                // Delete each of the checks assosiated with user
                const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                const checksToDelete = userChecks.length;
                if (checksToDelete > 0) {
                  let checksDeleted = 0;
                  let deletionErrors = false;
                  // Loop through the checks
                  userChecks.forEach((checkId) => {
                    // Delete the check
                    _data.delete('checks', checkId, (err) => {
                      if (err) {
                        deletionErrors = true;
                      }
                      checksDeleted += 1;
                      if (checksDeleted === checksToDelete) {
                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, { Error: 'Errors encountered while attempting to delete all of the users checks. All checks may not have been deleted from the system succesfully' });
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, { Error: 'Could not delete the specified user' });
              }
            });
          } else {
            callback(400, { Error: 'Could not find the specified user' });
          }
        });
      } else {
        callback(403, { Error: 'Missing required token in header, or token is invalid' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Tokens
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the tokens submethods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  const phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  const password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  if (phone && password) {
    // Looking the user that matches the phone number
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        // Hash the sent password and compare
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          // Create a token with random name. Exp date is 1 hour
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            id: tokenId,
            phone,
            expires,
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, (createErr) => {
            if (!createErr) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: 'Could not create new token' });
            }
          });
        } else {
          callback(400, { Error: 'Password did not match the specified user\'s stored password' });
        }
      } else {
        callback(400, { Error: 'Could not find the specified user' });
      }
    });
  } else {
    callback(400, { Error: 'Missing Required fields' });
  }
};

// Tokens - get
// Required Data - id
// Optional Data - none
handlers._tokens.get = (data, callback) => {
  // Check that the id is valid
  const id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  // Check the required field
  const id = typeof (data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
  const extend = (typeof (data.payload.extend) === 'boolean' && data.payload.extend === true);
  if (id && extend) {
    _data.read('tokens', id, (readErr, tokenData) => {
      if (!readErr && tokenData) {
        // Check that the token is alive
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new update
          _data.update('tokens', id, tokenData, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Error: 'Could not update token\'s expiration' });
            }
          });
        } else {
          callback(400, { Error: 'Token has already expired and cannot be extended' });
        }
      } else {
        callback(400, { Error: 'Specified token does not exist' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields or fields are invalid' });
  }
};

// Tokens - delete
// Required data - id
// Optional Data - none
handlers._tokens.delete = (data, callback) => {
  // Check that the id is valid
  const id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    _data.read('tokens', id, (readErr, tokenData) => {
      if (!readErr && tokenData) {
        _data.delete('tokens', id, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: 'Could not delete the specified token' });
          }
        });
      } else {
        callback(400, { Error: 'Could not find the specified token' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Verify if a given token id is currently valid for a given user
handlers.tokens.verifyToken = (id, phone, callback) => {
  // Lookup the token
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Checks
handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for checks methods
handlers._checks = {};

// Checks - post
// Required Data: protocol, url, method, successCodes, timeoutSeconds
// Optional Data: none
handlers._checks.post = (data, callback) => {
  // Validate inputs
  const protocol = typeof (data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  const url = typeof (data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof (data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  const successCodes = typeof (data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  const timeoutSeconds = typeof (data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from headers
    const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;

    // Lookup the user by reading the token
    _data.read('tokens', token, (tokenReadErr, tokenData) => {
      if (!tokenReadErr && tokenData) {
        const userPhone = tokenData.phone;

        // Lookup the user data
        _data.read('users', userPhone, (userReadErr, userData) => {
          if (!userReadErr && userData) {
            const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
            // Verify that the user has less than the max-checks-per-user
            if (userChecks.length < config.maxChecks) {
              // Create a random id for check
              const checkId = helpers.createRandomString(20);

              // Create the check object and include user's phone
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds,
              };

              // Save the object
              _data.create('checks', checkId, checkObject, (createErr) => {
                if (!createErr) {
                  // Add the checkId to users object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update('users', userPhone, userData, (err) => {
                    if (!err) {
                      callback(200, checkObject);
                    } else {
                      callback(500, { Error: 'Could not update the user with new check' });
                    }
                  });
                } else {
                  callback(500, { Error: 'Could not create the new check' });
                }
              });
            } else {
              callback(400, { Error: `The user already has the maximum number of checks(${config.maxChecks})` });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { Error: 'Missing required inputs or inputs are invalid' });
  }
};

// Checks - get
// Required Data: id
// Optional Data: none
handlers._checks.get = (data, callback) => {
  // Check that the id is valid
  const id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Look up the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Get the token from the headers
        const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
        // Verify that token is valid and belongs to user who created the check
        handlers.tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            // Return the checkData
            callback(200, checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Checks - put
// Required Data: id
// Optional Data: protocol, url, method, successCodes, timeoutSeconds (at least 1)
handlers._checks.put = (data, callback) => {
  // Check the required field
  const id = typeof (data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
  // Check for optional field
  const protocol = typeof (data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  const url = typeof (data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof (data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  const successCodes = typeof (data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  const timeoutSeconds = typeof (data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if (id) {
    // Error if nothing is available to update
    if (protocol || url || method || successCodes || timeoutSeconds) {
      // Look up the check
      _data.read('checks', id, (checkReadErr, checkData) => {
        if (!checkReadErr && checkData) {
          // Get the token from the headers
          const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
          // Verify that token is valid and belongs to user who created it
          handlers.tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
            if (tokenIsValid) {
              // Update the necessary fields
              if (protocol) {
                checkData.protocol = protocol;
              }
              if (url) {
                checkData.url = url;
              }
              if (method) {
                checkData.method = method;
              }
              if (successCodes) {
                checkData.successCodes = successCodes;
              }
              if (timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }
              // Store the new update
              _data.update('checks', id, checkData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: 'Could not update the check' });
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(400, { Error: 'Check id does not exist' });
        }
      });
    } else {
      callback(400, { Error: 'Missing field to update' });
    }
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Checks - delete
// Required data - id
// Optional Data - none
handlers._checks.delete = (data, callback) => {
  // Check that the id is valid
  const id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Look up the check
    _data.read('checks', id, (checkReaderr, checkData) => {
      if (!checkReaderr && checkData) {
        // Get the token from the headers
        const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
        // Verify that token matches phone
        handlers.tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            _data.delete('checks', id, (deleteErr) => {
              if (!deleteErr) {
                // Look up the user
                _data.read('users', checkData.userPhone, (readErr, userData) => {
                  if (!readErr && userData) {
                    const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                    // Remove the check from the list
                    const checkPosition = userChecks.indexOf(id);
                    if (checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);
                      // Re-Save the userData
                      _data.update('users', checkData.userPhone, userData, (err) => {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, { Error: 'Could not update the user' });
                        }
                      });
                    } else {
                      callback(500, { Error: 'Could not find the check on user obeject so could not remove it' });
                    }
                  } else {
                    callback(500, { Error: 'Could not find the user that created the check, so could not remove the check from the list of checks on the user object' });
                  }
                });
              } else {
                callback(500, { Error: 'Could not delete the specified check' });
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400, { Error: 'The specified check id does not exist' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Ping Handler
handlers.ping = (data, callback) => callback(200);

// Not Found Handler
handlers.notFound = (data, callback) => callback(404);

// Export the module
module.exports = handlers;
