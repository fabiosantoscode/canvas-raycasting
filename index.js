'use strict'

var WebSocketServer = require('ws').Server

var wss = new WebSocketServer({ port: 3003 })

var events = new (require('events').EventEmitter)

wss.on('connection', ws => {
  ws.on('message', (message) => { events.emit('move', message) })
  events.on('move', (moveData) => { ws.send(moveData, () => {}) })
})

