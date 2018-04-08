import { argv } from 'yargs';
import path from 'path';
import runSequence  from 'run-sequence';
import gulp  from 'gulp';
import jeet from 'jeet';
import YAWN from 'yawn-yaml/cjs';
import es from 'event-stream';
import fs from 'fs';

import gulpLoadPlugins from 'gulp-load-plugins';


const $ = gulpLoadPlugins();


// determine if in development mode
const isDevelopment = argv.development;

if (isDevelopment) {
    console.log(
        '---- Development mode ----'
    );
}




// helper functions (https://stackoverflow.com/a/34749873)
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}


function mergeDeep(target, ...sources) {
  if (!sources.length) {
      return target;
  }

  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
            Object.assign(target, { [key]: {} });
        }

        mergeDeep(target[key], source[key]);

      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}




// stream functions
function mergeYamlConfig() {
    function transform(file, cb) {
        var filename = file.path.replace(file.base, '');

        if (filename.endsWith('.config')) {
            // load modifiable YAML representations of config files
            var newConfig = new YAWN(
                fs.readFileSync(
                    path.join(__dirname, 'src', 'config', filename),
                    'utf8'
                )
            );
            var oldConfig = new YAWN(
                fs.readFileSync(
                    path.join(__dirname, 'app', 'config', filename),
                    'utf8'
                )
            );

            // merge the config files
            newConfig.json = mergeDeep(
                newConfig.json,
                oldConfig.json
            );

            // write changed output
            file.contents = new Buffer(
              newConfig.yaml
            );
        }

        // run callback to complete pipe
        cb(null, file);
    }

    return es.map(transform);
}




// tasks
gulp.task('styles_mirror', function () {
    gulp
        .src('src/css/mirror.styl')
        .pipe(
            $.stylus(
                {
                    use: [
                        jeet()
                    ]
                }
            )
        )
        .pipe($.autoprefixer())
        .pipe(
            $.if(
                !isDevelopment, $.csso()
            )
        )
        .pipe(gulp.dest('app/css'));
});


gulp.task('styles_admin', function () {
    gulp
        .src('src/css/admin.styl')
        .pipe($.stylus(
            {
                use: [jeet()]
            }
        ))
        .pipe($.autoprefixer())
        .pipe(
            $.if(
                !isDevelopment, $.csso()
            )
        )
        .pipe(gulp.dest('app/css'));
});


gulp.task('styles_modules', function () {
    gulp
        .src('src/modules/**/*.styl')
        .pipe($.stylus(
            {
                use: [jeet()]
            }
        ))
        .pipe($.autoprefixer())
        .pipe(
            $.if(
                !isDevelopment, $.csso()
            )
        )
        .pipe(gulp.dest('app/modules'));
});


gulp.task('scripts_mirror', function () {
    gulp
        .src([
            'src/js/base.js',
            'src/js/mirror.js'
        ])
        .pipe($.concat('mirror.js'))
        .pipe(
            $.if(
                !isDevelopment, $.uglify()
            )
        )
        .pipe(gulp.dest('app/js'));
});


gulp.task('scripts_admin', function () {
    gulp
        .src([
            'src/js/base.js',
            'src/js/admin.js'
        ])
        .pipe($.concat('admin.js'))
        .pipe(
            $.if(
                !isDevelopment, $.uglify()
            )
        )
        .pipe(gulp.dest('app/js'));
});


gulp.task('scripts_ondemand', function () {
    gulp
        .src([
            'src/js/preload.js',
            'src/js/lib_ondemand/*.js'
        ])
        .pipe(
            $.if(
                !isDevelopment, $.uglify()
            )
        )
        .pipe(gulp.dest('app/js'));
});


gulp.task('scripts_ultimirror', function () {
    gulp
        .src([
            'src/js/ultimirror/*.js'
        ])
        .pipe(
            $.if(
                !isDevelopment, $.uglify()
            )
        )
        .pipe(gulp.dest('app/js/ultimirror'));
});


gulp.task('scripts_modules', function () {
    gulp
        .src([
            'src/modules/**/*.js'
        ])
        .pipe(
            $.if(
                !isDevelopment, $.uglify()
            )
        )
        .pipe(gulp.dest('app/modules'));
});


gulp.task('transfer_config', function () {
    // merge and copy config files
    gulp
        .src([
            'src/config/**',
        ])
        .pipe(mergeYamlConfig())
        .pipe(gulp.dest('app/config'));
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
            'src/modules/**/*.config',
            'src/modules/**/*.json'
        ])
        .pipe($.newer('app/modules'))
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


gulp.task('transfer_fonts', function () {
    // optimise images
    gulp
        .src('src/fonts/**')
        .pipe($.newer('app/fonts'))
        .pipe(gulp.dest('app/fonts'));
});


gulp.task('images', function () {
    // optimise images
    gulp
        .src('src/img/**')
        .pipe($.newer('app/img'))
        .pipe($.imagemin({ progressive: true }))
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
        .pipe($.newer('app/modules'))
        .pipe($.imagemin({ progressive: true }))
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
        'transfer_config',
        'transfer_modules',
        'transfer_pages',
        'transfer_layouts',
        'transfer_templates',
        'transfer_fonts',
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
            .pipe($.clean());
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
    gulp.watch(['src/config/**'], ['transfer_config']);
    gulp.watch(['src/modules/**/*.html', 'src/modules/**/*.json'], ['transfer_modules']);
    gulp.watch(['src/modules/**/img/*'], ['images_modules']);

    gulp.watch(['src/*.html'], ['transfer_pages']);

    gulp.watch(['src/layouts/**/*.html'], ['transfer_layouts']);
    gulp.watch(['src/templates/**/*.html'], ['transfer_templates']);

    gulp.watch(['src/js/*'], ['scripts_mirror', 'scripts_admin']);
    gulp.watch(['src/js/preload.js', 'src/js/lib_ondemand/**'], ['scripts_ondemand']);
    gulp.watch(['src/js/ultimirror/**'], ['scripts_ultimirror']);

    gulp.watch(['src/img/**'], ['images']);
});