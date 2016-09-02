
if (typeof window === 'undefined') {
  global.Textures = {
    textures: []
  }
  global.TYPE_PLAYER = 6
  global.TYPE_GRENADE = 7
  global.Common = require('./common').Common
  global.TAU = Math.PI * 2
  global.HALF_TAU = Math.PI
  global.QUARTER_TAU = Math.PI / 2
  global.Grenade = require('./grenade')
}

var Player = function(x, y, isenemy) {
  var me = {
    t: TYPE_PLAYER,
    type: Player,
    id: (Math.random() * 1000000)|0,
    // position
    x : x+0.5,
    y : y+0.5, // center in the tile
    z : 0,
    angle: 0,
    // the rate at which X and Y are being changed this frame
    incr_x: 0,
    incr_y: 0,
    incr_z: 0,
    incr_angle: 0,

    speed: 1.5,
    rotspeed: 2,

    up : false,
    down : false,
    right : false,
    left : false,

    sprite : Textures.textures[0],
    radius : 1,

    own_grenade_x: 0,
    own_grenade_y: 0,

    fire_state: 'idle',
    fire_last: 0,
    fire_speed: 250,
    fire_cooldown: 1000,
  };
  me.sqRadius = me.radius * me.radius
  me.cubeRadius = me.radius * me.radius * me.radius

  me.init = function() {
    if (!isenemy) {
      document.addEventListener("keydown", me.key_down, false);
      document.addEventListener("keyup", me.key_up, false);
    }

    Object.seal(me)
  };

  var _saved = Object.seal({
    t: 0,
    id: 0,
    x: 0,
    y: 0,
    angle: 0,
    incr_x: 0,
    incr_y: 0,
    incr_angle: 0,
  })
  me.save = function (data) {
    _saved.id = me.id
    _saved.t = me.t
    _saved.x = Common.round2(me.x)
    _saved.y = Common.round2(me.y)
    _saved.angle = Common.round2(me.angle)
    _saved.incr_x = Common.round2(me.incr_x)
    _saved.incr_y = Common.round2(me.incr_y)
    _saved.incr_angle = Common.round2(me.incr_angle)
    return JSON.stringify(_saved)
  }

  me.load = function (data) {
    me.id = data.id
    me.t = data.t
    me.x = data.x
    me.y = data.y
    me.angle = data.angle
    me.incr_x = data.incr_x
    me.incr_y = data.incr_y
    me.incr_angle = data.incr_angle
  }

  me.update = function(map, dt) {

    me.x += me.incr_x
    me.y += me.incr_y
    me.angle += me.incr_angle
    me.angle %= Math.PI * 2
    if (me.angle < 0) {
      me.angle += Math.PI * 2
    }

    if (!isenemy) {
      me.update_human_player(map, dt)
    }

  };

  me.update_human_player = (map, dt) => {
    var joystickX = Math.min(Math.max(-1, joystick.deltaX() / 40), 1)
    var joystickY = Math.min(Math.max(-1, joystick.deltaY() / 40), 1)

    var rjoystickX = Math.min(Math.max(-1, rjoystick.deltaX() / 40), 1)

    var up = me.up || (joystickY < 0 && -joystickY)
    var down = me.down || (joystickY > 0 && joystickY)
    var sleft = me.sleft || (joystickX < 0 && -joystickX)
    var sright = me.sright || (joystickX > 0 && joystickX)
    var left = me.left || (rjoystickX < 0 && -rjoystickX)
    var right = me.right || (rjoystickX > 0 && rjoystickX)

    var prev_incr_x = me.incr_x
    var prev_incr_y = me.incr_y
    var prev_angle = me.angle
    me.insert_controls(map, dt, up, down, sleft, sright, left, right)

    me.update_fire_state(map)

    if (
      me.incr_x !== prev_incr_x || me.incr_y !== prev_incr_y ||
      me.angle !== prev_angle
    ) {
      me.send_move()
    }
  }

  me.update_fire_state = function (map) {
    if (me.fire_state === 'firing') {
      if (Date.now() - me.fire_last >= me.fire_speed) {
        me.fire_state = 'fired'
        var nade = Grenade(me.x, me.y, me)
        nade.z = 0.5
        var nade_x_minus_one_to_one = (me.own_grenade_x - 0.5) * 2
        var nade_angle = me.angle + (nade_x_minus_one_to_one * 0.66)
        nade.incr_x = Math.cos(nade_angle) * nade.speed
        nade.incr_y = Math.sin(nade_angle) * nade.speed
        nade.x += Math.cos(nade_angle) * .6
        nade.y += Math.sin(nade_angle) * .6
        nade.incr_x += me.incr_x
        nade.incr_y += me.incr_y
        nade.incr_z = me.own_grenade_y < 0.2 ? 0.2 :
          me.own_grenade_y > 0.7 ? 0.6 : 0.4
        nade.z = me.own_grenade_y < 0.2 ? 0.8 :
          me.own_grenade_y > 0.7 ? 0.3 : 0.5
        nade.incr_z *= nade.speed
        map.objs.objs.push(nade)
        me.send_shot(nade)
      }
    }

    if (me.fire_state === 'fired') {
      if (Date.now() - me.fire_last >= me.fire_cooldown) {
        me.fire_state = 'idle'
      }
    }
  }

  me.insert_controls = function (map, dt, up, down, sleft, sright, left, right) {
    var now_angle = Common.extrapolate_angle(me, 1)
    var change_x = Math.cos(now_angle) * me.speed * dt;
    var change_y = Math.sin(now_angle) * me.speed * dt;

    var change_sx = Math.cos(now_angle - QUARTER_TAU) * me.speed * dt;
    var change_sy = Math.sin(now_angle - QUARTER_TAU) * me.speed * dt;
    me.incr_x = 0
    me.incr_y = 0

    if(up) {
      if(map.is_free(me.x + change_x, me.y)) {
        me.incr_x += change_x * up;
      }
      if(map.is_free(me.x, me.y + change_y)) {
        me.incr_y += change_y * up;
      }
    }

    if(down) {
      if(map.is_free(me.x - change_x, me.y)) {
        me.incr_x -= change_x * down;
      }
      if(map.is_free(me.x, me.y - change_y)) {
        me.incr_y -= change_y * down;
      }
    }

    if(sleft) {
      if(map.is_free(me.x + me.incr_x + change_sx * sleft, me.y + me.incr_y)) {
        me.incr_x += change_sx * sleft;
      }
      if(map.is_free(me.x + me.incr_x, me.y + me.incr_y + change_sy * sleft)) {
        me.incr_y += change_sy * sleft;
      }
    }

    if(sright) {
      if(map.is_free(me.x + me.incr_x - change_sx * sright, me.y + me.incr_y)) {
        me.incr_x -= change_sx * sright;
      }
      if(map.is_free(me.x + me.incr_x, me.y + me.incr_y - change_sy * sright)) {
        me.incr_y -= change_sy * sright;
      }
    }

    // If we're pressing to turn, don't smooth out curves. Turn sharply.
    me.incr_angle = 0

    if(left) {
      me.incr_angle -= me.rotspeed * dt * left
    }

    if(right) {
      me.incr_angle += me.rotspeed * dt * right
    }
  }

  me.fire_grenade = function (release_start) {
    me.fire_last = release_start
  }

  me.key_down = function(event) {
    // sleft
    if(event.keyCode == 37) {
      me.sleft = true;
    }
    // sright
    if(event.keyCode == 39) {
      me.sright = true;
    }
    // up
    if(event.keyCode == 38) {
      me.up = true;
    }
    // down
    if(event.keyCode == 40) {
      me.down = true;
    }
  };

  me.key_up = function(event) {
    // sleft
    if(event.keyCode == 37) {
      me.sleft = false;
    }
    // sright
    if(event.keyCode == 39) {
      me.sright = false;
    }
    // up
    if(event.keyCode == 38) {
      me.up = false;
    }
    // down
    if(event.keyCode == 40) {
      me.down = false;
    }
  };

  me.send_move = () => {
    window.sendMove()
  }
  me.send_shot = (nade) => {
    window.sendShot(nade)
  }
  me.send_damage = (ent) => {
    window.sendDamage(ent.id)
  }
  me.respawn = () => null
  me.get_target = undefined;  // allow Bot() to add this function

  me.init();

  return me;
};

if (typeof module !== 'undefined') module.exports = { Player }

