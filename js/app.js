'use strict'

var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || setTimeout

var TYPE_PLAYER = 6
var TYPE_GRENADE = 7
var TAU = Math.PI * 2
var HALF_TAU = Math.PI
var QUARTER_TAU = Math.PI / 2
const round2 = n => Math.round(n * 100) / 100

// from https://github.com/kayellpeee/hsl_rgb_converter/blob/master/converter.js
var hslToRgb = function(hue, saturation, lightness){
  // based on algorithm from http://en.wikipedia.org/wiki/HSL_and_HSV#Converting_to_RGB
  if( hue == undefined ){
    return [0, 0, 0];
  }

  var chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
  var huePrime = hue / 60;
  var secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));

  huePrime = Math.floor(huePrime);
  var red;
  var green;
  var blue;

  if( huePrime === 0 ){
    red = chroma;
    green = secondComponent;
    blue = 0;
  }else if( huePrime === 1 ){
    red = secondComponent;
    green = chroma;
    blue = 0;
  }else if( huePrime === 2 ){
    red = 0;
    green = chroma;
    blue = secondComponent;
  }else if( huePrime === 3 ){
    red = 0;
    green = secondComponent;
    blue = chroma;
  }else if( huePrime === 4 ){
    red = secondComponent;
    green = 0;
    blue = chroma;
  }else if( huePrime === 5 ){
    red = chroma;
    green = 0;
    blue = secondComponent;
  }

  var lightnessAdjustment = lightness - (chroma / 2);
  red += lightnessAdjustment;
  green += lightnessAdjustment;
  blue += lightnessAdjustment;

  return [Math.floor(red * 255), Math.floor(green * 255), Math.floor(blue * 255)];
};

var Tutorial = (function () {
  var me = {
    tutorialImg: null,
    onend: () => { throw new Error('attach an onstart function to the Tutorial') },
    start: () => {
      me.tutorialImg = Textures.textures[6].cloneNode()
      me.tutorialImg.className = 'tutorial-image'
      document.body.appendChild(me.tutorialImg)
      document.body.className += ' tutorial-mode'
      me.tutorialImg.onclick = me.end
    },
    end: () => {
      document.body.className = document.body.className.replace(' tutorial-mode', '')
      me.tutorialImg.parentNode.removeChild(me.tutorialImg)
      me.onend()
    },
  };

  return me
}())

var Textures = (function() {
  var ver = 1, // increase this for refreshing the cache
    i,
    files = [
      {
        src: 'img/bot.png',
        ingame_height: 1,
        ingame_width: 1,
        ingame_displacement_x: 0,
        ingame_displacement_y: 0
      },
      {
        src: 'img/room.png',
      },
      {
        src: 'img/wall.jpg',
        flipped: true,
        shaded: true,
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
        ingame_height: 1.6,
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
      {
        src: 'img/tutorial.png',
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

  function preprocess_image(image, fn) {
    var processed = document.createElement('canvas')
    processed.width = image.width
    processed.height = image.height
    fn(processed.getContext('2d'))
    return processed
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
      var variations = [ '' ]
      if (files[i].flipped) {
        variations.push('flipped')
        me.textures[i].flipped = preprocess_image(me.textures[i], ctx => {
          ctx.scale(-1, 1)
          ctx.drawImage(me.textures[i], -me.textures[i].width, 0)
        })
      }
      if (files[i].shaded) {
        const tints = [ 0.25, 0.35, 0.5 ]
        variations.forEach(variation => {
          var tex = me.textures[i]
          if (variation !== '') { tex = tex[variation] }
          tex.shaded = tints.map(tint => multiply_image_by_tint(tex, tint))
        })
        function multiply_image_by_tint(tex, tint) {
          return preprocess_image(tex, ctx => {
            ctx.drawImage(tex, 0, 0)
            var imageData = ctx.getImageData(0, 0, tex.width, tex.height)
            var tintPercent = (80 - (tint * 80))
            var saturation = tint * 19
            var [ colorR, colorG, colorB ] = hslToRgb(320, saturation / 255, tintPercent / 100)
            var A = tint

            colorR = colorR / 255
            colorG = colorG / 255
            colorB = colorB / 255

            function colorBurn(bottomColor, topColor, alpha) {
              var original = bottomColor

              // https://en.wikipedia.org/wiki/Blend_modes
              // The Color Burn mode divides the inverted bottom layer by the top layer, and then inverts the result
              bottomColor = 1 - bottomColor
              bottomColor /= topColor
              bottomColor = 1 - bottomColor

              bottomColor = (bottomColor * alpha) + original * (1 - alpha)

              return Math.floor(bottomColor * 255)
            }

            for (var i = 0; i < imageData.data.length; i+=4) {
              imageData.data[i] = colorBurn(imageData.data[i] / 255, colorR, A)
              imageData.data[i + 1] = colorBurn(imageData.data[i + 1] / 255, colorG, A)
              imageData.data[i + 2] = colorBurn(imageData.data[i + 2] / 255, colorB, A)
            }

            ctx.putImageData(imageData, 0, 0)
          })
        }
      }
    })
  }

  return me
})();

var Player = function(x, y, isenemy) {
  var me = {
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
    if (!isenemy) {
      document.addEventListener("keydown", me.key_down, false);
      document.addEventListener("keyup", me.key_up, false);
    }

    Object.seal(me)
  };

  me.load = function (data) {
    for (var key in data) if (key !== 'sprite' && key !== 't') {
      me[key] = data[key]
    }
  }

  var _saved = Object.seal({
    t: TYPE_PLAYER,
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
    _saved.x = round2(me.x)
    _saved.y = round2(me.y)
    _saved.angle = round2(me.angle)
    _saved.incr_x = round2(me.incr_x)
    _saved.incr_y = round2(me.incr_y)
    _saved.incr_angle = round2(me.incr_angle)
    return JSON.stringify(_saved)
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
    var now_angle = Common.extrapolate_angle(me, 1)
    var change_x = Math.cos(now_angle) * me.speed * dt;
    var change_y = Math.sin(now_angle) * me.speed * dt;

    var change_sx = Math.cos(now_angle - QUARTER_TAU) * me.speed * dt;
    var change_sy = Math.sin(now_angle - QUARTER_TAU) * me.speed * dt;

    var joystickX = Math.min(Math.max(-1, joystick.deltaX() / 40), 1)
    var joystickY = Math.min(Math.max(-1, joystick.deltaY() / 40), 1)

    var rjoystickX = Math.min(Math.max(-1, rjoystick.deltaX() / 40), 1)

    var up = me.up || (joystickY < 0 && -joystickY)
    var down = me.down || (joystickY > 0 && joystickY)
    var sleft = me.sleft || (joystickX < 0 && -joystickX)
    var sright = me.sright || (joystickX > 0 && joystickX)
    var left = me.left || (rjoystickX < 0 && -rjoystickX)
    var right = me.right || (rjoystickX > 0 && rjoystickX)

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

    if(sleft) {
      if(map.is_free(Math.floor(me.x + me.incr_x + change_sx * sleft), Math.floor(me.y + me.incr_y))) {
        me.incr_x += change_sx * sleft;
      }
      if(map.is_free(Math.floor(me.x + me.incr_x), Math.floor(me.y + me.incr_y + change_sy * sleft))) {
        me.incr_y += change_sy * sleft;
      }
    }

    if(sright) {
      if(map.is_free(Math.floor(me.x + me.incr_x - change_sx * sright), Math.floor(me.y + me.incr_y))) {
        me.incr_x -= change_sx * sright;
      }
      if(map.is_free(Math.floor(me.x + me.incr_x), Math.floor(me.y + me.incr_y - change_sy * sright))) {
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
        window.sendShot(nade)
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

  me.init();

  return me;
};

var Grenade = function(x, y, isenemy) {
  var me = {
    id: 'grenade-' + ((Math.random()*1000000)|0),
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

  me.explode = function () {
    app.map.objs.objs.push(Explosion(me.x, me.y, me.z))
    app.add_explosion(app.map.objs.objs[app.map.objs.objs.length - 1])
    app.map.objs.remove(me)
  }

  var _saved = Object.seal({
    t: TYPE_GRENADE,
    id: 0,
    x: 0,
    y: 0,
    z: 0,
    incr_x: 0,
    incr_y: 0,
  })
  me.save = function (data) {
    _saved.t = TYPE_GRENADE
    _saved.id = me.id
    _saved.x = round2(me.x)
    _saved.y = round2(me.y)
    _saved.z = round2(me.z)
    _saved.incr_x = round2(me.incr_x)
    _saved.incr_y = round2(me.incr_y)
    return JSON.stringify(_saved)
  }

  me.load = function (data) {
    for (var key in data) if (key !== 'sprite' && key !== 't') {
      me[key] = data[key]
    }
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
    animation_start: app.latest_animation_timestamp,
    first_update: true,
  }

  me.sqRadius = me.radius * me.radius
  me.cubeRadius = me.radius * me.radius * me.radius

  var blastRadius = 1.2
  var sqBlastRadius = Math.pow(blastRadius, 2)

  me.update = (map, dt) => {
    if (me.first_update) {
      me.first_update = false
      var near = app.map.objs.find_near(me.x, me.y, sqBlastRadius)
      for (var i = 0; i < near.length; i++) if (near[i] !== me) {
        window.sendDamage(near[i].id)
        app.map.objs.remove(near[i])
      }
    }
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

  var find_near_cache = []
  me.find_near = function (x, y, sqDist) {
    find_near_cache.length = 0
    for (var i = 0; i < me.objs.length; i++) {
      if (Common.sqDistance(me.objs[i], x, y) < sqDist) {
        find_near_cache.push(me.objs[i])
      }
    }
    return find_near_cache
  }

  /*
  me.objs.push(Player(5, 1, 'isenemy'))

  var tempData = {"id":0.5219182117326571,"x":5.034241173117036,"y":1.6772855328758354,"incr_x":0.01,"incr_y":0.01,"speed":2,"rotspeed":0.1,"up":false,"down":false,"right":false,"left":false}

  for (var k in tempData) if (tempData.hasOwnProperty(k)) {
    me.objs[me.objs.length - 1][k] = tempData[k]
  }
  */

  return me;
};

var Map = function() {
  var _ = -1
  var w = 2  // wall
  var O = -2  // spawn
  var me = {
    data : [
      w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,
      w,O,_,_,_,_,_,_,w,w,w,_,_,O,_,_,_,_,_,w,
      w,_,w,w,_,w,w,_,_,w,w,_,_,_,_,_,_,w,_,w,
      w,_,w,w,_,w,w,_,_,_,_,_,w,w,_,w,_,_,_,w,
      w,_,_,_,_,w,w,w,w,w,w,w,w,w,_,_,_,w,_,w,
      w,w,_,w,w,w,w,w,w,w,w,w,w,w,w,w,w,_,_,w,
      w,_,_,_,w,w,w,_,_,_,w,w,_,_,_,_,_,w,w,w,
      w,_,_,_,w,w,w,_,_,_,_,_,_,w,_,w,_,w,w,w,
      w,w,_,w,w,w,w,_,_,_,w,w,_,_,_,_,_,w,w,w,
      w,w,_,_,w,w,w,w,_,w,w,w,_,w,_,w,_,w,w,w,
      w,w,w,_,_,_,_,_,_,w,w,w,_,_,_,_,_,w,w,w,
      w,w,w,_,_,_,w,w,_,w,w,w,w,w,_,w,w,w,w,w,
      w,w,w,w,_,w,w,w,_,w,w,w,w,_,_,_,O,w,w,w,
      w,_,_,_,_,w,w,w,O,w,w,w,w,_,_,_,_,w,w,w,
      w,_,_,w,_,_,w,w,w,w,w,w,w,_,_,_,_,w,w,w,
      w,w,_,w,w,_,_,w,w,w,w,w,w,w,_,_,w,w,w,w,
      w,w,_,_,_,_,_,_,w,w,w,w,w,w,w,_,w,w,w,w,
      w,w,_,w,w,_,_,_,_,w,w,w,_,_,_,_,_,_,_,w,
      w,w,_,w,w,w,_,_,O,w,w,w,w,_,w,w,w,_,w,w,
      w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w,w
    ],
    // up to 33 x 23
    width : 20,
    height : 20,

    textures : [],
    bg : undefined,

    objs : Objects()
  };

  me.spawn_points = []

  me.init = function() {
    me.data.forEach((code, i) => {
      if (code === O /* spawn */) {
        var y = Math.floor(i / me.width)
        var x = i % me.width
        me.spawn_points.push(Object.freeze({ x, y }))
      }
    })
  };

  me.texture = function(idx) {
    return Textures.textures[idx];
  };

  me.get_texture = function(x, y) {
    return me.texture(me.data[y*me.width + x]);
  };

  me.is_free = function(x, y) {
    x = Math.floor(x)
    y = Math.floor(y)
    if(x<0 || x>=me.width || y<0 || y>=me.height) {
      return false;
    }
    return me.data[y*me.width + x] < 0;
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
    if (touch.clientX < document.documentElement.clientWidth * widthOfTheJoystickContainer ||
       touch.clientY < document.documentElement.clientHeight * 0.5) {
      return
    }
    if (touchIdx !== null || player.fire_state !== 'idle' && player.fire_state !== 'fired' && player.fire_state !== 'firing') {
      return
    }
    touchIdx = touch.identifier === undefined ? 'mouse' : touch.identifier
    e.preventDefault()
    moveGrenade(touch)
    if (player.fire_state === 'fired' || player.fire_state === 'firing') {
      return
    }
    player.fire_state = 'dragging'
  }

  function onTouchMove (e) {
    if (touchIdx === null) {
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

    if (player.fire_state === 'dragging') {
      releaseGrenade()
    }

    touchIdx = null
  }

  function moveGrenade (touch) {
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

var Rays = {
  cast_result: Object.seal({
    ray_x: 0,
    ray_y: 0,
    dist_x: 0,
    dist_y: 0,
    mx: 0,
    my: 0,
    delta_x: 0,
    delta_y: 0,
    horiz: false,
    normal: 0,
    step_x: 0,
    step_y: 0,
  }),
  cast: function (map, ray_x, ray_y, ray_dx, ray_dy) {
    var res = Rays.cast_result
    res.mx = Math.floor(ray_x)
    res.my = Math.floor(ray_y)
    res.delta_x = Math.sqrt(1 + (ray_dy * ray_dy) / (ray_dx*ray_dx))
    res.delta_y = Math.sqrt(1 + (ray_dx * ray_dx) / (ray_dy*ray_dy))

    if(ray_dx < 0) {
      res.step_x = -1;
      res.dist_x = (res.ray_x - res.mx) * res.delta_x;
    } else {
      res.step_x = 1;
      res.dist_x = (res.mx + 1 - res.ray_x) * res.delta_x;
    }
    if(ray_dy < 0) {
      res.step_y = -1;
      res.dist_y = (res.ray_y - res.my) * res.delta_y;
    } else {
      res.step_y = 1;
      res.dist_y = (res.my + 1 - res.ray_y) * res.delta_y;
    }

    var lim = 50  // simple safeguard against infinite loops
    while(lim--) {
      if(res.dist_x < res.dist_y) {
        res.dist_x += res.delta_x;
        res.mx += res.step_x;
        res.horiz = true;
        res.normal = res.step_x > 0 ? HALF_TAU : 0
      } else {
        res.dist_y += res.delta_y;
        res.my += res.step_y;
        res.horiz = false;
        res.normal = res.step_y > 0 ? (QUARTER_TAU * 3) : QUARTER_TAU
      }

      if(!map.is_free(res.mx, res.my)) {
        break;
      }
    }

    Rays.cast_result.ray_x = ray_x
    Rays.cast_result.ray_y = ray_y
  }
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
    resolution: 1,
    latest_animation_timestamp: 0,  // Because the time an explosion starts is not Date.now(), it's the RAF thing
  };

  me.setup = function({ resolution, top_down } = {}) {
    if (resolution === undefined) resolution = me.resolution

    if (!top_down) {
      me.width = defaultWidth * resolution
      me.height = defaultHeight * resolution
      me._width = defaultWidth * resolution
      me._height = defaultHeight * resolution
      me.canvas.className = ''
    } else {
      me.width = me._width = 400
      me.height = me._height = 400
      me.canvas.className = 'topDown'
    }

    me.canvas.width = me._width;
    me.canvas.height = me._height;
    me.canvas.style.background = "rgb(0, 0, 0)";

    if ('imageSmoothingEnabled' in me.ctx)
      me.ctx.imageSmoothingEnabled = false
    else if ('webkitImageSmoothingEnabled' in me.ctx)
      me.ctx.webkitImageSmoothingEnabled = false
    else if ('mozImageSmoothingEnabled' in me.ctx)
      me.ctx.mozImageSmoothingEnabled = false

    zBufferPassCacheKey = ''  // clear z-buffer cache
  };

  me.add_explosion = (ex) => {
    explosions.push(ex)
    ex._squareId = Math.floor(ex.y) * me.map.width + Math.floor(ex.x)
  }

  var zBuffer = []; // used for sprites (objects)
  var wall_height_buffer = [];
  var wallXBuffer = [];
  var normalBuffer = [];
  var textureBuffer = [];
  var mapSquareIDBuffer = [];
  var isFlippedBuffer = [];
  var explosions = [];
  var zBufferPassCacheKey = ''

  const mod = (a, n) => a - Math.floor(a/n) * n
  const angle_distance = (a, b) => Math.abs(Math.min(TAU - Math.abs(a - b), Math.abs(a - b)))
  const shadow_tint_for_z = (z) => Math.floor(Math.min(0.8, Math.max(0, 0.1 + (z * 0.12))) * 4)
  var originalXInc = 2
  me.draw = function(dt, timeStamp) {
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

    me.populate_buffers(player_x, player_y, player_dx, player_dy, player_cx, player_cy)

    me.draw_walls(player_angle)

    me.draw_explosions(timeStamp, dt, player_x, player_y, player_dx, player_dy, player_cx, player_cy)

    me.draw_sprites(timeStamp, dt, player_x, player_y, player_dx, player_dy, player_cx, player_cy)

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

  me.draw_top_down = function (dt) {
    me.ctx.fillStyle = 'black'
    me.ctx.fillRect(0, 0, 400, 400)
    draw_cells()
    draw_grid_lines()
    draw_players()
    function draw_cells() {
      var xInc = 400 / me.map.width
      var yInc = 400 / me.map.height
      for (var x = 0; x < me.map.width; x++) {
        for (var y = 0; y < me.map.height; y++) {
          var tex = me.map.get_texture(x, y)
          if (tex) me.ctx.drawImage(
            tex,
            0, 0,
            tex.width / 10, tex.height / 10,
            x * xInc, y * yInc,
            xInc, yInc)
        }
      }
    }
    function draw_grid_lines() {
      me.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      me.ctx.strokeWidth = 4
      me.ctx.beginPath();
      me.ctx.moveTo(0, 0);
      me.ctx.lineTo(0, 400);
      for (var y = 0; y < 400; y += (400 / me.map.width)|0) {
        me.ctx.moveTo(0, y);
        me.ctx.lineTo(400, y);
        me.ctx.moveTo(0, y + 1);
        me.ctx.lineTo(400, y + 1);
        me.ctx.moveTo(0, y - 1);
        me.ctx.lineTo(400, y - 1);
      }
      for (var x = 0; x < 400; x += (400 / me.map.height)|0) {
        me.ctx.moveTo(x, 0);
        me.ctx.lineTo(x, 400);
        me.ctx.moveTo(x + 1, 0);
        me.ctx.lineTo(x + 1, 400);
        me.ctx.moveTo(x - 1, 0);
        me.ctx.lineTo(x - 1, 400);
      }
      me.ctx.stroke()
      me.ctx.strokeRect(0, 0, 400, 400)
    }
    function draw_players() {
      me.ctx.fillStyle = 'pink'
      var sprites = me.map.objs.objs;
      var xInc = (400 / me.map.width)
      var yInc = (400 / me.map.height)
      var halfXInc = xInc / 2
      var halfYInc = yInc / 2
      for(var i=0; i<sprites.length; i++) if (sprites[i].type === Player) {
        var sprite_x = Common.extrapolate_x(sprites[i], dt);
        var sprite_y = Common.extrapolate_y(sprites[i], dt);
        me.ctx.fillRect(
          (sprite_x * xInc) - 10,
          (sprite_y * yInc) - 10,
          20, 20)
      }
    }
  };

  me.populate_buffers = function (player_x, player_y, player_dx, player_dy, player_cx, player_cy) {
    var camera, ray_x, ray_y, ray_dx, ray_dy, mx, my, delta_x,
      delta_y, step_x, step_y, horiz, wall_dist, wall_height,
      wall_x, draw_start, tex;
    var wall_normal
    var xInc = originalXInc
    var k = ''.concat(player_x,':',player_y,':',player_dx,':',player_dy,':',player_cx,':',player_cy)
    if (k !== zBufferPassCacheKey) {
      zBufferPassCacheKey = k
      for(var col=0; col<me._width; col+=xInc) {
        camera = 2 * col / me._width - 1;
        ray_dx = player_dx + player_cx*camera;
        ray_dy = player_dy + player_cy*camera;

        Rays.cast(me.map, player_x, player_y, ray_dx, ray_dy)

        ray_x = Rays.cast_result.ray_x
        ray_y = Rays.cast_result.ray_y
        mx = Rays.cast_result.mx
        my = Rays.cast_result.my
        delta_x = Rays.cast_result.delta_x
        delta_y = Rays.cast_result.delta_y
        horiz = Rays.cast_result.horiz
        wall_normal = Rays.cast_result.normal
        step_x = Rays.cast_result.step_x
        step_y = Rays.cast_result.step_y

        // wall distance
        if(horiz) {
          wall_dist = (mx - ray_x + (1 - step_x) * 0.5) / ray_dx
          wall_x = ray_y + wall_dist * ray_dy;
        } else {
          wall_dist = (my - ray_y + (1 - step_y) * 0.5) / ray_dy
          wall_x = ray_x + wall_dist * ray_dx;
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
        wall_height_buffer[col] = Math.abs(me._height / zBuffer[col])|0
        mapSquareIDBuffer[col] = my * me.map.width + mx
      }
    }
  }

  me.draw_walls = function (player_angle) {
    var xInc = originalXInc;
    for (var col = 0; col < me._width; col += xInc) {
      var wall_x = wallXBuffer[col]
      var wall_dist = zBuffer[col]
      var tex = textureBuffer[col]
      var wall_normal = normalBuffer[col]
      var map_square_id = mapSquareIDBuffer[col]

      var wall_height = wall_height_buffer[col]
      var draw_start = (me._height/2-wall_height/2)|0;

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
        wall_dist < 0.7 && width < 40 && angle_d < 1.5 ||
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
      }
      end_wall_x = wallXBuffer[col + width]
      wall_height = wall_height_buffer[col + Math.floor((width/2) / xInc) * xInc]
      draw_start = (me._height/2-wall_height/2)
      var use_width = width + xInc
      var use_tex = tex
      var use_col = col
      var use_tex
      if (isFlippedBuffer[col]) {
        use_tex = tex.flipped
      }
      if (use_tex.shaded && !explosions.length) {
        var tint = shadow_tint_for_z(zBuffer[col])
        if (tint) {
          use_tex = use_tex.shaded[tint - 1]
        }
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
  }

  me.draw_explosions = function (timeStamp, dt, player_x, player_y, player_dx, player_dy, player_cx, player_cy) {
    for (var i = 0; i < explosions.length; i++) {
      var explosion = false
      var xInc = originalXInc * 5
      var halfXInc = xInc / 2
      var row1Start = explosions[i]._squareId - me.map.width - 3
      var row1End = explosions[i]._squareId - me.map.width + 3
      var row2Start = explosions[i]._squareId - 3
      var row2End = explosions[i]._squareId + 3
      var row3Start = explosions[i]._squareId + me.map.width - 3
      var row3End = explosions[i]._squareId + me.map.width + 3
      for (var col = 0; col < me._width; col += xInc) {
        if (
          (row1Start < mapSquareIDBuffer[col] && mapSquareIDBuffer[col] < row1End) ||
          (row2Start < mapSquareIDBuffer[col] && mapSquareIDBuffer[col] < row2End) ||
          (row3Start < mapSquareIDBuffer[col] && mapSquareIDBuffer[col] < row3End)
        ) {
          if (!explosion) {
            explosion = true
            me.ctx.fillStyle = timeStamp - explosions[i].animation_start > 600 ?
              'rgba(255, 255, 200, 0.2)' :
              'rgba(255, 255, 200, 0.6)'
          }
          if (timeStamp - explosions[i].animation_start < 800) {
            var wall_height = wall_height_buffer[col]
            var draw_start = (-wall_height/2 + me._height/2)|0;
            var width = 0
            while (Math.abs(zBuffer[col + width] - zBuffer[col]) < 0.05) { width += xInc }
            me.ctx.fillRect(col - halfXInc, draw_start, width, wall_height);
          }
        }
      }

      if (explosion) {
        var explosion_x = explosions[i].x - player_x;
        var explosion_y = explosions[i].y - player_y;
        var explosion_z = explosions[i].z

        var inv = 1.0 / (player_cx*player_dy - player_dx*player_cy);
        var trans_x = inv * (player_dy*explosion_x - player_dx*explosion_y);
        var trans_y = inv * (-player_cy*explosion_x + player_cx*explosion_y);
        var screen_x = Math.floor((me._width/2) * (1 + trans_x/trans_y));

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

        var libido = .9 - (timeStamp - explosions[i].animation_start) / 1000
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
      } else if (timeStamp - explosions[explosions.length - 1].animation_start < 150) {
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
  }

  me.draw_sprites = function (timeStamp, dt, player_x, player_y, player_dx, player_dy, player_cx, player_cy) {
    // sprites (Objects)
    var i, col, sprite_x, sprite_y, inv, trans_x, trans_y, screen_x,
      sprite_width, start_x, start_y, tex, tex_x;

    var sprites = me.map.objs.sorted(player_x, player_y);
    var xInc = originalXInc
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

      dist -= .15  // sometimes things are about to leave the z-buffer but they belong on screen
      if (zBuffer[start_x] < dist && zBuffer[end_x] < dist) {
        continue
      }

      var sprite = sprites[i].obj.sprite

      if (sprite.animation) {
        var ms_since = timeStamp - (sprites[i].obj.animation_start || 0)
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

      for (var col = start_x; col < end_x; col += xInc * 2) {
        if (zBuffer[col] < dist) {
          continue
        }
        var tex_chunk_width = sprites[i].obj.sprite.width / (ceiling_height * sprites[i].obj.sprite.ingame_width)
        var tex_x = Math.floor((col - start_x) * tex_chunk_width)
        me.ctx.drawImage(
          sprite,

          Math.floor((tex_start_x * sprites[i].obj.sprite.width) + tex_x),
          0,

          Math.ceil( tex_chunk_width * 4 ),
          sprites[i].obj.sprite.height,

          col,
          start_y,

          xInc * 2,
          Math.floor(ceiling_height * sprites[i].obj.sprite.ingame_height)
        )
      }
    }
  }

  var lastUpdate = null
  var thirtyFPS = Math.floor(1000 / 24)
  var FPSthInMilliseconds = 1000 / 30
  var TPS = 12
  var TPSth = 1/TPS
  var TPSthInMilliseconds = (1000 / TPS)
  me.loop = function(timeStamp) {
    if (timeStamp === undefined) timeStamp = Date.now()
    requestAnimationFrame(me.loop);

    if (lastUpdate === null) {
      lastUpdate = timeStamp;
      me.latest_animation_timestamp = timeStamp;
      return
    }

    var toGo
    while ((toGo = (timeStamp - lastUpdate) / TPSthInMilliseconds) > 1) {
      me.update(TPSth)
      lastUpdate = timeStamp
    }

    if (Settings.top_down) {
      me.draw_top_down(toGo, timeStamp);
    } else if ((timeStamp - me.latest_animation_timestamp) > FPSthInMilliseconds*.5) {
      // This means that we're letting it refresh at 25 or 30, whatever floats its boat
      me.latest_animation_timestamp = timeStamp
      me.draw(toGo, timeStamp);
      me.foreground.draw(me.ctx, toGo);
    }
  };

  me.run = function() {
    me.setup(Settings)
    me.loop(0)
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

  me.respawn = function() {
    var point = me.map.spawn_points[Math.floor(Math.random() * me.map.spawn_points.length)]
    if (me.map.is_free(point.x, point.y - 1)) {
      player.angle = -QUARTER_TAU
    }
    if (me.map.is_free(point.x, point.y + 1)) {
      player.angle = QUARTER_TAU
    }
    if (me.map.is_free(point.x - 1, point.y)) {
      player.angle = HALF_TAU
    }
    if (me.map.is_free(point.x + 1, point.y)) {
      player.angle = 0
    }
    player.angle += QUARTER_TAU / 4
    player.angle -= (QUARTER_TAU / 2) * Math.random()
    player.x = point.x + .5
    player.y = point.y + .5
    window.sendMove(player)
  }

  me.init = function() {
    Textures.init()
    me.respawn()
  };

  me.init();

  return me;
};

var app
window.onload = function () {
  Settings.top_down = /topdown/.test(location.hash)
  var development = /development/.test(location.hash) || Settings.top_down
  if (!development) {
    Tutorial.start()
    Tutorial.onend = start_application
  } else {
    start_application()
  }

  function start_application() {
    app = Application("myCanvas");
    app.run();

    if (development) {
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
  }
};


