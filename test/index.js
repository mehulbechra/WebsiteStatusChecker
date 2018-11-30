/*
* Test Runner
*/

/* eslint-disable func-names,no-console */

// Application logic for the test runner
const _app = {};

// Container for the test
_app.tests = {};

// Add on the unit test
_app.tests.unit = require('./unit');

// Count all the tests
_app.countTests = () => {
  let counter = 0;
  Object.keys(_app.tests).forEach((key) => {
    if (Object.hasOwnProperty.call(_app.tests, key)) {
      const subTests = _app.tests[key];
      Object.keys(subTests).forEach((testName) => {
        if (Object.hasOwnProperty.call(subTests, testName)) {
          counter += 1;
        }
      });
    }
  });
  return counter;
};

// Run all the tests, collecting the errors and successes
_app.runTests = function () {
  const errors = [];
  let successes = 0;
  const limit = _app.countTests();
  let counter = 0;
  Object.keys(_app.tests).forEach((key) => {
    if (Object.hasOwnProperty.call(_app.tests, key)) {
      const subTests = _app.tests[key];
      Object.keys(subTests).forEach((testName) => {
        if (Object.hasOwnProperty.call(subTests, testName)) {
          (function () {
            const tmpTestName = testName;
            const testValue = subTests[testName];
            // Call the test
            try {
              testValue(() => {
                console.log('\x1b[32m%s\x1b[0m', tmpTestName);
                counter += 1;
                successes += 1;
                if (counter === limit) {
                  _app.produceTestReport(limit, successes, errors);
                }
              });
            } catch (e) {
              // If it throes, then it failed; capture the error and log in red
              errors.push({
                name: testName,
                error: e,
              });
              console.log('\x1b[31m%s\x1b[0m', tmpTestName);
              counter += 1;
              if (counter === limit) {
                _app.produceTestReport(limit, successes, errors);
              }
            }
          }());
        }
      });
    }
  });
};

// Produce a test outcome report
_app.produceTestReport = (limit, successes, errors) => {
  console.log('');
  console.log('--------------BEGIN TEST REPORT-----------------');
  console.log('');
  console.log('Total Tests: ', limit);
  console.log('Pass: ', successes);
  console.log('Fail: ', errors.length);
  console.log('');

  // If errors present, print details
  if (errors.length > 0) {
    console.log('--------------BEGIN ERROR DETAILS-----------------');
    console.log('');

    errors.forEach((testError) => {
      console.log('\x1b[31m%s\x1b[0m', testError.name);
      console.log(testError.error);
      console.log('');
    });
    console.log('');
    console.log('--------------END ERROR DETAILS-----------------');
  }

  console.log('');
  console.log('--------------END TEST REPORT-----------------');
};

_app.runTests();
