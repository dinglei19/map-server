'use strict';

const fs = require('fs');
const objectAssign = require('object-assign');

/**
 * Merge a configuration with tileset objects and
 * set 'smart' defaults based on these sources, e.g. center, zoom
 * @param {object} config passed to the mbview server
 * @param {array} tilesets of objects extracted from the mbtiles
 * @return {object} updated config object with sources appended
 */
module.exports.mergeConfigurations = function (config, tilesets) {
  const tilehash = tilesets.reduce((prev, curr) => {
    const c = {};
    c[curr.basename] = curr;
    return objectAssign({}, prev, c);
  }, {});
  const smart = objectAssign({}, config, tilesets[0]);
  const centerZoom = smart.center.pop();
  smart.zoom = smart.zoom || centerZoom;
  smart.center.push(smart.zoom);
  return objectAssign({}, smart, {
    sources: tilehash
  });
};

/**
 * Get usage instructions
 * @return {String} the instructions to run this thing
 */
module.exports.usage = function () {
  const u = [];
  u.push('usage: mbview [options] [files]');
  u.push('');
  u.push(' --port sets port to use (default: 3000)');
  u.push(' --quiet or -q supress all logging except the address to visit');
  u.push(' -n don\'t automatically open the browser on start');
  u.push(' --basemap, --base or --map sets the basemap style (default: dark)');
  u.push(' --version returns module version');
  u.push(' --help prints this message');
  u.push('');
  return u.join('\n');
};

/**
 * Get module version from the package.json file
 * @return {String} version number
 */
module.exports.version = function () {
  const data = fs.readFileSync(__dirname + '/package.json');
  return JSON.parse(data).version;
};


/**
 * 获取本机ip地址
 */
module.exports.getIPAddress = function () {
  var interfaces = require('os').networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];
    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
}