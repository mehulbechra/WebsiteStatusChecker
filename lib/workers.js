/*
*   Worker related tasks
*/ 

// Dependencies
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const http = require('http');
const https = require('https');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');

// Instantiate the worker object
const workers = {};

// Lookup all checks, get their data, send it to a validator
workers.gatherAllChecks = () => {
    // Get all checks
    _data.list('checks',(err, checks) => {
        if(!err && checks && checks.length > 0){
            checks.forEach(check => {
                // Read in the check data
                _data.read('checks',check, (err, originalCheckData) => {
                    if(!err && originalCheckData){
                        // Pass the data to check validator
                        workers.validateCheckData(originalCheckData);
                    } else {
                        console.log("Error reading one of the checks data");
                    }
                });
            });
        } else {
            console.log("Error: Could not find any checks to process");
        }
    });
};

// Sanity-check the check data
workers.validateCheckData = (originalCheckData) => {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post','get','put','delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;
    
    // Initialize the keys for the first time
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // Pass the data to the next step
    if(originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds){
        workers.performCheck(originalCheckData);
    } else {
        console.log("Error: One of the checks is not properly formated. Skipping it.")
    }
};

// Perform the check, send originalCheckData and outcome to next process
workers.performCheck = (originalCheckData) => {
    // Perpare the initial check outcome
    const checkOutcome = {
        'error': false,
        'reponseCode': false
    };

    // Mark that the outcome has not been sent yet
    let outcomeSent = false;

    // Parse hostname and path from originalCheckData
    const parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path;        // using path (not pathname) as the query string is required
    
    // Construct the request
    const requestDetails = {
        'protocol': originalCheckData.protocol+':',
        'hostname':hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    };

    // Instantiate the request object using either http/https
    const _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    const req = _moduleToUse.request(requestDetails, (res) => {
        // Grab the status of the sent request
        const status = res.statusCode;

        // Update the checkOutcome and pass the data along
        checkOutcome.responseCode = status;
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', (e) => {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error' : true,
            'value' : e
        };
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the timeout
    req.on('timeout', (e) => {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error' : true,
            'value' : 'timeout'
        };
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Send the request
    req.end();

};

// Process the checkOutcome, update the check data, trigger an alert
// Special logic for accomodating a check that has never been tested before ( dont alert the user ) / first time down to up
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
    // Decide if the check is considered up or down
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

    // Decide if alert is wanted
    const alertWanted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Log the outcome
    const timeOfCheck = Date.now();
    workers.log(originalCheckData,checkOutcome,state,alertWanted, timeOfCheck);

    // Update the check data
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    // Save the update
    _data.update('checks',newCheckData.id, newCheckData, (err) => {
        if(!err) {
            // Send the new check data to next phase
            if(alertWanted){
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log('Check outcome has not changed, no alert needed');
            }
        } else {
            console.log("Error trying to update to one of the checks");
        }
    });
};

// Alert the user due to status change
workers.alertUserToStatusChange = (newCheckData) => {
    const msg = 'Alert: Your check for '+newCheckData.method.toUpperCase()+' '+newCheckData.protocol+'://'+newCheckData.url+' is currently '+newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) => {
        if(!err){
            console.log("Success: User was alerted via sms:",msg);
        } else {
            console.log("Error: Could not send sms alert");
        }
    });
};

workers.log = (originalCheckData,checkOutcome,state,alertWanted,timeOfCheck) => {
    // Form the log data
    const logData = {
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWanted,
        'time': timeOfCheck
    };

    // Convert data to string
    const logString = JSON.stringify(logData);

    // Determine the name of the log file
    const logFileName = originalCheckData.id;

    // Append the log string to the file
    _logs.append(logFileName,logString,(err) => {
        if(!err){
            console.log("Logging to file succeeded");
        } else {
            console.log("Logging to file failed");
        }
    });
};

// Timer to excute worker process once per minute
workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks();
    },1000*60)
};

// Rotate (compress) log files
workers.rotateLogs = () => {
    // List all the non compressed log files
    _logs.list(false,(err,logs) => {
        if(!err && logs && logs.length>0) {
            logs.forEach((logName) => {
                // Compress the data to a different file
                const logId = logName.replace('.log','');
                const newFileId = logId+'-'+Date.now();
                _logs.compress(logId,newFileId,(err) => {
                    if(!err){
                        // Truncate the log
                        _logs.truncate(logId,(err) => {
                            if(!err){
                                console.log("Success truncating log file");
                            } else {
                                console.log("Error truncating log file");
                            }
                        });
                    } else {
                        console.log("Error compressing one of the log file",err);
                    }
                });
            });
        } else {
            console.log('Error: could not find any logs to rotate');
        }
    });
};

// Timer to excute log rotation process once per day
workers.logRotationLoop = () => {
    setInterval(() => {
        workers.rotateLogs();
    },1000*60*60*24);
};

// Init
workers.init = () => {
    // Execute all the checks at the start
    workers.gatherAllChecks();

    // Call the timed infinite loop
    workers.loop();

    // Compress all logs immediately
    workers.rotateLogs();

    // Call the compression loop so logs will be compressed later on
    workers.logRotationLoop();
};

// Export the module
module.exports = workers;