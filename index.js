'use strict'

var ecstatic = require('ecstatic')
var events = require('events')
var http = require('http')
var ws = require('ws')

var server = http.createServer(ecstatic({ root: __dirname }))

var events = new events.EventEmitter
var wss = new ws.Server({ server: server })

wss.on('connection', ws => {
  ws.on('message', (message) => { events.emit('move', message) })
  events.on('move', (moveData) => { ws.send(moveData, () => {}) })
})

server.listen(8080).on('listening', function () {
  console.log('server listening on port 8080')
})

