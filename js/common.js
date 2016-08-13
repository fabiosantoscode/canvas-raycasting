
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
  me.round2 = n => Math.round(n * 100) / 100
  me.random_spawn = (player, map) => {
    var point = map.spawn_points[Math.floor(Math.random() * map.spawn_points.length)]
    if (map.is_free(point.x, point.y - 1)) {
      player.angle = -QUARTER_TAU
    }
    if (map.is_free(point.x, point.y + 1)) {
      player.angle = QUARTER_TAU
    }
    if (map.is_free(point.x - 1, point.y)) {
      player.angle = HALF_TAU
    }
    if (map.is_free(point.x + 1, point.y)) {
      player.angle = 0
    }
    player.angle += QUARTER_TAU / 4
    player.angle -= (QUARTER_TAU / 2) * Math.random()
    player.x = point.x + .5
    player.y = point.y + .5
  }
  Object.freeze(me)
  return me
}();

if (typeof module !== 'undefined') {
  module.exports = { Common }
}
