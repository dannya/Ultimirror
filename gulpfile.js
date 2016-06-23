var argv = require('yargs').argv;
var runSequence = require('run-sequence');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var clean = require('gulp-clean');
var replace = require('gulp-replace');
var stylus = require('gulp-stylus');
var jeet = require('jeet');
var autoprefixer = require('gulp-autoprefixer');
var csso = require('gulp-csso');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var newer = require('gulp-newer');
var imagemin = require('gulp-imagemin');


// determine if in development mode
var isDevelopment = argv.development;

if (isDevelopment) {
    console.log(
        '---- Development mode ----'
    );
}


gulp.task('styles_mirror', function () {
    gulp
        .src('src/css/mirror.styl')
        .pipe(
            stylus(
                {
                    use: [
                        jeet()
                    ]
                }
            )
        )
        .pipe(autoprefixer())
        .pipe(
            gulpif(
                isDevelopment, gulp.dest('app/css')
            )
        )
        .pipe(
            rename('mirror.min.css')
        )
        .pipe(csso())
        .pipe(gulp.dest('app/css'));
});

gulp.task('styles_admin', function () {
    gulp
        .src('src/css/admin.styl')
        .pipe(stylus(
            {
                use: [jeet()]
            }
        ))
        .pipe(autoprefixer())
        .pipe(
            gulpif(
                isDevelopment, gulp.dest('app/css')
            )
        )
        .pipe(
            rename('admin.min.css')
        )
        .pipe(csso())
        .pipe(gulp.dest('app/css'));
});

gulp.task('styles_modules', function () {
    gulp
        .src('src/modules/**/*.styl')
        .pipe(stylus(
            {
                use: [jeet()]
            }
        ))
        .pipe(autoprefixer())
        .pipe(
            gulpif(
                isDevelopment, gulp.dest('app/modules')
            )
        )
        .pipe(
            rename({
                suffix: '.min'
            })
        )
        .pipe(csso())
        .pipe(gulp.dest('app/modules'));
});


gulp.task('scripts_mirror', function () {
    gulp
        .src([
            'src/js/base.js',
            'src/js/mirror.js'
        ])
        .pipe(concat('mirror.js'))
        .pipe(
            gulpif(
                isDevelopment, gulp.dest('app/js')
            )
        )
        .pipe(
            rename('mirror.min.js')
        )
        .pipe(uglify())
        .pipe(gulp.dest('app/js'));
});

gulp.task('scripts_admin', function () {
    gulp
        .src([
            'src/js/base.js',
            'src/js/admin.js'
        ])
        .pipe(concat('admin.js'))
        .pipe(
            gulpif(
                isDevelopment, gulp.dest('app/js')
            )
        )
        .pipe(
            rename('admin.min.js')
        )
        .pipe(uglify())
        .pipe(gulp.dest('app/js'));
});

gulp.task('scripts_ondemand', function () {
    gulp
        .src([
            'src/js/preload.js',
            'src/js/lib_ondemand/*.js'
        ])
        .pipe(
            gulpif(
                isDevelopment, gulp.dest('app/js')
            )
        )
        .pipe(
            rename({
                suffix: '.min'
            })
        )
        .pipe(uglify())
        .pipe(gulp.dest('app/js'));
});

gulp.task('scripts_ultimirror', function () {
    gulp
        .src([
            'src/js/ultimirror/*.js'
        ])
        .pipe(
            gulpif(
                isDevelopment, gulp.dest('app/js/ultimirror')
            )
        )
        .pipe(
            rename({
                suffix: '.min'
            })
        )
        .pipe(uglify())
        .pipe(gulp.dest('app/js/ultimirror'));
});

gulp.task('scripts_modules', function () {
    gulp
        .src([
            'src/modules/**/*.js'
        ])
        .pipe(
            gulpif(
                isDevelopment, gulp.dest('app/modules')
            )
        )
        .pipe(
            rename({
                suffix: '.min'
            })
        )
        .pipe(uglify())
        .pipe(gulp.dest('app/modules'));
});


gulp.task('transfer_modules', function () {
    // copy HTML pages
    gulp
        .src('src/modules/**/*.html')
        .pipe(gulp.dest('app/modules'));

    // copy other files
    gulp
        .src([
            'src/modules/**/img/*',
            'src/modules/**/fonts/*',
            'src/modules/**/*.json'
        ])
        .pipe(newer('app/img'))
        .pipe(gulp.dest('app/modules'));
});


gulp.task('transfer_pages', function () {
    // copy HTML pages
    gulp
        .src('src/*.html')
        .pipe(gulp.dest('app'));
});


gulp.task('transfer_layouts', function () {
    // copy layout HTML files
    return gulp
        .src('src/layouts/**/*.html')
        .pipe(gulp.dest('app/layouts'));
});


gulp.task('transfer_templates', function () {
    // copy template HTML files
    return gulp
        .src('src/templates/**/*.html')
        .pipe(gulp.dest('app/templates'));
});


gulp.task('images', function () {
    // optimise images
    gulp
        .src('src/img/**')
        .pipe(newer('app/img'))
        .pipe(imagemin({ progressive: true }))
        .pipe(gulp.dest('app/img'));

    // copy favicon
    gulp
        .src('src/favicon.ico')
        .pipe(gulp.dest('app'));
});

gulp.task('images_modules', function () {
    // optimise images
    gulp
        .src('src/modules/**/img/*')
        .pipe(newer('app/modules'))
        .pipe(imagemin({ progressive: true }))
        .pipe(gulp.dest('app/modules'));
});




// define workflow tasks
gulp.task(
    'default',
    [
        'styles_mirror',
        'styles_admin',
        'styles_modules',
        'scripts_mirror',
        'scripts_admin',
        'scripts_ondemand',
        'scripts_ultimirror',
        'scripts_modules',
        'transfer_modules',
        'transfer_pages',
        'transfer_layouts',
        'transfer_templates',
        'images_modules',
        'images'
    ]
);

gulp.task(
    'scripts',
    [
        'scripts_mirror',
        'scripts_admin',
        'scripts_ondemand',
        'scripts_ultimirror',
        'scripts_modules'
    ]
);

gulp.task(
    'clean',
    function () {
        return gulp
            .src(
                'app',
                {
                    read: false
                }
            )
            .pipe(clean());
    }
);

gulp.task(
    'release',
    function (callback) {
        runSequence(
            'clean',
            'default',
            callback
        );
    }
);




// set up file watcher
gulp.task('watch', function () {
    gulp.watch(['src/css/*.styl'], ['styles_mirror', 'styles_admin']);

    gulp.watch(['src/modules/**/*.styl'], ['styles_modules']);
    gulp.watch(['src/modules/**/*.js'], ['scripts_modules']);
    gulp.watch(['src/modules/**/*.html'], ['transfer_modules']);
    gulp.watch(['src/modules/**/*.json'], ['transfer_modules']);
    gulp.watch(['src/modules/**/img/*'], ['images_modules']);

    gulp.watch(['src/*.html'], ['transfer_pages']);

    gulp.watch(['src/layouts/**/*.html'], ['transfer_layouts']);
    gulp.watch(['src/templates/**/*.html'], ['transfer_templates']);

    gulp.watch(['src/js/*'], ['scripts_mirror', 'scripts_admin']);
    gulp.watch(['src/js/preload.js', 'src/js/lib_ondemand/**'], ['scripts_ondemand']);
    gulp.watch(['src/js/ultimirror/**'], ['scripts_ultimirror']);

    gulp.watch(['src/img/**'], ['images']);
});