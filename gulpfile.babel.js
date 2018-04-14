import { argv } from 'yargs';
import path from 'path';
import runSequence  from 'run-sequence';
import gulp  from 'gulp';
import jeet from 'jeet';
import YAWN from 'yawn-yaml/cjs';
import es from 'event-stream';
import fs from 'fs';
import Chalk from 'chalk';

import gulpLoadPlugins from 'gulp-load-plugins';

import { default as uglify } from 'gulp-uglify-es';


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
let mergeYamlConfig = function () {
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


let merge_module_config = function (moduleName, moduleConfigStr, configFileName) {
    // load modifiable YAML representations of config files
    var moduleConfig = new YAWN(
        moduleConfigStr
    );
    var fullConfig = new YAWN(
        fs.readFileSync(
            path.join(__dirname, 'app', 'config', configFileName),
            'utf8'
        )
    );


    //
    if ((typeof fullConfig.json.moduleConfig !== 'object') || (typeof fullConfig.json.moduleConfig[moduleName] !== 'object')) {
        console.log(
            Chalk.white.bgRed(
                `- "${moduleName}" config doesn't exist in ${configFileName}`
            )
        );

        // ensure we have the root level moduleConfig structure
        if (typeof fullConfig.json.moduleConfig !== 'object') {
            fullConfig.yaml += '\n\nmoduleConfig:\n';
        } else {
            fullConfig.yaml += '\n\n';
        }

        // prepend MODULENAME YAML structure
        moduleConfig.yaml = `  ${moduleName}:\n    ` + moduleConfig.yaml.replace(/\n/g, '\n    ');

        // append new moduleConfig to the end of the full config file
        fullConfig.yaml += moduleConfig.yaml;

    } else {
        console.log(
            Chalk.white.bgGreen(
                `- "${moduleName}" config already exists in ${configFileName}`
            )
        );

        // prepend full moduleConfig/MODULENAME YAML structure
        moduleConfig.yaml = `moduleConfig:\n  ${moduleName}:\n    ` + moduleConfig.yaml.replace(/\n/g, '\n    ');

        // merge the config files
        fullConfig.json = mergeDeep(
            moduleConfig.json,
            fullConfig.json
        );
    }


    return fullConfig.yaml;
};


let install_module = function (moduleName) {
    console.log(
        Chalk.white.bgBlue(
            `Installing "${moduleName}" module...`
        )
    );


    // attempt to load the module config
    let moduleConfigStr;

    try {
        moduleConfigStr = fs.readFileSync(
            path.join(__dirname, 'src', 'modules', moduleName, `${moduleName}.config`),
            'utf8'
        );

    } catch (e) {
        // some modules do not have a config file
        return;
    }


    // merge module config into each existing full config file...
    fs
        .readdirSync(path.join(__dirname, 'app', 'config'))
            .forEach(
                function (configFileName) {
                    // merge and write new config file
                    fs.writeFileSync(
                        path.join(__dirname, 'app', 'config', configFileName),
                        merge_module_config(
                            moduleName,
                            moduleConfigStr,
                            configFileName
                        )
                    )
                }
            );
};




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
                !isDevelopment, uglify()
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
                !isDevelopment, uglify()
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
                !isDevelopment, uglify()
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
                !isDevelopment, uglify()
            )
        )
        .on('error', function(error) {
          console.log(error);
        })
        .pipe(gulp.dest('app/js/ultimirror'));
});


gulp.task('scripts_modules', function () {
    gulp
        .src([
            'src/modules/**/*.js'
        ])
        .pipe(
            $.if(
                !isDevelopment, uglify()
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
        .pipe(gulp.dest('app/config'))
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
    // copy fonts
    gulp
        .src('src/fonts/**')
        .pipe($.newer('app/fonts'))
        .pipe(gulp.dest('app/fonts'));
});


gulp.task('transfer_favicon', function () {
    // copy favicon
    gulp
        .src('src/favicon.ico')
        .pipe(gulp.dest('app'));
});


gulp.task('images', function () {
    // optimise and copy images
    gulp
        .src('src/img/**')
        .pipe($.newer('app/img'))
        .pipe($.imagemin({ progressive: true }))
        .pipe(gulp.dest('app/img'));
});


gulp.task('images_modules', function () {
    // optimise module images
    gulp
        .src('src/modules/**/img/*')
        .pipe($.newer('app/modules'))
        .pipe($.imagemin({ progressive: true }))
        .pipe(gulp.dest('app/modules'));
});




gulp.task('install_module', function (done) {
    // attempt to install a module specified on the command line
    // (gulp install_module --module photos)
    install_module(argv.module);

    done();
});


gulp.task('install_modules', function (done) {
    // for every module, attempt to install it...
    fs.readdirSync(path.join(__dirname, 'src', 'modules'))
        .forEach(
            function (moduleName) {
                install_module(moduleName);
            }
        );

    done();
});




// define workflow tasks
gulp.task(
    'default',
    [
        'styles',
        'scripts',
        'transfer',
        'images_modules',
        'images'
    ]
);


gulp.task(
    'styles',
    [
        'styles_mirror',
        'styles_admin',
        'styles_modules'
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
    'transfer',
    [
        'transfer_config',
        'transfer_modules',
        'transfer_pages',
        'transfer_layouts',
        'transfer_templates',
        'transfer_fonts',
        'transfer_favicon',
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
            'install_modules',
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