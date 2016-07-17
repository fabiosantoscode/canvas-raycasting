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
        ingame_height: .25,
        ingame_width: .25,
        ingame_displacement_x: 0,
        ingame_displacement_y: .5,
      },
      {
        src: 'img/room.png',
      },
      {
        src: 'img/wall.jpg',
      }
    ];

  var me = {
    textures: [],
  }

  for(i=0; i<files.length; i++) {
    me.textures[i] = new Image();
    me.textures[i].src = files[i].src + "?" + ver;
  }

  me.init = () => {
    me.textures.forEach((texture, i) => {
      me.textures[i].style.imageRendering = '-moz-crisp-edges';
      me.textures[i].style.imageRendering = 'pixelated';
      me.textures[i].ingame_height = files[i].ingame_height
      me.textures[i].ingame_width = files[i].ingame_width
      me.textures[i].ingame_displacement_x = files[i].ingame_displacement_x
      me.textures[i].ingame_displacement_y = files[i].ingame_displacement_y
      me.textures[i].index = i
      var flipped = document.createElement('canvas')
      var fCtx = flipped.getContext('2d')
      fCtx.scale(-1, 1)
      fCtx.drawImage(me.textures[i], -me.textures[i].width, 0)
      me.textures[i].flipped = flipped
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
    angle: 0,
    // the rate at which X and Y are being changed this frame
    incr_x: 0,
    incr_y: 0,
    incr_angle: 0,

    speed: 2,
    rotspeed: 2,

    up : false,
    down : false,
    right : false,
    left : false,

    sprite : Textures.textures[0]
  };

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
  me.save = function (data) {
    const round = n => Math.round(n * 100) / 100
    _saved.id = me.id
    _saved.x = round(me.x)
    _saved.y = round(me.y)
    _saved.angle = round(me.angle)
    _saved.incr_x = round(me.incr_x)
    _saved.incr_y = round(me.incr_y)
    _saved.incr_angle = round(me.incr_angle)
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
		var change_x = me.extrapolate_dx(1) * me.speed * dt;
		var change_y = me.extrapolate_dy(1) * me.speed * dt;

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

    if (
      me.incr_x !== prev_incr_x || me.incr_y !== prev_incr_y ||
      me.angle !== prev_angle
    ) {
      window.sendMove(me)
    }
  }

  me.extrapolate_x = (dt) => me.x + (me.incr_x * dt)
  me.extrapolate_y = (dt) => me.y + (me.incr_y * dt)
  me.extrapolate_angle = (dt) => me.angle + (me.incr_angle * dt)
  me.extrapolate_dx = (dt, angle = me.extrapolate_angle(dt)) => Math.cos(angle)
  me.extrapolate_dy = (dt, angle = me.extrapolate_angle(dt)) => Math.sin(angle)
  me.extrapolate_cx = (dt, angle = me.extrapolate_angle(dt)) => -Math.sin(angle) * 0.66
  me.extrapolate_cy = (dt, angle = me.extrapolate_angle(dt)) => Math.cos(angle) * 0.66

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

	me.sqDistance = function(x, y) {
		return Math.pow(x-me.x, 2) + Math.pow(y-me.y, 2);
	};

	me.init();

	return me;
};

var Obj = function(name, x, y, size, texture) {
	var me = {
		name : name,
		x : x,
		y : y,
		size : size, // 0..1 (for a 256x256 wall texture)
		texture : texture
	};

	me.sqDistance = function(x, y) {
		return Math.pow(x-me.x, 2) + Math.pow(y-me.y, 2);
	};

	return me;
};

var Objects = function() {
	var me = {
		textures : [],
		objs : []
	};

	me.init = function() {
		var ver = 1, // increase this for refreshing the cache
			i,
			files = [ 'img/object.png' ];
		
		for(i=0; i<files.length; i++) {
			me.textures[i] = new Image();
			me.textures[i].src = files[i] + "?" + ver;
		}
	};

	me.add = function(name, x, y, size, texture) {
		me.objs[me.objs.length] = Obj(name, x, y, size, texture);
	};

	me.remove = function(index) {
		delete me.objs[index];
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
      _sortedCache[i].sqDist = me.objs[i].sqDistance(x, y)
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

	me.init();

	return me;
};

var Application = function(id) {
  var defaultWidth = 512
  var defaultHeight = 307
	var me = {
		id : id,
		canvas : undefined,
		ctx : undefined,

		map : Map(),
		player : Player(1, 1),
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
		me.canvas = document.getElementById(me.id);

    me.shadows = shadows
    me.width = defaultWidth * resolution
    me.height = defaultHeight * resolution
    me._width = defaultWidth * resolution
    me._height = defaultHeight * resolution

		if(me.canvas.getContext) {
			me.canvas.width = me._width;
			me.canvas.height = me._height;
			me.canvas.style.background = "rgb(0, 0, 0)";

			me.ctx = me.canvas.getContext("2d");
      me.ctx.webkitImageSmoothingEnabled = me.ctx.imageSmoothingEnabled = me.ctx.mozImageSmoothingEnabled = me.ctx.oImageSmoothingEnabled = false;

			return true;
		}
    zBufferPassCacheKey = ''  // clear z-buffer cache
		return false;
	};

  me.draw_floor_ceiling_gradient = function () {
    me.ctx.drawImage(Textures.textures[1], 0, 0, me._width, me._height)
  }

	var zBuffer = []; // used for sprites (objects)
  var wallXBuffer = [];
  var normalBuffer = [];
  var textureBuffer = [];
  var mapSquareIDBuffer = [];
  var isFlippedBuffer = [];
  var zBufferPassCacheKey = ''

  const mod = (a, n) => a - Math.floor(a/n) * n
  const angle_distance = (a, b) => Math.abs(Math.min(TAU - Math.abs(a - b), Math.abs(a - b)))
	me.draw = function(dt) {
		// floor / ceiling 
    me.draw_floor_ceiling_gradient();

		var col
    var player_angle = me.player.extrapolate_angle(dt)
    var player_x = me.player.extrapolate_x(dt)
    var player_y = me.player.extrapolate_y(dt)
    var player_dx = me.player.extrapolate_dx(dt, player_angle)
    var player_dy = me.player.extrapolate_dy(dt, player_angle)
    var player_cx = me.player.extrapolate_cx(dt, player_angle)
    var player_cy = me.player.extrapolate_cy(dt, player_angle)

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
        wall_dist < 1 && width < 10 ||
        wall_dist > 2 && width < 5 ||
        wall_dist > 2 && angle_d < 0.3 && width < 100 ||
        wall_dist > 2 && angle_d < 0.4 && width < 40
      ) &&
        mapSquareIDBuffer[col + width + xInc] === map_square_id &&
        normalBuffer[col + width + xInc] === initial_wall_normal
      ) {
        width += xInc
        wall_normal = normalBuffer[col + width - xInc]
        wall_dist = zBuffer[col + width + xInc]
        end_wall_x = wallXBuffer[col + width]
      }
      var use_width = width
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
      col += width - xInc
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
          while (Math.abs(zBuffer[col + width] - zBuffer[col]) < 0.05) { width += xInc }
          me.ctx.fillRect(col - halfXInc, draw_start, width, wall_height);
          col += width - xInc
        }
      }
    }

		// sprites (Objects)
		var i, col, sprite_x, sprite_y, inv, trans_x, trans_y, screen_x,
			sprite_width, start_x, start_y, tex, tex_x;

		var sprites = me.map.objs.sorted(player_x, player_y);
    xInc = originalXInc
		for(i=0; i<sprites.length; i++) {
			sprite_x = sprites[i].obj.extrapolate_x(dt) - player_x;
			sprite_y = sprites[i].obj.extrapolate_y(dt) - player_y;

			inv = 1.0 / (player_cx*player_dy - player_dx*player_cy);
			trans_x = inv * (player_dy*sprite_x - player_dx*sprite_y);
			trans_y = inv * (-player_cy*sprite_x + player_cx*sprite_y);
			screen_x = Math.floor((me._width/2) * (1 + trans_x/trans_y));

      if (trans_y < 0) { continue; /* Behind the screen */ }

      var sqDist = sprites[i].obj.sqDistance(player_x, player_y)
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
        (ceiling_height * sprites[i].obj.sprite.ingame_displacement_y))
			var end_x = Math.floor((sprite_width * sprites[i].obj.sprite.ingame_width)/2 + screen_x);
      if (end_x > me._width) {
        end_x = me._width - xInc
      }
      end_x = Math.floor(end_x / xInc) * xInc

      if (zBuffer[start_x] < dist && zBuffer[end_x] < dist) {
        continue
      }

      if (zBuffer[start_x] > dist && zBuffer[end_x] > dist) {
        // Draw entire sprite, no need to draw per-column
        me.ctx.drawImage(
          sprites[i].obj.sprite,

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
          sprites[i].obj.sprite,

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

  me.draw_weapon_plane = function ()  {
    
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
      lastDraw = now
      me.draw(toGo);
      me.draw_weapon_plane();
		}
	};

	me.run = function() {
		if(me.setup(Settings)) {
			me.loop();
		}
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


