
var Settings = {
  resolution: 1,
  shadows: true,
}

if (localStorage.resolution) { Settings.resolution = JSON.parse(localStorage.resolution) }

options.onclick = () => {
  var resolution = confirm('High resolution?') ? 1 : 1/2

  app.setup({ resolution })

  localStorage.resolution = JSON.stringify(resolution)
}

