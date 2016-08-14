(function(window) {

    function pathfind(s, e, m) {

         /*
            Nodes -
            x: x position
            y: y position
            p: Index of the parent node (Stored in closed array)
            g: Cost from start to current node
            h: Heuristic cost from current node to destination
            f: Cost from start to destination going through current node
        */
        var node = function (x, y, p, g, h, f) {
            this.x = x;
            this.y = y;
            this.p = p;
            this.g = g;
            this.h = h;
            this.f = f;
        };


        // Heuristic - Estimated movement cost from current square to end position
        var heuristic = function (current, end) {

            var x = current.x - end.x,
                y = current.y - end.y;

            return Math.pow(x, 2) + Math.pow(y, 2);
        };

        s = new node(s[1], s[0], -1, -1, -1, -1); // Start Node
        e = new node(e[1], e[0], -1, -1, -1, -1); // End Node


        var rows = m.length-1, // Get number of rows from map
            cols = m[0].length-1, // Number of columns from map
            o = [], // Open Nodes
            c = [], // Closed Nodes
            mn = new Array(rows*cols); // Store open/closed nodes


        // Place start node onto list of open nodes
        o.push(s);


        // Initiate Search Loop, keep going while there are nodes in the open list
        while (o.length > 0) {

            // Locate Best Node
            var best = {
                c: o[0].f,
                n: 0
            };

            for (var i = 1, len = o.length; i < len; i++) {
                if (o[i].f < best.c) {
                    best.c = o[i].f;
                    best.n = i;
                }
            }

            // Set current to best
            var current  = o[best.n];

            // Check if end point has been reached
            if (current.x == e.x && current.y == e.y) {

                var path = [[e.x, e.y]]; // Create Path

                // Loop back through parents to complete the path
                while (current.p !== -1) {
                    current = c[current.p];
                    path.unshift([current.x, current.y]);
                }

                return path; // Return the path
            }

            // Remove current node from open list
            o.splice(best.n, 1);
            mn[current.x + current.y * rows] = false; // Set bit to closed

            c.push(current);

            // Search new nodes in all directions
            for (var x = Math.max(0, current.x-1), lenX = Math.min(cols, current.x+1); x <= lenX; x++) {
                for (var y = Math.max(0, current.y-1), lenY = Math.min(rows, current.y+1); y <= lenY; y++) {

                    // Check if location square is open
                    if (m[x][y] === 0) {

                        // Check if square is in closed list
                        if (mn[x + y * rows] === false) {
                            continue;
                        }

                        // If square not in open list use it
                        if (mn[x + y * rows] !== true) {
                            var n = new node(x, y, c.length-1, -1, -1, -1); // Create new node

                            n.g = current.g + Math.floor(Math.sqrt(Math.pow(n.x - current.x, 2) + Math.pow(n.y-current.y, 2)));
                            n.h = heuristic(n, e);
                            n.f = n.g + n.h;

                            o.push(n); // Push node onto open list

                            mn[x + y * rows] = true; // Set bit into open list
                        }
                    }
                }
            } 
        }

        return false; // No Path Found!
    }

    // Node and Browser
    if (typeof module === 'object' && module && typeof module.exports === 'object') {
        module.exports = pathfind;
    } else {
        window.Pathfind = pathfind;
    }
})(this);