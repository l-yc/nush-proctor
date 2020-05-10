var gulp = require('gulp');
var sass = require('gulp-sass');

gulp.task('styles', function() {
  return gulp.src('./public/sass/**/*.scss')
    .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
    .pipe(gulp.dest('./public/css/'));
});

//Watch task
gulp.task('default', function() {
  return gulp.watch('./public/sass/**/*.scss', gulp.series('styles'));
});
