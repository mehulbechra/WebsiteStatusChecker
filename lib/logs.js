/*
*   Library for storing and rotating logs
*/

// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for the module
const lib = {};

// Base directory of logs folder
lib.baseDir = path.join(__dirname, '/../.logs/');

// Append a string to a file. Create the file if not exist
lib.append = (file,str,callback) => {
    fs.open(lib.baseDir+file+'.log','a',(err,fileDescripter) => {
        if(!err && fileDescripter){
            fs.appendFile(fileDescripter,str+'\n',(err) => {
                if(!err){
                    fs.close(fileDescripter,(err) => {
                        if(!err) {
                            callback(false);
                        } else {
                            callback('Error closing file that was being appended');
                        }
                    });
                } else {
                    callback('Error appending to file');
                }
            });
        } else {
            callback('Could not open file for appending');
        }
    });
};

// List all the logs and optionally include compressed logs
lib.list = (includeCompressedLogs, callback) => {
    fs.readdir(lib.baseDir, (err,data) => {
        if (!err && data && data.length >0){
            let trimmedFileNames = [];
            data.forEach(fileName => {
                // Add the .log files
                if(fileName.indexOf('.log') > -1){
                    trimmedFileNames.push(fileName.replace('.log',''));
                }

                // Add on the .gz files
                if(includeCompressedLogs && fileName.indexOf('.gz.b64') > -1){
                    trimmedFileNames.push(fileName.replace('.gz.b64',''));
                }
            });
            callback(false,trimmedFileNames);
        } else {
            callback(err,data);
        }
    });
};

// Compress the contents of one .log file into .gz.b64 within same directory
lib.compress = (logId,newFileId,callback) => {
    const sourceFile = logId + '.log';
    const destinationFile = newFileId + '.gz.b64';

    // Read the source file
    fs.readFile(lib.baseDir+sourceFile,'utf-8',(err,inputString) => {
        if(!err && inputString){
            // Compress the data using gzip
            zlib.gzip(inputString,(err,buffer) => { 
                if(!err && buffer){
                    // Send data to destination file
                    fs.open(lib.baseDir+destinationFile,'wx',(err,fileDescripter) => {
                        if(!err && fileDescripter){
                            fs.writeFile(fileDescripter,buffer.toString('base64'), (err) => {
                                if(!err) {
                                    // Close the destination file
                                    fs.close(fileDescripter,(err) => {
                                        if(!err){
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

// De compress the contents of .gz.b64 file into string
lib.decompress = (fileId, callback) => {
    const fileName = fileId + '.gz.b64';
    fs.readFile(lib.baseDir+fileName,'utf-8',(err,string) => {
        if(!err && string) {
            // Decompress the data
            let inputBuffer = Buffer.from(str,'base64');
            zlib.unzip(inputBuffer,(err,outputBuffer) => {
                if(!err && outputBuffer) {
                    // Callback
                    const str = outputBuffer.toString();
                    callback(false, str);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

// Truncates a log file
lib.truncate = (logId, callback) => {
    fs.truncate(lib.baseDir+logId+'.log',0,(err) => {
        if(!err){
            callback(false);
        } else {
            callback(err);
        }
    });
};

// Export the module
module.exports = lib;