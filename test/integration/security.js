var path = require('path')
var url = require('url')

var async = require('async')
var request = require('request')
var rimraf = require('rimraf')
var tap = require('tap')
var test = tap.test

var app = require('../../lib/index')
var credentials = require('../../lib/database/utils').credentials
var config = require('../../lib/config')

var startServerTest = require('./lib/start-server-test')

startServerTest(test, 'block _all_dbs', function (t, env_config, end) {
  t.test('should 404 on /_api/_all_dbs', function (tt) {
    request.get(env_config.www_link + '/_api/_all_dbs', function (error, res) {
      tt.error(error)
      tt.is(res.statusCode, 404)
      tt.end()
    })
  })

  t.test('should log into admin', function (tt) {
    request.post(env_config.www_link + '/_api/_session', {
      form: {
        name: 'admin',
        password: env_config.admin_password
      }
    }, function (error, res, data) {
      tt.error(error)
      tt.is(res.statusCode, 200)
      tt.end()
    })
  })

  t.test('check config dbs are private to admin', function (tt) {
    var projectDir = path.resolve(__dirname, './lib/fixtures/project1')
    var cfg = config({
      cwd: projectDir,
      argv: {
        'in-memory': true
      }
    })

    cfg.admin_password = 'testing'
    async.waterfall([
      async.apply(rimraf, cfg.hoodie.data_path),
      async.apply(app.init, cfg),
      function (server, env_cfg, cb) {
        server.start(cb)
      },
      function (cb) {
        request.get(cfg.couch.url + '/app/_all_docs', function (error, res) {
          tt.error(error)
          tt.is(res.statusCode, 401)
          cb()
        })
      },
      function (cb) {
        request.get(cfg.couch.url + '/plugins/_all_docs', function (error, res) {
          tt.error(error)
          tt.is(res.statusCode, 401)
          cb()
        })
      },
      function (cb) {
        var appdb = cfg.couch.url + '/app/_all_docs'
        var couchdb = credentials.get(cfg.hoodie.data_path)

        var parsed = url.parse(appdb)
        parsed.auth = couchdb.username + ':' + couchdb.password
        appdb = url.format(parsed)

        request.get(appdb, function (error, res) {
          tt.error(error)
          tt.is(res.statusCode, 200)
          cb()
        })
      },
      function (cb) {
        var plugindb = cfg.couch.url + '/plugins/_all_docs'
        var couchdb = credentials.get(cfg.hoodie.data_path)

        var parsed = url.parse(plugindb)
        parsed.auth = couchdb.username + ':' + couchdb.password
        plugindb = url.format(parsed)
        request.get(plugindb, function (error, res) {
          tt.error(error)
          tt.is(res.statusCode, 200)
          cb()
        })
      }
    ], function (error) {
      tt.error(error)
      tt.end()
    })
  })
  t.test('teardown', end)
})
