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
    app.use(express.static('public',options));

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
    const format = config.tiles._info.format;
    app.get('/', (req, res) => {
      if (format === 'pbf') {
        res.render('vector', config);
      } else {
        res.render('raster', config);
      }
    });

    let rasters = {};
    Object.keys(config.sources).some((layer) => {
      if (config.sources[layer].format === 'png') {
        rasters = config.sources[layer];
        return true;
      } else {
        return false;
      }
    });
    app.get('/raster', (req, res) => {
      if (Object.keys(rasters).length > 0){
        res.render('raster', {
          center: rasters.center,
          maxzoom:  rasters.maxzoom,
          port: config.port,
          format: 'png',
          sources: rasters
        });
      } else {
        res.status(404);
        res.end();
      }

    });

    app.get('/:source/:z/:x/:y.*', (req, res) => {
      const p = req.params;
      const format = req.params['0'];
      const tiles = config.sources[p.source].tiles;

      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'content-type');
      res.header('Access-Control-Allow-Methods', '*');
      res.setHeader('Cache-Control', 'public,max-age=3153660000');
      switch (format){
        case 'pbf':
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
        case 'png':
          res.header('Content-Type','image/png');
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
