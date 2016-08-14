
var Explosion = function (x, y, z) {
  var me = {
    x: x,
    y: y,
    z: z,
    type: Explosion,
    incr_x: 0,
    incr_y: 0,
    incr_z: 0,
    speed: 0.3,
    weight: 0.3,
    bounciness: 0.5,
    z_air_resistance: 0.1,
    time_left: 3,
    sprite: Textures.textures[4],
    radius: 0.7,
    time_left: 1,
    animation_start: typeof window !== 'undefined' && app.latest_animation_timestamp,
    first_update: true,
  }

  me.sqRadius = me.radius * me.radius
  me.cubeRadius = me.radius * me.radius * me.radius

  var blastRadius = 1.2
  var sqBlastRadius = Math.pow(blastRadius, 2)

  me.update = (map, dt) => {
    me.time_left -= dt
    if (me.time_left <= 0) {
      app.map.objs.remove(me)
    }
  }

  return me
}

var Grenade = function(x, y, owner) {
  if (!(owner && owner.x)) { owner = undefined }
  var me = {
    id: 'grenade-' + ((Math.random()*1000000)|0),
    type: Grenade,
    x: x,
    y: y,
    z: 1,
    dead: false,
    incr_x: 0,
    incr_y: 0,
    incr_z: 0,
    speed: 0.3,
    weight: 0.3,
    bounciness: 0.5,
    wall_bounciness: 0.3,
    z_air_resistance: 0.1,
    ceiling_bounciness: 0.8,
    time_left: 3,
    sprite: Textures.textures[3],
    radius: 0.3,
    owner_id: owner && owner.id,
    owner,
  }

  me.sqRadius = me.radius * me.radius;
  me.cubeRadius = me.radius * me.radius * me.radius;

  me.update = function (map, dt) {
    me.x += me.incr_x
    me.y += me.incr_y
    me.z += me.incr_z

    me.incr_z -= me.weight * dt

    me.incr_z *= 1 - (me.z_air_resistance * dt)

    me.collide(map)

    me.time_left -= dt
    if (me.time_left <= 0) {
      return me.explode(map)
    }

    var n = 0;
    var sprite;
    while ((sprite = map.contains_sprite(Math.floor(me.x), Math.floor(me.y), n++, me))) {
      if (me.should_explode_on(sprite) && Common.collidingWith3d(me, sprite)) {
        if (owner) {
          owner.send_damage(sprite)
        }
        return me.explode(map)
      }
    }
    if (typeof window !== 'undefined') {
      if (me.should_explode_on(app.player) && Common.collidingWith3d(me, app.player)) {
        if (owner) {
          owner.send_damage(app.player)
        }
        app.respawn()
        return me.explode(map)
      }
    }
  }

  me.set_app = (_app) => { app = _app }

  me.should_explode_on = (ent) => ent !== owner

  me.collide = function (map) {
    if (me.z <= 0) {
      me.z = -me.z / 2
      me.incr_z = -me.incr_z * me.bounciness
      if (me.incr_z < 0.05) {
        me.incr_z = 0
      }
    }
    if (me.z > 1) {
      me.z -= me.z - 1
      me.incr_z = -me.incr_z * me.ceiling_bounciness
    }
    if (!map.is_free(Math.floor(me.x), Math.floor(me.y))) {
      // bounce back
      var bounce_back_x = Math.floor(me.x - me.incr_x) !== Math.floor(me.x)
      var bounce_back_y = Math.floor(me.y - me.incr_y) !== Math.floor(me.y)
      if (bounce_back_x && bounce_back_y) {
        if (!map.is_free(Math.floor(me.x - me.incr_x), me.y)) {
          bounce_back_x = false
        } else if (!map.is_free(Math.floor(me.x), Math.floor(me.y - me.incr_y))) {
          bounce_back_y = false
        }
      }
      if (bounce_back_x) {
        me.x -= me.incr_x
        me.incr_x = -me.incr_x * me.wall_bounciness
      }
      if (bounce_back_y) {
        me.y -= me.incr_y
        me.incr_y = -me.incr_y * me.wall_bounciness
      }
    }
  }

  me.explode = function (map) {
    if (typeof window !== 'undefined') {
      map.objs.objs.push(Explosion(me.x, me.y, me.z, me))
      app.add_explosion(map.objs.objs[map.objs.objs.length - 1])
    }
    map.objs.remove(me)
    me.dead = true
  }

  var _saved = Object.seal({
    t: TYPE_GRENADE,
    id: 0,
    x: 0,
    y: 0,
    z: 0,
    incr_x: 0,
    incr_y: 0,
    owner_id: 0,
  })
  me.save = function (data) {
    _saved.t = TYPE_GRENADE
    _saved.id = me.id
    _saved.x = Common.round2(me.x)
    _saved.y = Common.round2(me.y)
    _saved.z = Common.round2(me.z)
    _saved.incr_x = Common.round2(me.incr_x)
    _saved.incr_y = Common.round2(me.incr_y)
    _saved.owner_id = me.owner_id
    return JSON.stringify(_saved)
  }

  me.load = function (data) {
    for (var key in data) if (key !== 'sprite' && key !== 't') {
      me[key] = data[key]
    }
  }

  return me
}

if (typeof module !== 'undefined') {
  module.exports = Grenade
}
