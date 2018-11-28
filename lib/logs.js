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
lib.append = (file, str, callback) => {
  fs.open(`${lib.baseDir + file}.log`, 'a', (openErr, fileDescripter) => {
    if (!openErr && fileDescripter) {
      fs.appendFile(fileDescripter, `${str}\n`, (appendErr) => {
        if (!appendErr) {
          fs.close(fileDescripter, (closeErr) => {
            if (!closeErr) {
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
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && data && data.length > 0) {
      const trimmedFileNames = [];
      data.forEach((fileName) => {
        // Add the .log files
        if (fileName.indexOf('.log') > -1) {
          trimmedFileNames.push(fileName.replace('.log', ''));
        }

        // Add on the .gz files
        if (includeCompressedLogs && fileName.indexOf('.gz.b64') > -1) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        }
      });
      callback(false, trimmedFileNames);
    } else {
      callback(err, data);
    }
  });
};

// Compress the contents of one .log file into .gz.b64 within same directory
lib.compress = (logId, newFileId, callback) => {
  const sourceFile = `${logId}.log`;
  const destinationFile = `${newFileId}.gz.b64`;

  // Read the source file
  fs.readFile(lib.baseDir + sourceFile, 'utf-8', (readErr, inputString) => {
    if (!readErr && inputString) {
      // Compress the data using gzip
      zlib.gzip(inputString, (zipErr, buffer) => {
        if (!zipErr && buffer) {
          // Send data to destination file
          fs.open(lib.baseDir + destinationFile, 'wx', (openErr, fileDescripter) => {
            if (!openErr && fileDescripter) {
              fs.writeFile(fileDescripter, buffer.toString('base64'), (writeErr) => {
                if (!writeErr) {
                  // Close the destination file
                  fs.close(fileDescripter, (closeErr) => {
                    if (!closeErr) {
                      callback(false);
                    } else {
                      callback(closeErr);
                    }
                  });
                } else {
                  callback(writeErr);
                }
              });
            } else {
              callback(openErr);
            }
          });
        } else {
          callback(zipErr);
        }
      });
    } else {
      callback(readErr);
    }
  });
};

// De compress the contents of .gz.b64 file into string
lib.decompress = (fileId, callback) => {
  const fileName = `${fileId}.gz.b64`;
  fs.readFile(lib.baseDir + fileName, 'utf-8', (readErr, str) => {
    if (!readErr && str) {
      // Decompress the data
      const inputBuffer = Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          // Callback
          const outStr = outputBuffer.toString();
          callback(false, outStr);
        } else {
          callback(err);
        }
      });
    } else {
      callback(readErr);
    }
  });
};

// Truncates a log file
lib.truncate = (logId, callback) => {
  fs.truncate(`${lib.baseDir + logId}.log`, 0, (err) => {
    if (!err) {
      callback(false);
    } else {
      callback(err);
    }
  });
};

// Export the module
module.exports = lib;
