'use strict'

window.addEventListener('load', () => {
  var sock = new WebSocket('ws://' + location.host + '/')

  var myId = Math.random()

  sock.addEventListener('message', (message) => {
    console.log(message)
    var data = JSON.parse(message.data)
    if (data.id === app.player.id) {
      // It's me, I know
      return
    }
    var entity = app.map.objs.objs.find(o => o.id === data.id)
    if (!entity) {
      app.map.objs.objs.push((entity = Player(0, 0, 'is-enemy=true')))
    }
    entity.load(data)
  })

  var _lastSend = Date.now()
  var _timeout = null
  var player = null
  window.sendMove = function sendMove(_player) {
    player = player || _player
    if (Date.now() - _lastSend < 800) {
      clearTimeout(_timeout)
      _timeout = setTimeout(sendMove, 800 - (Date.now() - _lastSend))
      return
    }
    _lastSend = Date.now()
    sock.send(JSON.stringify(player.save()))
  }
})
