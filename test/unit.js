/*
*   Unit Tests
*/

// Dependencies
const assert = require('assert');
const helpers = require('./../lib/helpers');
const logs = require('./../lib/logs');

// Holder for the tests
const unit = {};

// Assert that the getANumber func is returning a number
unit['helpers.getANumber should return 1'] = (done) => {
  const val = helpers.getANumber();
  assert.equal(val, 1);
  done();
};

unit['helpers.getANumber should return 2'] = (done) => {
  const val = helpers.getANumber();
  assert.equal(val, 2);
  done();
};

// Logs.list should return an array and a false error
unit['logs.list should callback an array of file names and false error'] = (done) => {
  logs.list(true, (err, logFileNames) => {
    assert.equal(err, false);
    assert.ok(logFileNames instanceof Array);
    assert.ok(logFileNames.length > 1);
    done();
  });
};

// Logs.truncate should not throw if log id doesnt exist
unit['Logs.truncate should not throw if log id doesnt exist, it should callback an error instead'] = (done) => {
  assert.doesNotThrow(() => {
    logs.truncate('I donot exist', (err) => {
      assert.ok(err);
      done();
    });
  }, TypeError);
};

// Export the test to the runner
module.exports = unit;
