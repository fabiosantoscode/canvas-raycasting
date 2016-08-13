var Pathfind = require('./pathfind')
var Player = require('./js/player').Player

var lastBotId = -1

var dot = ((x1, y1, x2, y2) =>
  (x1 * x2) + (y1 * y2)
)

var Bot = module.exports = function (map, roomEvents) {
  var me = Player(10, 10, true)
  me.id = -Math.round(Math.random() * 1000)
  me.t = 8

  var my_grenades = []

  var TPS = 2
  var TPSth = 1 / TPS
  var time = Math.random() * TPSth
  var target = Object.seal({  })
  var _update = me.update
  me.update = function (map, dt) {
    _update.apply(this, arguments)

    for (var i = 0; i < my_grenades.length; i++) {
      if (my_grenades[i].dead) {
        my_grenades.splice(i, 1)
        i--
        continue
      }
      my_grenades[i].update(map, dt)
    }

    time += dt

    if (time < TPSth) {
      walk(map, dt)
      return
    }

    time %= TPSth

    think(map)
    me.update_fire_state(map)
    walk(map, dt)
  }

  me.get_target = () => [ target_x, target_y ]

  var enemy = null
  var path = []
  var state = 'wander'
  var target_x, target_y

  var think_id = 0
  var last_enemy_x = -1
  var last_enemy_y = -1
  var follow_start = 0
  var enemy_distance = 0
  var think = function (map) {
    if (Math.random() < 0.1) { unstuck() }
    if (state === 'wander') {
      if (Math.random() < 0.1) {
        look(map)
        if (enemy) {
          state = 'follow'
          follow_start = Date.now()
          return think(map)
        }
      }
      if (!path.length) { new_path() }
    } else if (state === 'follow') {
      if (Math.random() < 0.2) {
        enemy_distance = Common.sqDistance(enemy, me.x, me.y)
        if (enemy_distance > 4 || Date.now() - follow_start > 5000) {
          enemy = null
          state = 'wander'
          return think(map)
        }
        if (enemy_distance < 2 && Math.random() > 0.5) {
          // run away
          new_path()
        }
      }
    }
  }

  var last_stuck_x = -1
  var last_stuck_y = -1
  var unstuck = function() {
    var x = me.x|0
    var y = me.y|0
    if (last_stuck_x !== x || last_stuck_y !== y) {
      last_stuck_y = y
      last_stuck_x = x
      return
    }
    if (map.is_free(x+1,y)) { me.x+=0.3 }
    if (map.is_free(x-1,y)) { me.x-=0.3 }
    if (map.is_free(x,y+1)) { me.y+=0.3 }
    if (map.is_free(x,y-1)) { me.y-=0.3 }
    new_path()
  }

  var look = function (map) {
    var my_x = me.x | 0
    var my_y = me.y | 0
    for (var i = 0; i < map.objs.objs.length; i++) {
      if (Math.random() > 0.4 && Common.sqDistance(map.objs.objs[i], me.x, me.y) < 3) {
        return enemy = map.objs.objs[i]
      }
    }
  }

  var map_as_pathfind = map.data.reduce((array_2d, item, i) => {
    if (i % map.width === 0) {
      array_2d = array_2d.concat([[]])
    }
    var last = array_2d[array_2d.length - 1]
    last.push(item === -1 ? 0 : 1)
    return array_2d
  }, [])
  var possible_targets = map.data.map((spot, i, all) => {
    var x = i % map.width
    var y = Math.floor(i / map.width)

    if (spot === -1 && all[i+1] === -1 && all[i+map.width] === -1 && all[i+map.width+1] === -1) {
      // 4*4 spot
      return [ x, y ]
    }
  }).filter(Boolean)
  var new_path = function (random) {
    if (random !== false) {
      [ target_x, target_y ] = possible_targets[Math.floor(Math.random() * possible_targets.length)]
    }
    path = (Pathfind(
      [ me.x|0, me.y|0 ],
      [ target_x, target_y ],
      map_as_pathfind
    )||[]).map(([x,y]) => [y,x])
  }

  var in_path = () => path[0] && (path[0][0] === (me.x|0) && path[0][1] === (me.y|0))
  var walk = function (map, dt) {
    var
      up = 0,
      down = 0,
      sleft = 0,
      sright = 0,
      left = 0,
      right = 0

    while (path.length && (in_path() || !map.is_free(path[0][0], path[0][1]))) {
      path = path.slice(1)
      if (!path.length) {
        new_path()
      }
    }

    if (state === 'wander') {
      [ target_x, target_y ] = path[0]||[]
      target_x+=0.5
      target_y+=0.5
    }

    if (state === 'follow') {
      target_x = enemy.x | 0
      target_y = enemy.y | 0
    }

    if (target_y !== undefined && target_x !== undefined) {
      var target_dx = target_x - me.x
      var target_dy = target_y - me.y

      var len = Math.sqrt(
        (target_dx * target_dx) +
        (target_dy * target_dy)
      )

      //target_dx /= len
      //target_dy /= len

      var dot_product = dot(
        target_dx,
        target_dy,
        Common.extrapolate_dx(me, 0),
        Common.extrapolate_dy(me, 0)
      )

      if (dot_product > 0.4) {
        up = dot_product
      }
      if (dot_product < -0.5) {
        down = -dot_product
      }
      if (state === 'follow') {
        if (dot_product > 0.4) {
          me.own_grenade_y = Math.random()
          me.own_grenade_x = Math.random()
          me.fire_state = 'firing'
          me.fire_grenade(Date.now())
        }
      }

      var do_turn_right = dot(
        target_dx, target_dy,
        Math.cos(me.angle + 0.1), Math.sin(me.angle + 0.1)
      ) - dot(
        target_dx, target_dy,
        Math.cos(me.angle - 0.1), Math.sin(me.angle - 0.1)
      )

      /*
      if (state === 'follow') {
        do_turn_right = -do_turn_right
      }
      */

      if (len > 0.1) {
        if (do_turn_right > 0) {
          right = Math.min(1, do_turn_right * 10)
        } else {
          left = Math.min(1, -do_turn_right * 10)
        }
      }
    }

    me.insert_controls(map, dt, up, down, sleft, sright, left, right)

    talk()
  }

  var last_sent = -1
  var last_incr_x = -1
  var last_incr_y = -1
  var last_block_x = -1
  var last_block_y = -1
  var last_incr_angle = -1
  function talk() {
    if (Date.now() - last_sent > 500 &&
      (
        Math.abs(last_incr_x - me.incr_x) > 0.1 ||
        Math.abs(last_incr_y - me.incr_y) > 0.1 ||
        last_block_x != me.x|0 ||
        last_block_y != me.y|0 ||
        Math.abs(last_incr_angle - me.incr_angle) > 0.1
      )
    ) {
      last_incr_x = me.incr_x
      last_incr_y = me.incr_y
      last_block_x = me.x|0
      last_block_y = me.y|0
      last_incr_angle = me.incr_angle
      me.send_move()
    }
  }
  me.send_move = () => {
    roomEvents.emit('move', me.save())
  }
  me.send_shot = (nade) => {
    my_grenades.push(nade)
    roomEvents.emit('move', nade.save())
  }
  me.send_damage = (ent) => {
    roomEvents.emit('move', JSON.stringify({msgType:'damage',id:ent.id}))
  }

  me.respawn = (map) => {
    if (map.objs.objs.indexOf(me) === -1) { map.objs.objs.push(me) }
    Common.random_spawn(me, map)
    me.send_move()
  }

  return me
}

