var events = require('events')
var util = require('util')

var _ = require('lodash')
var moment = require('moment')

var log = require('../../log')

/**
 * API for listening to task document changes
 */

exports.TasksAPI = function (hoodie, options) {
  var task_events = new events.EventEmitter()

  var task = {}

  task.on = function () {
    return task_events.on.apply(task_events, arguments)
  }

  task.emit = function () {
    return task_events.emit.apply(task_events, arguments)
  }

  task.addSource = options.addSource
  task.removeSource = options.removeSource

  task.success = function (dbname, task,/* optional */ callback) {
    callback = callback || function (err) {
      if (err) {
        log.error(
          'task.success() error: ' + util.inspect(task),
          err.stack || err
        )
      }
    }
    var updated_task = _.extend(task, {
      '$processedAt': moment().format(),
      '_deleted': true
    })
    var db = hoodie.database(dbname)
    return db.update(task.type, task.id, updated_task, callback)
  }

  task.error = function (dbname, task, err,/* optional */ callback) {
    callback = callback || function (err) {
      if (err) {
        log.error(
          'task.error() error: ' + util.inspect(task),
          err.stack || err
        )
      }
    }
    var updated_task = _.extend(task, {
      '$processedAt': moment().format(),
      '$error': err
    })
    var db = hoodie.database(dbname)
    return db.update(task.type, task.id, updated_task, callback)
  }

  return task
}
