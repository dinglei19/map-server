/* eslint-disable no-console */
'use strict';

const express = require('express');
const app = express();
const MBTiles = require('@mapbox/mbtiles');
const q = require('d3-queue').queue();
const utils = require('./utils');
const objectAssign = require('object-assign');

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
// app.use(express.static('public'));

module.exports = {

  /**
   * Load a tileset and return a reference with metadata
   * @param {object} file reference to the tileset
   * @param {function} callback that returns the resulting tileset object
   */
  loadTiles: function (file, callback) {
    new MBTiles(file, ((err, tiles) => {
      if (err) throw err;
      tiles.getInfo((err, info) => {
        if (err) throw err;

        const tileset = objectAssign({}, info, {
          tiles: tiles
        });

        callback(null, tileset);
      });
    }));
  },

  /**
  * Defer loading of multiple MBTiles and spin up server.
  * Will merge all the configurations found in the sources.
  * @param {object} config for the server, e.g. port
  * @param {function} callback with the server configuration loaded
  */
  serve: function (config, callback) {
    const options = {
      setHeaders: function (res) {
        res.set('Access-Control-Allow-Origin', '*');
      }
    };
    app.use(express.static('public', options));

    const loadTiles = this.loadTiles;
    const listen = this.listen;

    config.mbtiles.forEach((file) => {
      q.defer(loadTiles, file);
    });

    q.awaitAll((error, tilesets) => {
      if (error) throw error;
      const finalConfig = utils.mergeConfigurations(config, tilesets);
      listen(finalConfig, callback);
    });
  },

  listen: function (config, onListen) {
    let pbfsources = {}, pngsources = {};
    Object.keys(config.sources).forEach((key) => {
      if (config.sources[key].format) {
        if (config.sources[key].format === 'pbf') {
          pbfsources[key] = config.sources[key];
        } else if (config.sources[key].format === 'png') {
          pngsources[key] = config.sources[key];
        }
      }
    })
    app.get('/pbf', (req, res) => {
      res.render('vector', {
        ...config,
        sources: pbfsources
      });
    });

    app.get('/raster', (req, res) => {
      res.render('raster', {
        ...config,
        sources: pngsources
      });
    });


    app.get('/:source/:z/:x/:y.*', (req, res) => {
      const p = req.params;
      const format = req.params['0'];
      const tiles = config.sources[p.source].tiles;

      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'content-type');
      res.header('Access-Control-Allow-Methods', '*');
      res.setHeader('Cache-Control', 'public,max-age=3153660000');
      switch (format) {
        case "pbf":
          tiles.getTile(p.z, p.x, p.y, (err, tile, headers) => {
            if (err) {
              res.status(404);
              res.end();
            } else {
              res.writeHead(200, headers);
              res.end(tile);
            }
          });
          break;
        case "png":
          res.header('Content-Type', 'image/png');
          tiles.getTile(p.z, p.x, p.y, (err, tile, headers) => {
            if (err) {
              res.status(404);
            } else {
              res.writeHead(200, headers);
              res.end(tile);
            }
          });
          break;
        default:
          break;
      }

    });

    config.server = app.listen(config.port, () => {
      onListen(null, config);
    });
  }
};
