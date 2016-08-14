/**
   Pathfind Test
*/
var Pathfind = require('../index.js');
var start, end, map, path;

describe('Pathfind', function(){

    start = [0,0];
    end = [4, 4];
    map = [
        [0, 0, 0, 1, 0],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 0, 0],
        [0, 0, 1, 1, 0],
        [0, 0, 1, 1, 0]
    ];

    it('Should return a valid Path', function(){
        path = Pathfind(start, end, map);

        path.length.should.equal(6);
        path[0][0].should.equal(start[0]);
        path[0][1].should.equal(start[1]);
        path[path.length-1][0].should.equal(end[0]);
        path[path.length-1][1].should.equal(end[1]);
    });

    it('Should return a non valid path', function(){
        start = [0, 4];
        path = Pathfind(start, end, map);

        path.should.equal(false);
    });
});