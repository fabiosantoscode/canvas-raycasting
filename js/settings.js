
var Settings = {
  resolution: 1,
  shadows: true,
}

if (localStorage.resolution) { Settings.resolution = JSON.parse(localStorage.resolution) }
if (localStorage.shadows) { Settings.shadows = JSON.parse(localStorage.shadows) }

options.onclick = () => {
  var resolution = confirm('High resolution?') ? 1 : 1/2
  var shadows = confirm('Shadows?')

  app.setup({ resolution, shadows })

  localStorage.resolution = JSON.stringify(resolution)
  localStorage.shadows = JSON.stringify(shadows)
}

