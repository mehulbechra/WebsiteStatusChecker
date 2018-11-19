/*
*   Request handlers
*/

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

// Handlers
const handlers = {};

// Users
handlers.users = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
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
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? data.payload.tosAgreement : false;

    if(firstName && lastName && phone && password && tosAgreement){
        // Check for duplicate user
        _data.read('users',phone,(err,data) => {
            if(err){
                // Hash the password
                const hashedPassword = helpers.hash(password);

                // Store the user
                if(hashedPassword){
                    // Create user Object
                    var userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true
                    };

                    _data.create('users', phone, userObject, (err) => {
                        if(!err){
                            callback(200);
                        } else {
                            console.log(err);
                            callback(400, {'Error' : 'Could not create the new user'});
                        }
                    });
                } else {
                    callback(500, {'Error' : 'Could not hash the user password'});
                }
            } else {
                callback(400, {'Error': 'A user with that phone number already exist'});
            }
        });
    } else {
        callback(400, {'Error':'Missing required fields'});
    }
};

// Users - get
// Required data: phone
// Optional data: none
// TODO: Only let authenticated user access only their data
handlers._users.get = (data, callback) => {
    // Check that the phone number is valid
    const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone) {
        _data.read('users', phone, (err, data) => {
            if(!err && data) {
                // Remove the hashed password 
                delete data.hashedPassword;
                callback(200, data);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one req.)
// TODO: Only let authenticated user access only their data
handlers._users.put = (data, callback) => {
    // Check the required field
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    // Check for optional field
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    
    if(phone){
        // Error if nothing is available to update
        if(firstName || lastName || password){
            // Look up the user
            _data.read('users',phone,(err,userData) => {
                if(!err && userData){
                    // Update the necessary fields
                    if(firstName) {
                        userData.firstName = firstName;
                    }
                    if(lastName) {
                        userData.lastName = lastName;
                    }
                    if(password) {
                        userData.hashedPassword = helpers.hash(password);
                    }
                    // Store the new update
                    _data.update('users', phone, userData, (err) => {
                        if(!err){
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {'Error': 'Could not update the user'});
                        }
                    });
                } else {
                    callback(400, {'Error': 'The specified user does not exist'});
                }
            });
        } else {
            callback(400, {'Error':'Missing field to update'});
        }
    } else {
        callback(400, {'Error':'Missing required field'});
    }
};

// Users - delete
// Required data: phone
// TODO: Only let authenticated user delete only their data
// TODO: Clean up any other data files associated with that user
handlers._users.delete = (data, callback) => {
    // Check that the phone number is valid
    const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone) {
        _data.read('users', phone, (err, data) => {
            if(!err && data) {
                _data.delete('users',phone,(err) => {
                    if(!err){
                        callback(200);
                    } else {
                        callback(500, {'Error': 'Could not delete the specified user'});
                    }
                });
            } else {
                callback(400, {'Error':'Could not find the specified user'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
};

// Ping Handler
handlers.ping = (data, callback) => callback(200);

// Not Found Handler
handlers.notFound = (data, callback) => callback(404);

// Export the module
module.exports = handlers;