
window.joystick = new VirtualJoystick({
  mouseSupport: true,
})

const touch = e => (e.changedTouches ? e.changedTouches[0] : e)

joystick.addEventListener('touchStartValidation', e =>
  touch(e).pageX < document.documentElement.clientWidth / 2 &&
  touch(e).pageY > 40
)

window.rjoystick = new VirtualJoystick({
  mouseSupport: true,
})

rjoystick.addEventListener('touchStartValidation', e =>
  touch(e).pageX > document.documentElement.clientWidth / 2 &&
    touch(e).pageY < document.documentElement.clientHeight / 2
)

