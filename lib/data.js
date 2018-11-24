/*
*   Library for storing and editing data
*/

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module
const lib = {};

// Base directory of data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to a file
lib.create = (dir, file, data, callback) => {
  // Open file for writing
  fs.open(`${lib.baseDir + dir}/${file}.json`, 'wx', (openErr, fileDescriptor) => {
    if (!openErr && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data);

      // Write data to file
      fs.writeFile(fileDescriptor, stringData, (writeErr) => {
        if (!writeErr) {
          fs.close(fileDescriptor, (closeErr) => {
            if (!closeErr) {
              callback(false); // Errorback Pattern
            } else {
              callback('Error closing new file');
            }
          });
        } else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('Could not create new file, it may already exist!');
    }
  });
};

// Read data from file
lib.read = (dir, file, callback) => {
  fs.readFile(`${lib.baseDir + dir}/${file}.json`, 'utf-8', (err, data) => {
    if (!err && data) {
      const parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    } else {
      callback(err, data);
    }
  });
};

// Update data for existing file
lib.update = (dir, file, data, callback) => {
  // Open the file for writing
  fs.open(`${lib.baseDir + dir}/${file}.json`, 'r+', (openErr, fileDescriptor) => {
    if (!openErr && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data);

      // Truncate the file
      fs.ftruncate(fileDescriptor, (truncateErr) => {
        if (!truncateErr) {
          // Write to the file and close it
          fs.writeFile(fileDescriptor, stringData, (writeErr) => {
            if (!writeErr) {
              fs.close(fileDescriptor, (err) => {
                if (!err) {
                  callback(false);
                } else {
                  callback('Error closing existing file');
                }
              });
            } else {
              callback('Error writing to existing file');
            }
          });
        } else {
          callback('Error truncating file');
        }
      });
    } else {
      callback('Could not open file for updating, it may not exist.');
    }
  });
};

// Delete existing file
lib.delete = (dir, file, callback) => {
  // Unlink the file
  fs.unlink(`${lib.baseDir + dir}/${file}.json`, (err) => {
    if (!err) {
      callback(false);
    } else {
      callback('Error deleting file');
    }
  });
};

// List all the items in a dir
lib.list = (dir, callback) => {
  fs.readdir(`${lib.baseDir + dir}/`, (err, data) => {
    if (!err && data && data.length > 0) {
      const trimmedFileNames = [];
      data.forEach((fileName) => {
        trimmedFileNames.push(fileName.replace('.json', ''));
      });
      callback(false, trimmedFileNames);
    } else {
      callback(err, data);
    }
  });
};

// Export the module
module.exports = lib;
