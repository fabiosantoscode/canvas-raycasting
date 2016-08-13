var Map = require('./js/map')
var Bot = require('./bot')
var Common = require('./js/common').Common

module.exports = function botRoom(room, roomEvents) {
  roomEvents.on('move', (msg) => {
    if (msg.indexOf('\"damage\"') !== -1) {
      msg = JSON.parse(msg)
      for (var i = 0; i < bots.length; i++) {
        if (msg.id === bots[i].id) {
          bots[i].respawn(map)
        }
      }
    }
  })
  room.botCount = 0
  var map = Map()
  var bots = []
  room.addBot = function addBot() {
    var bot = Bot(map, roomEvents)
    bots.push(bot)
    bot.respawn(map)
    room.botCount++
  }
  room.removeBot = function removeBot() {
    bots.pop()
    room.botCount--
  }
  room.updateBots = function updateBots(dt) {
    for (var i = 0; i < bots.length; i++) {
      bots[i].update(map, dt)
    }
  }
  room.autoBalanceBotCount = function autoBalanceBotCount () {
    if (!room.count) {
      // No players, don't care
      while (room.botCount) { room.removeBot() }
      return
    }
    while (room.count + room.botCount < 6) {
      room.addBot()
    }
    while (room.count + room.botCount > 10) {
      room.removeBot()
    }
  }
  return room
}
