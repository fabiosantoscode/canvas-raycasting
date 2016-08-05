'use strict'

;(function () {
  var myId = Math.random()

  var sock_ready = false
  var sock_instance
  var sock_queue = []
  var sock = (fn) => {
    if (sock_ready) {
      return fn(sock_instance)
    }
    sock_queue.push(fn)
  }

  window.addEventListener('load', connect)

  function connect() {
    if (sock_instance != null) {
      // already connecting
      return
    }
    const host = window.IS_CORDOVA ? '139.59.189.9' : location.host
    sock_instance = new WebSocket('ws://' + host + '/')
    sock_instance.addEventListener('open', () => {
      console.log('connected')
      sock_ready = true
      while(sock_queue.length) sock_queue.pop()(sock_instance)
    })

    sock_instance.addEventListener('message', (message) => {
      message = JSON.parse(message.data)
      // console.log(message)
      if (message.msgType === 'damage') {
        return process_damage(message)
      }
      process_update(message)
    })

    sock_instance.addEventListener('error', e => {
      console.error(e)
      sock_instance.close()
      reconnect()
    })

    sock_instance.addEventListener('close', _ => {
      console.log('disconnected')
      reconnect()
    })
  }

  function reconnect() {
    sock_instance = null
    setTimeout(() => { connect() }, 1000)
  }

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
    if (!window.app) { return }
    if (message.id === app.player.id) {
      // It's me, I know
      return
    }
    var entity
    for (var i = 0; i < app.map.objs.objs.length; i++) {
      if (app.map.objs.objs[i].id === message.id) {
        entity = app.map.objs.objs[i]
        break
      }
    }
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
    sock(sock => { sock.send(JSON.stringify(msg)) })
  }
}())
