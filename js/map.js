
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
      w,_,w,_,_,w,w,_,_,_,_,_,w,w,_,w,_,_,_,w,
      w,_,_,_,_,w,w,_,w,w,w,w,w,w,_,_,_,w,_,w,
      w,w,_,_,w,w,w,_,w,w,w,w,w,w,w,w,_,_,_,w,
      w,_,_,_,w,w,w,_,_,_,w,w,_,_,_,_,_,w,w,w,
      w,_,_,_,w,w,w,_,_,_,_,_,_,w,_,w,_,w,w,w,
      w,w,_,_,w,w,w,_,_,_,w,w,_,_,_,_,_,w,w,w,
      w,w,_,_,w,w,w,w,_,w,w,w,_,w,_,w,_,w,w,w,
      w,w,w,_,O,_,_,_,_,w,w,w,_,_,_,_,_,w,w,w,
      w,w,w,_,_,_,w,w,_,w,w,w,w,w,_,w,w,w,w,w,
      w,w,_,_,_,w,w,w,_,w,w,w,w,_,_,_,O,w,w,w,
      w,O,_,_,_,w,w,w,O,w,w,w,w,_,_,_,_,w,w,w,
      w,_,_,_,_,_,w,w,w,w,w,w,w,_,_,_,_,w,w,w,
      w,w,_,w,w,_,_,w,w,w,w,w,w,w,_,_,w,w,w,w,
      w,w,_,_,_,_,_,_,_,_,_,_,_,_,_,_,w,w,w,w,
      w,w,_,_,w,_,_,_,_,w,w,w,_,_,_,_,_,_,_,w,
      w,w,O,w,w,w,_,_,O,w,w,w,w,_,w,w,w,_,w,w,
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

if (typeof module !== 'undefined') {
  module.exports = Map
}

