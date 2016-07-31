'use strict'

window.addEventListener('load', () => {
  var myId = Math.random()

  var sock = new Promise(resolve => {
    var sock = new WebSocket('ws://' + location.host + '/')
    sock.addEventListener('open', () => { resolve(sock) })

    sock.addEventListener('message', (message) => {
      // console.log(message)
      var data = JSON.parse(message.data)
      if (data.id === app.player.id) {
        // It's me, I know
        return
      }
      var entity = app.map.objs.objs.find(o => o.id === data.id)
      if (!entity) {
        var Klass = data.type === 'grenade' ? Grenade : Player
        app.map.objs.objs.push((entity = Klass(0, 0, 'is-enemy=true')))
      }
      entity.load(data)
    })
  })

  var _lastSend = Date.now()
  var _timeout = null
  var player = null
  window.sendMove = function sendMove(_player) {
    player = player || _player
    if (Date.now() - _lastSend < 800 && (player.incr_x || player.incr_y /* If I'm stopping, send this message */)) {
      clearTimeout(_timeout)
      _timeout = setTimeout(sendMove, 800 - (Date.now() - _lastSend))
      return
    }
    _lastSend = Date.now()
    sock.then(sock => { sock.send(JSON.stringify(player.save())) }).catch(e => console.error(e))
  }
  window.sendShot = function (_grenade) {
    sock.then(sock => { sock.send(JSON.stringify(_grenade.save())) }).catch(e => console.error(e))
  }
})
