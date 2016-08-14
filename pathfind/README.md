# Javascript A* Pathfind
> Javascript implementation of A* Pathfinding, developed for use with [http://jsiso.com](http://jsiso.com)

## Getting Started
This script is developed to work with Node.js and in the Browser.

### Node
```shell
npm install js-pathfind
```

```js
var Pathfind = require('js-pathfind');
```

### Browser
```html
<script type="text/javascript" src="build/pathfind.min.js"></script>
```

```js
var Pathfind = window.Pathfind;
```


## Pathfind

### Pathfind(start, end, map);
#### start
Type: `array`
Starting location x and y co-ordinate: [x, y]

#### end
Type: `array`
Ending location x and y co-ordinate: [x, y]

#### Map
Type: `array`
2d array of any size which holds all the co-ordinates on the map. 0 = open square, 1 or above = blocked square
x values  = columns
y values = rows (first row = 0)


### Return
Type: `array` or `boolean`
The returned value will be an array of co-ordinates showing the route through the map or false if not route is possible.


## Example
```js
var start = [0,0];
var end = [4,4];
var map = [
    [0, 0, 0, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 1, 0],
    [0, 0, 1, 1, 0]
];
var path = Pathfind(start, end, map);
console.log(path); // Output = [ [ 0, 0 ], [ 1, 1 ], [ 1, 2 ], [ 2, 3 ], [ 3, 4 ], [ 4, 4 ] ]

start = [0, 4]; // Start Bottom left
path = Pathfind(start, end, map);
console.log(path); // Output = false
```


## License
MIT License 2013-2015 Edward Smyth