#!/usr/bin/env node

/* eslint-disable no-console */
'use strict';

const argv = require('minimist')(process.argv.slice(2), {
  boolean: ['n', 'quiet', 'q']
});
// const open = require('open');
const fs = require('fs');
const utils = require('./utils');

// const mbtiles = argv._;

const pathName = __dirname + '/assets/';
const mbtiles = [];

fs.readdir(pathName, (err, files) => {
  if (err) {
    console.log(err);
  } else {
    for (let i = 0; i < files.length; i++) {
      mbtiles.push('./assets/' + files[i]);
    }
    // eslint-disable-next-line no-use-before-define
    init();
  }
});

const init = function () {
  if (argv.version || argv.v) {
    console.log(utils.version());
    process.exit(0);
  } else if (!mbtiles.length) {
    console.log(utils.usage());
    process.exit(1);
  }

  try {
    mbtiles.forEach((f) => { fs.statSync(f).isFile(); });
  } catch (e) {
    return console.error(e);
  }

  const MBView = require('./mbview');

  const params = {
    center: [35.33, 103.23],
    mbtiles: mbtiles,
    port: argv.port || 7900,
    ip: argv.ip || utils.getIPAddress(),
    zoom: 12,
    quiet: argv.q || argv.quiet
  };

  MBView.serve(params, (err, config) => {
    console.log('Listening on http://' + params.ip + ':' + config.port);
  });
};
