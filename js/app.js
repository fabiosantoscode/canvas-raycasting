'use strict'

var TAU = Math.PI * 2
var HALF_TAU = Math.PI
var QUARTER_TAU = Math.PI / 2

var Textures = (function() {
  var ver = 1, // increase this for refreshing the cache
    i,
    files = [
      {
        src: 'img/bot.png',
        ingame_height: 1,
        ingame_width: 1,
        ingame_displacement_x: 0,
        ingame_displacement_y: .5,
      },
      {
        src: 'img/room.png',
      },
      {
        src: 'img/wall.jpg',
        flipped: true,
      },
      {
        src: 'img/nade.png',
        ingame_height: .25,
        ingame_width: .25,
        ingame_displacement_x: 0,
        ingame_displacement_y: .5,
        onscreen_width: .20,
        animation: {
          fps: 16,
          frames: [ 'img/nade.png', 'img/nade-1.png' ],
          loop: true,
        }
      },
      {
        src: 'img/explosion-1.png',
        ingame_height: 1.2,
        ingame_width: 1.2,
        ingame_displacement_x: 0,
        ingame_displacement_y: .5,
        animation: {
          fps: 8,
          frames: [ 1, 2, 3, 4 ].map(n => 'img/explosion-'+n+'.png'),
          linger: true,
        }
      },
      {
        src: 'img/racket.png',
        onscreen_width: .50,
        ingame_displacement_y: .26,
        animation: {
          fps: 8,
          frames: [ 1, 2, 3 ].map(n => 'img/racket-'+n+'.png'),
          loop: false,
        }
      },
    ];

  var me = {
    textures: [],
    get_animation_frame: function (texture, ms) {
      var frameIdx = Math.floor((ms * 0.001) * texture.animation.fps)
      if (
        texture.animation.linger &&
        frameIdx >= texture.animation.frames.length
      ) { frameIdx = texture.animation.frames.length - 1 }
      if (texture.animation.loop) {
        frameIdx %= texture.animation.frames.length
      }
      return texture.animation.frames[frameIdx]
    }
  }

  for(i=0; i<files.length; i++) {
    me.textures[i] = new Image();
    me.textures[i].src = files[i].src + "?" + ver;
    if (files[i].animation) {
      me.textures[i].animation = files[i].animation
      for (var k = 0; k < files[i].animation.frames.length; k++) {
        var img = new Image()
        img.src = files[i].animation.frames[k]
        me.textures[i].animation.frames[k] = img
      }
    }
  }

  me.init = () => {
    me.textures.forEach((texture, i) => {
      me.textures[i].style.imageRendering = '-moz-crisp-edges';
      me.textures[i].style.imageRendering = 'pixelated';
      me.textures[i].ingame_height = files[i].ingame_height
      me.textures[i].ingame_width = files[i].ingame_width
      me.textures[i].ingame_displacement_x = files[i].ingame_displacement_x
      me.textures[i].ingame_displacement_y = files[i].ingame_displacement_y
      me.textures[i].onscreen_width = files[i].onscreen_width
      me.textures[i].onscreen_height = files[i].onscreen_height
      me.textures[i].index = i
      if (files[i].flipped) {
        var flipped = document.createElement('canvas')
        var fCtx = flipped.getContext('2d')
        fCtx.scale(-1, 1)
        fCtx.drawImage(me.textures[i], -me.textures[i].width, 0)
        me.textures[i].flipped = flipped
      }
    })
  }

  return me
})();

var Player = function(x, y, isenemy) {
  var me = {
    id: Math.random(),
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

    speed: 2,
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

		// precalculate these
    if (!isenemy) {
      document.addEventListener("keydown", me.key_down, false);
      document.addEventListener("keyup", me.key_up, false);
    }

    Object.seal(me)
	};

  me.load = function (data) {
    for (var key in data) if (key !== 'sprite') {
      me[key] = data[key]
    }
  }

  var _saved = Object.seal({
    id: 0,
    x: 0,
    y: 0,
    angle: 0,
    incr_x: 0,
    incr_y: 0,
    incr_angle: 0,
  })
  const round2 = n => Math.round(n * 100) / 100
  me.save = function (data) {
    _saved.id = me.id
    _saved.x = round2(me.x)
    _saved.y = round2(me.y)
    _saved.angle = round2(me.angle)
    _saved.incr_x = round2(me.incr_x)
    _saved.incr_y = round2(me.incr_y)
    _saved.incr_angle = round2(me.incr_angle)
    return _saved
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
    var prev_incr_x = me.incr_x
    var prev_incr_y = me.incr_y
    var prev_angle = me.angle
    var change_x = Common.extrapolate_dx(me, 1) * me.speed * dt;
    var change_y = Common.extrapolate_dy(me, 1) * me.speed * dt;

    var joystickX = Math.min(Math.max(-1, joystick.deltaX() / 80), 1)
    var joystickY = Math.min(Math.max(-1, joystick.deltaY() / 80), 1)

    var up = me.up || (joystickY < 0 && -joystickY)
    var down = me.down || (joystickY > 0 && joystickY)
    var left = me.left || (joystickX < 0 && -joystickX)
    var right = me.right || (joystickX > 0 && joystickX)

    me.incr_x = 0
    me.incr_y = 0
    if(up) {
      if(map.is_free(Math.floor(me.x + change_x), Math.floor(me.y))) {
        me.incr_x += change_x * up;
      }
      if(map.is_free(Math.floor(me.x), Math.floor(me.y + change_y))) {
        me.incr_y += change_y * up;
      }
    }

    if(down) {
      if(map.is_free(Math.floor(me.x - change_x), Math.floor(me.y))) {
        me.incr_x -= change_x * down;
      }
      if(map.is_free(Math.floor(me.x), Math.floor(me.y - change_y))) {
        me.incr_y -= change_y * down;
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

    if (me.fire_state === 'firing') {
      if (Date.now() - me.fire_last >= me.fire_speed) {
        me.fire_state = 'fired'
        var nade = Grenade(me.x, me.y)
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
        app.map.objs.objs.push(nade)
      }
    }

    if (me.fire_state === 'fired') {
      if (Date.now() - me.fire_last >= me.fire_cooldown) {
        me.fire_state = 'idle'
      }
    }

    if (
      me.incr_x !== prev_incr_x || me.incr_y !== prev_incr_y ||
      me.angle !== prev_angle
    ) {
      window.sendMove(me)
    }
  }

  me.fire_grenade = function (release_start) {
    me.fire_last = release_start
  }

	me.key_down = function(event) {
		// left
		if(event.keyCode == 37) {
			me.left = true;
		}
    // right
    if(event.keyCode == 39) {
			me.right = true;
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
		// left
		if(event.keyCode == 37) {
			me.left = false;
		}
    // right
    if(event.keyCode == 39) {
			me.right = false;
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

	me.init();

	return me;
};

var Grenade = function(x, y, isenemy) {
  var me = {
    x: x,
    y: y,
    z: 1,
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
      return me.explode()
    }

    var n = 0;
    var sprite;
    while ((sprite = map.contains_sprite(Math.floor(me.x), Math.floor(me.y), n++, me))) {
      if (me.should_explode_on(sprite) && Common.collidingWith3d(me, sprite)) {
        return me.explode()
      }
    }
  }

  me.should_explode_on = () => true

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
        } else if (!map.is_free(me.x, Math.floor(me.y - me.incr_y))) {
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

  me.explode = function () {
    app.map.objs.objs.push(Explosion(me.x, me.y, me.z))
    app.add_explosion(app.map.objs.objs[app.map.objs.objs.length - 1])
    app.map.objs.remove(me)
  }

  return me
}

var Explosion = function (x, y, z) {
  var me = {
    x: x,
    y: y,
    z: z,
    incr_x: 0,
    incr_y: 0,
    incr_z: 0,
    speed: 0.3,
    weight: 0.3,
    bounciness: 0.5,
    z_air_resistance: 0.1,
    time_left: 3,
    sprite: Textures.textures[4],
    radius: 0.3,
    time_left: 1,
    animation_start: Date.now(),
  }

  me.sqRadius = me.radius * me.radius
  me.cubeRadius = me.radius * me.radius * me.radius

  me.update = (map, dt) => {
    me.time_left -= dt
    if (me.time_left <= 0) {
      app.map.objs.remove(me)
    }
  }

  return me
}

var Common = function () {
  var me = {}
  me.extrapolate_x = (me, dt) => me.x + (me.incr_x * dt)
  me.extrapolate_y = (me, dt) => me.y + (me.incr_y * dt)
  me.extrapolate_z = (me, dt) => me.z + (me.incr_z * dt)
  me.extrapolate_angle = (me, dt) => me.angle + (me.incr_angle * dt)
  me.extrapolate_dx = (me, dt, angle = Common.extrapolate_angle(me, dt)) => Math.cos(angle)
  me.extrapolate_dy = (me, dt, angle = Common.extrapolate_angle(me, dt)) => Math.sin(angle)
  me.extrapolate_cx = (me, dt, angle = Common.extrapolate_angle(me, dt)) => -Math.sin(angle) * 0.66
  me.extrapolate_cy = (me, dt, angle = Common.extrapolate_angle(me, dt)) => Math.cos(angle) * 0.66
	me.sqDistance = function(me, x, y) {
		return Math.pow(x-me.x, 2) + Math.pow(y-me.y, 2);
	};
	me.cubeDistance = function(me, x, y, z) {
		return Math.pow(x-me.x, 2) + Math.pow(y-me.y, 2) + Math.pow(z-me.z, 2);
	};
  me.collidingWith = (me, _with) => Common.sqDistance(me, _with.x, _with.y) < me.sqRadius + _with.sqRadius
  me.collidingWith3d = (me, _with) => Common.cubeDistance(me, _with.x, _with.y, _with.z) < me.cubeRadius + _with.cubeRadius
  Object.seal(me)
  return me
}();

var Obj = function(name, x, y, z, texture) {
	var me = {
		name : name,
		x : x,
		y : y,
    z : z,
		sprite : texture
	};

  me.update = () => null

	return me;
};

var Objects = function() {
	var me = {
		textures : [],
		objs : []
	};

	me.remove = function(object) {
    var idx = me.objs.indexOf(object)
    if (idx === -1) {
      throw new Error('could not find object to remove')
    }
    delete me.objs[idx]
    for (var i = idx + 1; i < me.objs.length; i++) me.objs[i - 1] = me.objs[i]
    me.objs.length--
    _sortedCacheKey = NaN
	};

  var _sortedCache = []
  var _sortedCacheAge = 0
  var _sortedCacheKey = -1
	me.sorted = function(x, y) {
    if (me.objs.length === _sortedCacheKey && _sortedCacheAge++ < 180) {
      return _sortedCache
    }
    while (_sortedCache.length < me.objs.length) {
      _sortedCache.push(Object.seal({ obj: me.objs[0], sqDist: Math.PI }));
    }
    if (_sortedCache.length > me.objs.length) {
      _sortedCache.length = me.objs.length
    }
    for (var i = 0; i < me.objs.length; i++) {
      _sortedCache[i].obj = me.objs[i]
      _sortedCache[i].sqDist = Common.sqDistance(me.objs[i], x, y)
    }
    if (_sortedCache.length) {
      _sortedCache.sort((a, b) => b.sqDist - a.sqDist);
    }
    _sortedCacheAge = 0
    _sortedCacheKey = _sortedCache.length
    return _sortedCache
	};

	me.get_texture = function(idx) {
		return me.textures[idx];
	};

	me.init();

  me.objs.push(Player(5, 1, 'isenemy'))

  var tempData = {"id":0.5219182117326571,"x":5.034241173117036,"y":1.6772855328758354,"incr_x":0.01,"incr_y":0.01,"speed":2,"rotspeed":0.1,"up":false,"down":false,"right":false,"left":false}

  for (var k in tempData) if (tempData.hasOwnProperty(k)) {
    me.objs[me.objs.length - 1][k] = tempData[k]
  }

	return me;
};

var Map = function() {
  var _ = -1
	var me = {
		UNUSED : -1,
		FREE : 0,
		BLOCK : 1,
		MOVEABLE : 2,

		name : 'Test Dungeon',
		data : [
         2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
				 2,_,_,_,_,_,_,_,2,2,2,_,_,_,2,_,_,_,_,2,
				 2,_,2,2,_,2,2,_,_,2,2,_,_,_,_,_,_,2,_,2,
				 2,_,2,2,_,2,2,_,_,_,_,_,2,2,_,2,_,_,_,2,
				 2,_,_,_,_,2,2,2,2,2,2,2,2,2,_,_,_,2,_,2,
				 2,2,_,2,2,2,2,2,2,2,2,2,2,2,2,2,2,_,_,2,
				 2,_,_,_,2,2,2,_,_,_,2,2,_,_,_,_,_,2,2,2,
				 2,_,_,_,2,2,2,_,_,_,_,_,_,2,_,2,_,2,2,2,
				 2,2,_,2,2,2,2,_,_,_,2,2,_,_,_,_,_,2,2,2,
				 2,2,_,_,2,2,2,2,_,2,2,2,_,2,_,2,_,2,2,2,
				 2,2,2,_,_,_,_,_,_,2,2,2,_,_,_,_,_,2,2,2,
				 2,2,2,_,_,_,2,2,2,2,2,2,2,2,_,2,2,2,2,2,
				 2,2,2,2,_,2,2,2,2,2,2,2,2,_,_,_,_,2,2,2,
				 2,_,_,_,_,2,2,2,2,2,2,2,2,_,_,_,_,2,2,2,
				 2,_,_,2,2,2,2,2,2,2,2,2,2,_,_,_,_,2,2,2,
				 2,2,_,2,2,_,_,2,2,2,2,2,2,2,_,_,2,2,2,2,
				 2,2,_,_,_,_,_,_,2,2,2,2,2,2,2,_,2,2,2,2,
				 2,2,2,2,2,_,_,_,_,2,2,2,_,_,_,_,_,_,_,2,
				 2,2,2,2,2,2,_,_,_,2,2,2,2,_,2,2,2,_,2,2,
				 2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2
			     ],
		// up to 33 x 23
		width : 20,
		height : 20,

		textures : [],
		bg : undefined,

		objs : Objects()
	};

	me.init = function() {
	};

	me.texture = function(idx) {
		return Textures.textures[idx];
	};

	me.get_texture = function(x, y) {
		return me.texture(me.data[y*me.width + x]);
	};

	me.is_free = function(x, y) {
		if(x<0 || x>=me.width || y<0 || y>=me.height) {
			return false;
		}
		return me.data[y*me.width + x] == -1;
	};

  me.contains_sprite = function (x, y, n, self) {
    n = n || 0
    self = self || NaN
    // temporary dumb function
    for (var i = 0; i < me.objs.objs.length; i++) {
      if (
        Math.floor(me.objs.objs[i].x) === x &&
        Math.floor(me.objs.objs[i].y) === y &&
        me.objs.objs[i] !== self
      ) {
        n--;
        if (n < 0) {
          return me.objs.objs[i];
        }
      }
    }
  }

	me.init();

	return me;
};

var Foreground = function(player, canvas_element) {
  var me = {}

  var widthOfTheJoystickContainer = 0.6
  var grenadeSprite = Textures.textures[3]
  var racketSprite = Textures.textures[5]

  document.documentElement.addEventListener('touchstart', onTouchStart)
  document.documentElement.addEventListener('mousedown', onTouchStart)
  document.documentElement.addEventListener('touchmove', onTouchMove)
  document.documentElement.addEventListener('mousemove', onTouchMove)
  document.documentElement.addEventListener('touchend', onTouchEnd)
  document.documentElement.addEventListener('mouseup', onTouchEnd)

  var touchIdx = null
  var findTouch = (e) => {
    if (e.type[0] === 'm' /* mouse### event */) { return e }
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdx) {
        return e.changedTouches[i]
      }
    }
  }
  Object.defineProperty(window, 'touchIdx', { get: ()=> touchIdx})
  function onTouchStart (e) {
    var touch = e.type === 'touchstart' ? e.changedTouches[0] : e
    if (touchIdx !== null ||
        player.fire_state !== 'idle' ||
        touch.clientX < document.documentElement.clientWidth * widthOfTheJoystickContainer) {
      return
    }
    touchIdx = touch.identifier === undefined ? 'mouse' : touch.identifier
    player.fire_state = 'dragging'
    moveGrenade(touch)
    e.preventDefault()
  }

  function onTouchMove (e) {
    if (touchIdx === null || player.fire_state !== 'dragging') {
      return
    }
    var touch = findTouch(e)
    if (touch === undefined) { return }
    moveGrenade(touch)
  }

  function onTouchEnd (e) {
    if (touchIdx === null) {
      return
    }

    var touch = findTouch(e)
    if (touch === undefined) { return }

    releaseGrenade()

    touchIdx = null
  }

  function moveGrenade (touch) {
    player.fire_state = 'dragging'
    player.own_grenade_x = ((touch.clientX) - canvas_element.offsetLeft) /
      canvas_element.offsetWidth
    player.own_grenade_y = ((touch.clientY) - canvas_element.offsetTop) /
      canvas_element.offsetHeight
  }

  var release_start = null
  function releaseGrenade () {
    player.fire_state = 'firing'
    release_start = Date.now()
    artificial_fall = -4
    artificial_fall_speed = -17
    player.fire_grenade(release_start)
  }

  var still_animating_racket = false
  var artificial_fall_speed = 0
  var artificial_fall = 0

  me.draw = function (ctx, dt) {
    var grenade_x = player.own_grenade_x * canvas_element.width
    var grenade_y = player.own_grenade_y * canvas_element.height
    if (player.fire_state === 'idle' || player.fire_state === 'dragging') {
      var size = app._width * grenadeSprite.onscreen_width
      var halfSize = size >> 1
      var x = player.fire_state === 'dragging' ? grenade_x - halfSize : canvas_element.width - size
      var y = player.fire_state === 'dragging' ? grenade_y - halfSize : canvas_element.height - size
      ctx.drawImage(grenadeSprite,
                    0, 0,
                    grenadeSprite.width, grenadeSprite.height,
                    x, y,
                    size, size)
    }

    if (player.fire_state === 'firing' || still_animating_racket) {
      var size = app._width * grenadeSprite.onscreen_width
      var halfSize = size >> 1
      if (player.fire_state === 'firing') {
        artificial_fall_speed += 4 * dt
        artificial_fall = (artificial_fall + artificial_fall_speed) | 0
        var grenade_animated_sprite = Textures.get_animation_frame(grenadeSprite, Date.now() - release_start)
        ctx.drawImage(grenade_animated_sprite,
                      0, 0,
                      grenadeSprite.width, grenadeSprite.height,
                      grenade_x - halfSize, grenade_y - halfSize + artificial_fall,
                      size, size)
      }
      var size = app._width * racketSprite.onscreen_width
      var halfSize = size >> 1
      var y = grenade_y - halfSize + ( size * racketSprite.ingame_displacement_y )
      var animationFrame = Textures.get_animation_frame(racketSprite, Date.now() - release_start)
      if (animationFrame) {
        still_animating_racket = true
        ctx.drawImage(animationFrame,
                      0, 0,
                      racketSprite.width, racketSprite.height,
                      grenade_x - halfSize, y|0,
                      size, size)
      } else {
        still_animating_racket = false
      }
    }
  };

  return me
}

var Application = function(canvasID) {
  var defaultWidth = 512
  var defaultHeight = 307
  var player = Player(1, 1)
  var canvas = document.getElementById(canvasID);
	var me = {
		canvas : canvas,
		ctx : canvas.getContext('2d'),

		map : Map(),
		player : player,
    foreground: Foreground(player, canvas),
    enemies: [],

		// canvas size
		width : 512 / 1,
		height : 307 / 1,

		// 3D scene size
		_width : 512 / 1,
		_height : 307 / 1,

		fps : 30,
		_time : Date.now(),
		_frames : 0,
    shadows: true,
    resolution: 1,
	};

	me.setup = function({ shadows, resolution } = {}) {
    if (shadows === undefined) shadows = me.shadows
    if (resolution === undefined) resolution = me.resolution

    me.shadows = shadows
    me.width = defaultWidth * resolution
    me.height = defaultHeight * resolution
    me._width = defaultWidth * resolution
    me._height = defaultHeight * resolution

    me.canvas.width = me._width;
    me.canvas.height = me._height;
    me.canvas.style.background = "rgb(0, 0, 0)";

    me.ctx.webkitImageSmoothingEnabled = me.ctx.imageSmoothingEnabled = me.ctx.mozImageSmoothingEnabled = me.ctx.oImageSmoothingEnabled = false;

    zBufferPassCacheKey = ''  // clear z-buffer cache
	};

  me.add_explosion = (ex) => {
    explosions.push(ex)
    ex._squareId = Math.floor(ex.y) * me.map.width + Math.floor(ex.x)
  }

	var zBuffer = []; // used for sprites (objects)
  var wallXBuffer = [];
  var normalBuffer = [];
  var textureBuffer = [];
  var mapSquareIDBuffer = [];
  var isFlippedBuffer = [];
  var explosions = [];
  var zBufferPassCacheKey = ''

  const mod = (a, n) => a - Math.floor(a/n) * n
  const angle_distance = (a, b) => Math.abs(Math.min(TAU - Math.abs(a - b), Math.abs(a - b)))
	me.draw = function(dt) {
		// floor / ceiling 
    me.ctx.drawImage(Textures.textures[1], 0, 0, me._width, me._height)

		var col
    var player_angle = Common.extrapolate_angle(me.player, dt)
    var player_x = Common.extrapolate_x(me.player, dt)
    var player_y = Common.extrapolate_y(me.player, dt)
    var player_dx = Common.extrapolate_dx(me.player, dt, player_angle)
    var player_dy = Common.extrapolate_dy(me.player, dt, player_angle)
    var player_cx = Common.extrapolate_cx(me.player, dt, player_angle)
    var player_cy = Common.extrapolate_cy(me.player, dt, player_angle)

    var Date_now = Date.now()

    var camera, ray_x, ray_y, ray_dx, ray_dy, mx, my, delta_x,
      delta_y, step_x, step_y, horiz, wall_dist, wall_height,
      wall_x, draw_start, tex;
    var wall_normal
    var originalXInc = 2
    var xInc = originalXInc
    var k = ''.concat(player_x,':',player_y,':',player_dx,':',player_dy,':',player_cx,':',player_cy)
    if (k !== zBufferPassCacheKey) {
      zBufferPassCacheKey = k
      for(col=0; col<me._width; col+=xInc) {
        camera = 2 * col / me._width - 1;
        ray_x = player_x;
        ray_y = player_y;
        mx = Math.floor(ray_x);
        my = Math.floor(ray_y);
        ray_dx = player_dx + player_cx*camera;
        ray_dy = player_dy + player_cy*camera;
        delta_x = Math.sqrt(1 + (ray_dy * ray_dy) / (ray_dx*ray_dx));
        delta_y = Math.sqrt(1 + (ray_dx * ray_dx) / (ray_dy*ray_dy));

        // initial step for the ray
        if(ray_dx < 0) {
          step_x = -1;
          var dist_x = (ray_x - mx) * delta_x;
        } else {
          step_x = 1;
          var dist_x = (mx + 1 - ray_x) * delta_x;
        }
        if(ray_dy < 0) {
          step_y = -1;
          var dist_y = (ray_y - my) * delta_y;
        } else {
          step_y = 1;
          var dist_y = (my + 1 - ray_y) * delta_y;
        }

        // DDA
        while(true) {
          if(dist_x < dist_y) {
            dist_x += delta_x;
            mx += step_x;
            horiz = true;
            wall_normal = step_x > 0 ? HALF_TAU : 0
          } else {
            dist_y += delta_y;
            my += step_y;
            horiz = false;
            wall_normal = step_y > 0 ? (QUARTER_TAU * 3) : QUARTER_TAU
          }

          if(!me.map.is_free(mx, my)) {
            break;
          }
        }

        // wall distance
        if(horiz) {
          wall_dist = (mx - ray_x + (1 - step_x) * 0.5) / ray_dx;
          wall_x = ray_y + ((mx - ray_x + (1 - step_x) * 0.5) / ray_dx) * ray_dy;
        } else {
          wall_dist = (my - ray_y + (1 - step_y) * 0.5) / ray_dy;
          wall_x = ray_x + ((my - ray_y + (1 - step_y) * 0.5) / ray_dy) * ray_dx;
        }
        wall_x -= Math.floor(wall_x);

        if(wall_dist < 0) {
          wall_dist = -wall_dist;
        }

        tex = me.map.get_texture(mx, my);

        wall_x = Math.floor(wall_x * tex.width);

        isFlippedBuffer[col] = false
        if(horiz && ray_dx > 0) {
          isFlippedBuffer[col] = true
        }
        if(!horiz && ray_dy < 0) {
          isFlippedBuffer[col] = true
        }

        wallXBuffer[col] = wall_x
        textureBuffer[col] = tex
        normalBuffer[col] = wall_normal;
        zBuffer[col] = wall_dist;
        mapSquareIDBuffer[col] = my * me.map.width + mx
      }
    }

    for (col = 0; col < me._width; col += xInc) {
      wall_x = wallXBuffer[col]
      wall_dist = zBuffer[col]
      tex = textureBuffer[col]
      wall_normal = normalBuffer[col]
      var map_square_id = mapSquareIDBuffer[col]

			wall_height = Math.abs(Math.floor(me._height / wall_dist));
			draw_start = (-wall_height/2 + me._height/2)|0;

      var player_behind_angle = player_angle + HALF_TAU % TAU
      var player_wall_angle = angle_distance(wall_normal, player_behind_angle)

      var width = xInc
      var end_wall_x = wall_x + 1
      var initial_wall_normal = wall_normal
      var angle_d
      while ((angle_d = angle_distance(normalBuffer[col + width - xInc], player_behind_angle)), (
        width < 3 ||
        angle_d < 0.1 ||
        wall_dist < 2 && angle_d < 0.35 && width < 40 ||
        wall_dist < 1 && width < 10 ||
        wall_dist > 2 && width < 5 ||
        wall_dist > 2 && angle_d < 0.3 && width < 100 ||
        wall_dist > 2 && angle_d < 0.4 && width < 40 ||
        wall_dist > 7 && angle_d < 1
      ) &&
        mapSquareIDBuffer[col + width + xInc] === map_square_id &&
        normalBuffer[col + width + xInc] === initial_wall_normal
      ) {
        width += xInc
        wall_normal = normalBuffer[col + width - xInc]
        wall_dist = zBuffer[col + width + xInc]
        end_wall_x = wallXBuffer[col + width]
      }
      var use_width = width + xInc
      var use_tex = tex
      var use_col = col
      var use_tex
      if (isFlippedBuffer[col]) {
        use_tex = tex.flipped
      }
      if (end_wall_x < wall_x) {
        end_wall_x = 64 - end_wall_x
        wall_x = 64 - wall_x
      }
      me.ctx.drawImage(use_tex,
        wall_x, 0,
        Math.max(1, end_wall_x - wall_x), tex.height,
        use_col, draw_start,
        use_width, wall_height
      );
      if (width > 3) {
        col += width
      } else {
        col += width - xInc
      }
		}

    // Shadows

    if (me.shadows) {
      xInc = originalXInc * 5
      var halfXInc = xInc / 2
      for (col = 0; col < me._width; col += xInc) {
        // light
        var prevTint = tint
        var tint = Math.min(0.75, Math.max(0, 0.1 + (zBuffer[col] * 0.12)));
        tint = ((tint * 4)|0) * 0.25
        if (tint > 0.1 && tint !== prevTint) {
          me.ctx.fillStyle = "rgba(" + 0 + ", " + 0 + ", " + 0 + ", " + tint + ")";
        }
        if (tint > 0.1) {
          var wall_height = Math.abs(Math.floor(me._height / zBuffer[col]))
          var draw_start = (-wall_height/2 + me._height/2)|0;
          var width = xInc;
          while (Math.abs(zBuffer[col + width] - zBuffer[col]) < (tint > 0.5 ? 0.05 : tint === 0.5 ? 0.05 : 0.05)) { width += xInc }
          me.ctx.fillRect(col - halfXInc, draw_start, width, wall_height);
          col += width - xInc
        }
      }
    }

    for (i = 0; i < explosions.length; i++) {
      var explosion = false
      xInc = originalXInc * 5
      var halfXInc = xInc / 2
      var row1Start = explosions[i]._squareId - me.map.width - 3
      var row1End = explosions[i]._squareId - me.map.width + 3
      var row2Start = explosions[i]._squareId - 3
      var row2End = explosions[i]._squareId + 3
      var row3Start = explosions[i]._squareId + me.map.width - 3
      var row3End = explosions[i]._squareId + me.map.width + 3
      for (col = 0; col < me._width; col += xInc) {
        if (
          (row1Start < mapSquareIDBuffer[col] && mapSquareIDBuffer[col] < row1End) ||
          (row2Start < mapSquareIDBuffer[col] && mapSquareIDBuffer[col] < row2End) ||
          (row3Start < mapSquareIDBuffer[col] && mapSquareIDBuffer[col] < row3End)
        ) {
          if (!explosion) {
            explosion = true
            me.ctx.fillStyle = 'rgba(255, 255, 200, 0.6)'
          }
          if (Date_now - explosions[i].animation_start < 800) {
            var wall_height = Math.abs(Math.floor(me._height / zBuffer[col]))
            var draw_start = (-wall_height/2 + me._height/2)|0;
            while (Math.abs(zBuffer[col + width] - zBuffer[col]) < 0.05) { width += xInc }
            me.ctx.fillRect(col - halfXInc, draw_start, width, wall_height);
          }
        }
      }

      if (explosion) {
        var explosion_x = explosions[i].x - player_x;
        var explosion_y = explosions[i].y - player_y;
        var explosion_z = explosions[i].z

        inv = 1.0 / (player_cx*player_dy - player_dx*player_cy);
        trans_x = inv * (player_dy*explosion_x - player_dx*explosion_y);
        trans_y = inv * (-player_cy*explosion_x + player_cx*explosion_y);
        screen_x = Math.floor((me._width/2) * (1 + trans_x/trans_y));

        if (trans_y < 0) { continue; /* Behind the screen */ }

        var sqDist = Common.sqDistance(explosions[i], player_x, player_y)
        if (sqDist < 0) { continue; }
        var dist = Math.sqrt(sqDist)
        var ceiling_height = Math.abs(me._height / dist)
        var sprite_width = ceiling_height

        //me.ctx.fillStyle = 'red'
        var scale = 3
        if (dist < 4) {
          scale *= 2
        }
        scale *= ceiling_height
        var start_y = Math.floor(-scale/2 + me._height/2 +
          (ceiling_height * explosions[i].sprite.ingame_displacement_y) -
          (ceiling_height * Common.extrapolate_z(explosions[i], dt)))

        var libido = .9 - (Date_now - explosions[i].animation_start) / 1000
        libido = Math.floor(libido * 8) / 8

        if (libido > 0) {
          scale *= 1 / (libido + 0.5)
          if (libido <= 0.5) {
            scale *= 1.15
          }
          if (libido <= 0.25) {
            scale *= 1.35
          }
          me.ctx.fillStyle = 'rgba(255, 255, 255, ' + Math.min(1, libido * 2) + ')'
          me.ctx.fillRect(
            screen_x - (scale / 2), start_y - (explosion_z > 0.5 ? 0 : scale / 4),
            scale, scale)
          me.ctx.fillRect(
            screen_x - (scale / 4), start_y + scale / 4,
            scale / 2, scale / 2)
        }
      } else if (Date_now - explosions[explosions.length - 1].animation_start < 150) {
        var dist = 1 - (Common.sqDistance(explosions[explosions.length - 1], me.player.x, me.player.y) / 40)
        if (dist > 0) {
          me.ctx.fillStyle = 'rgba(255, 255, 200, '+Math.min(0.05, dist)+')'
          me.ctx.fillRect(
            0, 0,
            me.width, me.height
          )
        }
      }
    }

		// sprites (Objects)
		var i, col, sprite_x, sprite_y, inv, trans_x, trans_y, screen_x,
			sprite_width, start_x, start_y, tex, tex_x;

		var sprites = me.map.objs.sorted(player_x, player_y);
    xInc = originalXInc
		for(i=0; i<sprites.length; i++) {
			sprite_x = Common.extrapolate_x(sprites[i].obj, dt) - player_x;
			sprite_y = Common.extrapolate_y(sprites[i].obj, dt) - player_y;

			inv = 1.0 / (player_cx*player_dy - player_dx*player_cy);
			trans_x = inv * (player_dy*sprite_x - player_dx*sprite_y);
			trans_y = inv * (-player_cy*sprite_x + player_cx*sprite_y);
			screen_x = Math.floor((me._width/2) * (1 + trans_x/trans_y));

      if (trans_y < 0) { continue; /* Behind the screen */ }

      var sqDist = Common.sqDistance(sprites[i].obj, player_x, player_y)
      if (sqDist < 0) { continue; }
      var dist = Math.sqrt(sqDist)
      var ceiling_height = Math.abs(me._height / dist)
			var sprite_width = ceiling_height

			start_x = Math.floor(-(sprite_width * sprites[i].obj.sprite.ingame_width)/2 + screen_x);
      start_x = Math.floor(start_x / xInc) * xInc
      var tex_start_x = 0;
      if(start_x < 0) {
        tex_start_x = -(
          (start_x / sprites[i].obj.sprite.ingame_width)
          /
          Math.abs(Math.floor(me._height/trans_y))
        );
        start_x = 0;
      }
      var start_y = Math.floor(-(ceiling_height * sprites[i].obj.sprite.ingame_height)/2 + me._height/2 +
        (ceiling_height * sprites[i].obj.sprite.ingame_displacement_y) -
        (ceiling_height * Common.extrapolate_z(sprites[i].obj, dt)))
			var end_x = Math.floor((sprite_width * sprites[i].obj.sprite.ingame_width)/2 + screen_x);
      if (end_x > me._width) {
        end_x = me._width - xInc
      }
      end_x = Math.floor(end_x / xInc) * xInc

      dist -= .5  // sometimes things are about to leave the z-buffer but they belong on screen
      if (zBuffer[start_x] < dist && zBuffer[end_x] < dist) {
        continue
      }

      var sprite = sprites[i].obj.sprite

      if (sprite.animation) {
        var ms_since = Date_now - (sprites[i].obj.animation_start || 0)
        sprite = Textures.get_animation_frame(sprite, ms_since)
      }

      if (zBuffer[start_x] > dist && zBuffer[end_x] > dist) {
        // Draw entire sprite, no need to draw per-column
        me.ctx.drawImage(
          sprite,

          0, 0,
          sprites[i].obj.sprite.width, sprites[i].obj.sprite.height,

          start_x, start_y,
          end_x - start_x, Math.floor(ceiling_height * sprites[i].obj.sprite.ingame_height)
        )
        continue
      }

      for (var col = start_x; col < end_x; col += xInc * 4) {
        if (zBuffer[col] < dist) {
          continue
        }
        var tex_chunk_width = sprites[i].obj.sprite.width / (ceiling_height * sprites[i].obj.sprite.ingame_width)
        var tex_x = Math.floor((col - start_x) * tex_chunk_width)
        me.ctx.drawImage(
          sprite,

          Math.floor((tex_start_x * sprites[i].obj.sprite.width) + tex_x),
          0,

          Math.ceil( tex_chunk_width * 8 ),
          sprites[i].obj.sprite.height,

          col,
          start_y,

          xInc * 4,
          Math.floor(ceiling_height * sprites[i].obj.sprite.ingame_height)
        )
      }
		}

		// FPS
		var time = Date.now();

		me._frames++;

		me.ctx.fillStyle = "rgb(255, 0, 0)";
		me.ctx.fillText("FPS: " + Math.round(me._frames*1000 / (time-me._time)), 1, me.height-5);

		if(time > me._time + me.fps*1000) {
			me._time = time;
			me._frames = 0;
		}
	};

  var lastDraw = Date.now()
  var thirtyFPS = Math.floor(1000 / 31)
  var lastUpdate = Date.now()
  var TPS = 12
  var TPSth = 1/TPS
  var TPSthInMilliseconds = (1000 / TPS)
	me.loop = function() {
		requestAnimationFrame(me.loop);

    var now = Date.now()

    var toGo
    while ((toGo = (now - lastUpdate) / TPSthInMilliseconds) > 1) {
		  me.update(TPSth)
      lastUpdate = now
    }

    now = Date.now()
    if ((now - lastDraw) >= thirtyFPS) {
      // This means that we're letting it refresh at 25 or 30, whatever floats its boat
      lastDraw = now
      me.draw(toGo);
      me.foreground.draw(me.ctx, toGo);
		}
	};

	me.run = function() {
    me.setup(Settings)
    me.loop();
	};

	me.key_down = function(event) {

		// fullscreen
		if(event.keyCode == 70) {
			if(me.canvas.webkitRequestFullScreen) {
				me.canvas.webkitRequestFullScreen(true);
				return;
			}
			if(me.canvas.mozRequestFullScreen) {
				me.canvas.mozRequestFullScreen();
				return;
			}
			if(me.canvas.requestFullScreen) {
				me.canvas.requestFullScreen();
				return;
			}
		}
	};

  me.update = function(dt) {
    me.player.update(me.map, dt);
    for (var i = 0; i < me.map.objs.objs.length; i++) {
      me.map.objs.objs[i].update(me.map, dt)
    }
    for (var i = 0; i < explosions.length; i++) {
      if (me.map.objs.objs.indexOf(explosions[i]) === -1) {
        explosions.splice(i, 1)
        i--
      }
    }
  }

	me.init = function() {
		document.addEventListener("keydown", me.key_down, false);
		document.addEventListener("keyup", me.key_up, false);
	};

	me.init();

	return me;
};

var app
window.onload = function () {
  Textures.init()
	app = Application("myCanvas");
	app.run();

  if (/development/.test(location.hash)) {
    var _update = app.player.update
    app.player.update = function ()  {
      _update.apply(this, arguments)
      localStorage.savedPosition = JSON.stringify(app.player)
    }
    if (localStorage.savedPosition) {
      var savedPos = JSON.parse( localStorage.savedPosition )
      app.player.load(savedPos)
    }
  }
};


