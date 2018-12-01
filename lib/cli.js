/*
*   CLI Tasks
*/

/* eslint-disable no-console,consistent-return,array-callback-return */

// Dependencies
const readline = require('readline');
const events = require('events');
const os = require('os');
const v8 = require('v8');
const childProcess = require('child_process');
const _data = require('./data');
const _logs = require('./logs');
const helpers = require('./helpers');

class _events extends events {}
const e = new _events();

// Instantiate the cli module
const cli = {};

// Input Handlers
e.on('man', () => {
  cli.responders.help();
});

e.on('help', () => {
  cli.responders.help();
});

e.on('exit', () => {
  cli.responders.exit();
});

e.on('stats', () => {
  cli.responders.stats();
});

e.on('list users', () => {
  cli.responders.listUsers();
});

e.on('more user info', (str) => {
  cli.responders.moreUserInfo(str);
});

e.on('list checks', (str) => {
  cli.responders.listChecks(str);
});

e.on('more check info', (str) => {
  cli.responders.moreCheckInfo(str);
});

e.on('list logs', () => {
  cli.responders.listLogs();
});

e.on('more log info', (str) => {
  cli.responders.moreLogInfo(str);
});

// Responders object
cli.responders = {};

// Help / Man
cli.responders.help = () => {
  const commands = {
    exit: 'Kill the CLI (and the rest of the application)',
    man: 'Show this help page',
    help: 'Alias of the "man" command',
    stats: 'Get statistics on the underying operating system and resource utilization',
    'list users': 'Show a list of all the registered (undeleted) users in the system',
    'more user info --{userId}': 'Details of a specific user',
    'list checks --up --down': 'Show a list of all the active checks in the system, including their state. The "--up" and the "--down" flags are both optional',
    'more check info --{checkId}': 'Show details of a specified check',
    'list logs': 'Show a list of all the log files available to read ( compressed and uncompressed )',
    'more log info --{fileName}': 'Show details of a specified log file',
  };

  // Show the header for the help page, as wide as the screen
  cli.horizontalLine();
  cli.centered('CLI MANUAL');
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Show each command in white and yellow
  Object.keys(commands).forEach((key) => {
    if (Object.hasOwnProperty.call(commands, key)) {
      const value = commands[key];
      let line = `\x1b[33m${key}\x1b[0m`;
      const padding = 60 - line.length;
      for (let i = 0; i < padding; i += 1) {
        line += ' ';
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    }
  });

  cli.verticalSpace();
  cli.horizontalLine();
};

// Create a vertical space
cli.verticalSpace = (lines) => {
  lines = typeof (lines) === 'number' && lines > 0 ? lines : 1;
  for (let i = 0; i < lines; i += 1) {
    console.log('');
  }
};

// Create a horizontal line across the screen
cli.horizontalLine = () => {
  // Get the avilable screen size
  const width = process.stdout.columns;
  let line = '';
  for (let i = 0; i < width; i += 1) {
    line += '-';
  }
  console.log(line);
};

// Create centered text
cli.centered = (str) => {
  str = typeof (str) === 'string' && str.trim().length > 0 ? str.trim() : '';

  // Get the available screen size
  const width = process.stdout.columns;

  // Calculate the left padding there should be
  const leftPadding = Math.floor((width - str.length) / 2);

  let line = '';
  for (let i = 0; i < leftPadding; i += 1) {
    line += ' ';
  }
  line += str;
  console.log(line);
};

// Exit
cli.responders.exit = () => {
  process.exit(0);
};

// Stats
cli.responders.stats = () => {
  // Compile an object of stats
  const stats = {
    'Load Average': os.loadavg().join(' '),
    'CPU Count': os.cpus().length,
    'Free Memory': os.freemem(),
    'Current Malloced Memory': v8.getHeapStatistics().malloced_memory,
    'Peak Malloced Memory': v8.getHeapStatistics().peak_malloced_memory,
    'Allocated Heap Used (%)': Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size) * 100),
    'Available Heap Allocated (%)': Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit) * 100),
    Uptime: `${os.uptime()} Seconds`,
  };

  // Create a header for the stats
  cli.horizontalLine();
  cli.centered('SYSTEM STATISTICS');
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Log each stat
  Object.keys(stats).forEach((key) => {
    if (Object.hasOwnProperty.call(stats, key)) {
      const value = stats[key];
      let line = `\x1b[33m${key}\x1b[0m`;
      const padding = 60 - line.length;
      for (let i = 0; i < padding; i += 1) {
        line += ' ';
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    }
  });

  cli.verticalSpace();
  cli.horizontalLine();
};

// List Users
cli.responders.listUsers = () => {
  _data.list('users', (err, userIds) => {
    if (!err && userIds && userIds.length > 0) {
      cli.verticalSpace();
      userIds.forEach((userId) => {
        _data.read('users', userId, (readErr, userData) => {
          if (!readErr && userData) {
            let line = `Name: ${userData.firstName} ${userData.lastName} Phone: ${userData.phone} Checks: `;
            const numberOfChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array && userData.checks.length > 0 ? userData.checks.length : 0;
            line += numberOfChecks;
            console.log(line);
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

// More User Info
cli.responders.moreUserInfo = (str) => {
  // Get the id from the string
  const arr = str.split('--');
  const userId = typeof (arr[1]) === 'string' && arr[1].trim().length > 0 ? arr[1].trim() : false;
  if (userId) {
    // Lookup the user
    _data.read('users', userId, (readErr, userData) => {
      if (!readErr && userData) {
        // Remove the hash password
        delete userData.hashedPassword;

        // Print JSON with text highlighting
        cli.verticalSpace();
        console.dir(userData, { colors: true });
        cli.verticalSpace();
      }
    });
  }
};

// List Checks
cli.responders.listChecks = (str) => {
  _data.list('checks', (err, checkIds) => {
    if (!err && checkIds && checkIds.length > 0) {
      cli.verticalSpace();
      checkIds.forEach((checkId) => {
        _data.read('checks', checkId, (readErr, checkData) => {
          const lowerString = str.toLowerCase();

          // Get the state, default to down
          const state = typeof (checkData.state) === 'string' ? checkData.state : 'down';
          // Get the state, default to unknown
          const stateOrUnknown = typeof (checkData.state) === 'string' ? checkData.state : 'unknown';
          // If the user has specified the state, or hasnt specified any state, include the current check accordingly
          if (lowerString.indexOf(`--${state}`) > -1 || (lowerString.indexOf('--down') === -1 && lowerString.indexOf('--up') === -1)) {
            const line = `ID: ${checkData.id} ${checkData.method.toUpperCase()} ${checkData.protocol}://${checkData.url} State: ${stateOrUnknown}`;
            console.log(line);
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

// More Check Info
cli.responders.moreCheckInfo = (str) => {
  // Get the id from the string
  const arr = str.split('--');
  const checkId = typeof (arr[1]) === 'string' && arr[1].trim().length > 0 ? arr[1].trim() : false;
  if (checkId) {
    // Lookup the check
    _data.read('checks', checkId, (readErr, checkData) => {
      if (!readErr && checkData) {
        // Print JSON with text highlighting
        cli.verticalSpace();
        console.dir(checkData, { colors: true });
        cli.verticalSpace();
      }
    });
  }
};

// List Logs -- compressed only for now
cli.responders.listLogs = () => {
  const ls = childProcess.spawn('ls', ['./.logs/']);
  ls.stdout.on('data', (dataObj) => {
    // Explode into seperate lines
    const dataStr = dataObj.toString();
    const logFileNames = dataStr.split('\n');

    cli.verticalSpace();
    logFileNames.forEach((logFileName) => {
      if (typeof (logFileName) === 'string' && logFileName.length > 0 && logFileName.indexOf('-') > -1) {
        console.log(logFileName.trim().split('.')[0]);
        cli.verticalSpace();
      }
    });
  });
};


// More Log Info
cli.responders.moreLogInfo = (str) => {
  // Get the logFileName from the string
  const arrr = str.split('--');
  const logFileName = typeof (arrr[1]) === 'string' && arrr[1].trim().length > 0 ? arrr[1].trim() : false;
  if (logFileName) {
    cli.verticalSpace();
    // Decompress the log file
    _logs.decompress(logFileName, (err, strData) => {
      if (!err && strData) {
        // Split into lines
        const arr = strData.split('\n');
        arr.forEach((jsonString) => {
          const logObject = helpers.parseJsonToObject(jsonString);
          if (logObject && JSON.stringify(logObject) !== {}) {
            console.dir(logObject, { colors: true });
            cli.verticalSpace();
          }
        });
      }
    });
  }
};

// Input Processor
cli.processInput = (str) => {
  str = typeof (str) === 'string' && str.trim().length > 0 ? str.trim() : false;
  if (str) {
    // Codify the unique strings that identify the unique questions allowed to be asked
    const uniqueInputs = [
      'man',
      'help',
      'exit',
      'stats',
      'list users',
      'more user info',
      'list checks',
      'more check info',
      'list logs',
      'more log info',
    ];

    // Go through the possible inputs, emit an event when a match is found
    let matchFound = false;
    uniqueInputs.some((input) => {
      if (str.toLowerCase().indexOf(input) > -1) {
        matchFound = true;
        // Emit an event matching the unique input, and include the full string given
        e.emit(input, str);
        return true;
      }
    });

    // If no match found, try again
    if (!matchFound) {
      console.log('Sorry, try again');
    }
  }
};

// Init
cli.init = () => {
  // Send the start message to the console in dark blue
  console.log('\x1b[34m%s\x1b[0m', 'The CLI is running');

  // Start the interface
  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '',
  });

  // Create an initial prompt
  _interface.prompt();

  // Handle each line of input seperately
  _interface.on('line', (str) => {
    // Send to the input processor
    cli.processInput(str);

    // Re-Initialize the prompt
    _interface.prompt();
  });

  // If the user stops the CLI, kill the assosiated process
  _interface.on('close', () => {
    process.exit(0);
  });
};

// Export the module
module.exports = cli;
