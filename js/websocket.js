'use strict'

window.addEventListener('load', () => {
  var sock = new WebSocket('ws://' + location.hostname + ':3003/')

  var myId = Math.random()

  sock.addEventListener('message', (message) => {
    console.log(message)
    var data = JSON.parse(message.data)
    if (data.id === app.player.id) {
      // It's me, I know
      return
    }
    var player = app.map.objs.objs.find(o => o.id === data.id)
    if (!player) {
      app.map.objs.objs.push((player = Player(0, 0, 'is-enemy=true')))
    }
    player.load(data)
  })

  var _lastSend = new Date()
  var _timeout = null
  var player = null
  window.sendMove = function sendMove(_player) {
    player = player || _player
    if (new Date() - _lastSend < 800) {
      clearTimeout(_timeout)
      _timeout = setTimeout(sendMove, 800 - (new Date() - _lastSend))
      return
    }
    _lastSend = +new Date()
    sock.send(JSON.stringify(player.save()))
  }
})
