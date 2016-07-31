'use strict'

var ecstatic = require('ecstatic')
var events = require('events')
var http = require('http')
var url = require('url')
var ws = require('ws')

var statics = ecstatic({ root: __dirname })
var server = http.createServer((req, res) => {
  var path = url.parse(req.url).path
  if (path === '/' || path.startsWith('/js') || path.startsWith('/img'))
    return statics(req, res)
})

var events = new events.EventEmitter
var wss = new ws.Server({ server: server })

wss.on('connection', ws => {
  ws.on('message', (message) => { events.emit('move', message) })
  events.on('move', (moveData) => { ws.send(moveData, () => {}) })
})

var port = +process.env['PORT'] || 8080
server.listen(port, '0.0.0.0').on('listening', function () {
  console.log('server listening on port ' + port)
})

