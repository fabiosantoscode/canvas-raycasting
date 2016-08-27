'use strict'

var ecstatic = require('ecstatic')
var events = require('events')
var http = require('http')
var url = require('url')
var ws = require('ws')

var botRoom = require('./bot-room')

var statics = ecstatic({ root: __dirname })
var server = http.createServer((req, res) => {
  var path = url.parse(req.url).pathname
  if (path === '/' || path.startsWith('/js') || path.startsWith('/img'))
    return statics(req, res)
})

var wss = new ws.Server({ server: server })

var MAX_PER_ROOM = 20

var MAX_IDLE_TIME = 30000

function autoDisconnect(ws, playerId) {
  var timeout = setTimeout(disconnect, MAX_IDLE_TIME)
  ws.on('message', function () {
    clearTimeout(timeout)
    timeout = setTimeout(disconnect, MAX_IDLE_TIME)
  })
  function disconnect() {
    console.log('client ' + playerId + ' is getting kicked for inactivity')
    ws.close()
  }
}

function room() {
  var roomEvents = new events.EventEmitter
  return botRoom({
    count: 0,
    add: function addToRoom(ws) {
      this.count++
      var playerId = Math.random()
      console.log('client ' + playerId + ' has connected')
      const onMove = (moveData) => { ws.send(moveData, () => {}) }
      const onMessage = (message) => { roomEvents.emit('move', message) }
      ws.on('message', onMessage)
      roomEvents.on('move', onMove)
      ws.on('error', (e) => { console.error(e) })
      ws.on('close', () => {
        this.count--
        console.log('client ' + playerId + ' has disconnected')
        if (this.count <= 0) {
          console.log('deleted room')
        }
        ws.removeListener('message', onMessage)
        roomEvents.removeListener('move', onMove)
      })
      autoDisconnect(ws, playerId)
    },
  }, roomEvents)
}

var rooms = (function push(arr, c) {
  if (!c) { return [] }
  return arr.concat([room()]).concat(push(arr, --c))
})([], 100)

const autoBalanceAll = () => {
  rooms.forEach(room => { room.autoBalanceBotCount() })
}
setInterval(autoBalanceAll, 10000);

setInterval(() => {
  for (var i = 0; i < rooms.length; i++) {
    rooms[i].updateBots(1/12)
  }
}, 1000 / 12)

wss.on('connection', ws => {
  for (var i = 0; i < rooms.length; i++) {
    if (rooms[i].count < MAX_PER_ROOM) {
      console.log('created new room')
      rooms[i].add(ws)
      return
    }
  }
})

var port = +process.env['PORT'] || 3000
server.listen(port).on('listening', function () {
  console.log('server listening on port ' + port)
})

