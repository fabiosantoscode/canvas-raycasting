'use strict'

window.addEventListener('load', () => {
  var myId = Math.random()

  var sock = new Promise(resolve => {
    var sock = new WebSocket('ws://' + location.host + '/')
    sock.addEventListener('open', () => { resolve(sock) })

    sock.addEventListener('message', (message) => {
      message = JSON.parse(message.data)
      // console.log(message)
      if (message.msgType === 'damage') {
        return process_damage(message)
      }
      process_update(message)
    })
  })

  function process_damage(message) {
    for (var i = 0; i < app.map.objs.length; i++) {
      if (message.id === app.map.objs[i].id) {
        app.map.objs.remove(app.map.objs[i])
        i--
      }
    }
    if (message.id === app.player.id) {
      app.respawn()
    }
  }

  function process_update(message) {
    if (message.id === app.player.id) {
      // It's me, I know
      return
    }
    var entity = app.map.objs.objs.find(o => o.id === message.id)
    if (!entity) {
      var Klass = message.type === 'grenade' ? Grenade : Player
      app.map.objs.objs.push((entity = Klass(0, 0, 'is-enemy=true')))
    }
    entity.load(message)
  }

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
    send(player.save())
  }
  window.sendShot = function (_grenade) {
    send(_grenade.save())
  }
  window.sendDamage = function(id) {
    send({ id: id, msgType: 'damage' })
  }

  function send(msg) {
    sock.then(sock => { sock.send(JSON.stringify(msg)) }).catch(e => { console.error(e) })
  }
})
