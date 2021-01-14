'use strict'
const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const fs = require('fs');
const del = require('del');
const path = require('path');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const webpackConfig = require('./webpack.config');
const eslintReporter = require('eslint-html-reporter');
const today = {};
today.date = new Date();
today.year = today.date.getFullYear();
today.month = ('0' + (today.date.getMonth() + 1)).slice(-2);
today.day = ('0' + today.date.getDate()).slice(-2);
const filePath = {
  sass: {
    direct:'sass/',
    in: 'sass/**/*.scss',
    out: 'dist/assets/css/'
  },
  script: {
    lib: ['script/lib/library/*.js', 'script/lib/plugin/*.js'],
    app: ['script/module/*.js', 'script/app/*.js'],
    out: 'dist/assets/js/'
  },
  lint: {
    direct: 'lint/',
    eslintrc: 'lint/setting/.eslintrc.js',
    eslintReport: 'lint/eslint_report.html',
    htmlReport: 'lint/assets/validation-report.json',
    htmlStatus: 'lint/assets/validation-status.json',
    htmlLintTemplate: 'lint/assets/w3c_report.ejs'
  },
  ejs: {
    all: 'ejs/**/*.ejs',
    html: ['ejs/**/*.ejs', '!' + 'ejs/**/_*.ejs', '!' + 'ejs/**/*_php.ejs'],
    php: 'ejs/**/*_php.ejs'
  },
  other: {
    dist: 'dist/',
    distAllFiles: 'dist/**/*',
    archives: 'archives/',
    html: 'dist/**/*.html',
    dust: [
      'dist/**/*.ejs',
      'dist/**/.DS_Store',
      'dist/**/Thumbs.db',
      'dist/**/desktop.ini'
    ]
  }
};

//シングルタスク
gulp.task('sass', () => {
  return gulp
    .src(filePath.sass.in)
    .pipe($.plumber())
    .pipe($.cached('sass'))
    .pipe($.sassPartialsImported(filePath.sass.direct))
    .pipe($.sourcemaps.init())
    .pipe($.sass())
    .pipe(
      $.pleeease({
        autoprefixer: {
          browsers: ['last 2 versions', 'Firefox ESR', 'ie 11']
        },
        minifier: false,
        mqpacker: false
      })
    )
    .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest(filePath.sass.out));
});

gulp.task('ejs', callback => {
  gulp
    .src(filePath.ejs.html)
    .pipe($.plumber())
    .pipe(
      $.data(file => {
        return {
          filename: file.path
        };
      })
    )
    .pipe($.ejs({}, {}, { ext: '.html' }))
    .pipe(
      $.htmlBeautify({
        extra_liners: [],
        indent_size: 2,
        preserve_newlines:"disables",
        content_unformatted:[],
        unformatted:['i','b','strong','em','rt','rp','br','ins','del','time'],
        max_preserve_newlines: 0,
        wrap_line_length: 0
      })
    )
    .pipe(gulp.dest(filePath.other.dist));

  gulp
    .src(filePath.ejs.php)
    .pipe($.plumber())
    .pipe(
      $.data(file => {
        return {
          filename: file.path
        };
      })
    )
    .pipe(
      $.rename(path => {
        path.basename = path.basename.replace(/\_php/, '');
      })
    )
    .pipe($.ejs({}, {}, { ext: '.php' }))
    .pipe(gulp.dest(filePath.other.dist));

  callback();
});

gulp.task('concat', () => {
  return gulp
    .src(filePath.script.lib)
    .pipe($.concat('lib.js'))
    .pipe(gulp.dest(filePath.script.out));
});

gulp.task('babel', () => {
  return webpackStream(webpackConfig, webpack).pipe(
    gulp.dest(filePath.script.out)
  );
});

gulp.task('clean', () => {
  return del(filePath.other.dust);
});

gulp.task('createArchive', callback => {
  gulp
    .src(filePath.other.distAllFiles)
    .pipe($.zip('archive_' + today.year + today.month + today.day + '.zip'))
    .pipe(gulp.dest(filePath.other.archives));
  callback();
});

gulp.task('createW3cReport', () => {
  return gulp.src(filePath.other.html).pipe(
    $.w3cHtmlValidation({
      statusPath: filePath.lint.htmlStatus,
      reportpath: filePath.lint.htmlReport
    })
  );
});

gulp.task('compileW3cReport', () => {
  let json = JSON.parse(fs.readFileSync(filePath.lint.htmlReport, 'utf8'));
  for (let i = 0; i < json.length; i++) {
    json[i].error = json[i].error.filter(value => {
      return !(
        value.message.match(/Attribute “v-/) ||
        value.message.match(/Attribute “:/) ||
        (value.message.match(
          /Element “img” is missing required attribute “src”\./
        ) &&
          value.errSrcToHighlight.match(/:src/))
      );
    });
  }
  return gulp
    .src(filePath.lint.htmlLintTemplate)
    .pipe($.ejs({ jsonData: json }, {}, { ext: '.html' }))
    .pipe(gulp.dest(filePath.lint.direct));
});

gulp.task('eslint', () => {
  return gulp
    .src(filePath.script.app)
    .pipe($.eslint(filePath.lint.eslintrc))
    .pipe(
      $.eslint.format(eslintReporter, results => {
        fs.writeFileSync(filePath.lint.eslintReport, results);
      })
    );
});

gulp.task('prettier', callback => {
  gulp
    .src(filePath.script.app.concat(filePath.sass.in))
    .pipe(
      $.prettierPlugin(
        {
          singleQuote: true
        },
        undefined
      )
    )
    .pipe(gulp.dest(file => file.base));
  callback();
});

//監視タスク
gulp.task('watch', () => {
  gulp.watch(filePath.ejs.all, gulp.task('ejs'));
  gulp.watch(filePath.sass.in, gulp.task('sass'));
  gulp.watch(filePath.script.lib, gulp.task('concat'));
  gulp.watch(filePath.script.app, gulp.task('babel'));
});

//複数処理タスク
gulp.task(
  'getZip',
  gulp.series('ejs', 'sass', 'concat', 'babel', 'clean', 'createArchive')
);
gulp.task('htmlLint', gulp.series('createW3cReport', 'compileW3cReport'));
gulp.task('lint', gulp.series('prettier', gulp.parallel('htmlLint', 'eslint')));
gulp.task('default', gulp.parallel('watch', 'clean'));
