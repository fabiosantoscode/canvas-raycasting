var gulp = require('gulp'),
    istanbul = require('gulp-istanbul'),
    mocha = require('gulp-mocha'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    should = require('should');

gulp.task('test', function (cb) {
    gulp.src('index.js')
        .pipe(istanbul())
        .pipe(istanbul.hookRequire())
        .on('finish', function () {
            gulp.src(['test/*.js'])
                .pipe(mocha({
                    globals: {
                        should: should
                    }
                }))
                .pipe(istanbul.writeReports())
                .on('end', cb);
        });
});

gulp.task('build', function () {
    gulp.src('index.js')
        .pipe(uglify())
        .pipe(rename('pathfind.min.js'))
        .pipe(gulp.dest('build'));
});