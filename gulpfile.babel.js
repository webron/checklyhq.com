import gulp from 'gulp'
import {spawn} from 'child_process'
import hugoBin from 'hugo-bin'
import gutil from 'gulp-util'
import postcss from 'gulp-postcss'
import cssImport from 'postcss-import'
import cssnext from 'postcss-cssnext'
import inlineCss from 'gulp-inline-css'
import sass from 'gulp-sass'
import pug from 'gulp-pug'
import revall from 'gulp-rev-all'
import sequence from 'run-sequence'
import del from 'del'

import BrowserSync from 'browser-sync'
import webpack from 'webpack'
import webpackConfig from './webpack.conf'

const browserSync = BrowserSync.create()

// Hugo arguments
const hugoArgsDefault = ['-d', '../dist', '-s', 'site', '-v']
const hugoArgsPreview = ['--buildDrafts', '--buildFuture']

// Development tasks
gulp.task('hugo', (cb) => buildSite(cb))
gulp.task('hugo-preview', (cb) => buildSite(cb, hugoArgsPreview))

gulp.task('build', (done) => {
  sequence('clean', 'render', 'hash', done)
})

// Build/production tasks
gulp.task('render', ['pug', 'css', 'js', 'fonts'], (cb) => buildSite(cb, [], 'production'))
gulp.task('build-preview', ['pug', 'css', 'js', 'fonts'], (cb) => buildSite(cb, hugoArgsPreview, 'production'))

// Compile pug to HTML
gulp.task('pug', function buildHTML () {
  gulp.src(['./src/layouts/**/*.pug', '!./src/layouts/partials/**/*'])
    .pipe(pug({
      doctype: 'html',
      pretty: false
    }))
    .pipe(gulp.dest('./site/layouts'))
    .pipe(browserSync.stream())
})

// Compile CSS with PostCSS
gulp.task('css', () => (
  gulp.src('./src/scss/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss([cssImport({from: './src/css/main.css'}), cssnext()]))
    .pipe(gulp.dest('./dist/css'))
    .pipe(browserSync.stream())
))

// Compile Javascript
gulp.task('js', (cb) => {
  const myConfig = Object.assign({}, webpackConfig)

  webpack(myConfig, (err, stats) => {
    if (err) throw new gutil.PluginError('webpack', err)
    gutil.log('[webpack]', stats.toString({
      colors: true,
      progress: true
    }))
    browserSync.reload()
    cb()
  })
})

// Move all fonts in a  directory
gulp.task('fonts', () => (
  gulp.src('./src/fonts/**/*')
    .pipe(gulp.dest('./dist/fonts'))
    .pipe(browserSync.stream())
))

gulp.task('assets', () => (
  gulp.src('./src/fonts/**/*')
    .pipe(gulp.dest('./dist/fonts'))
    .pipe(browserSync.stream())
))

gulp.task('hash', () => {
  gulp.src('./dist/**')
    .pipe(revall.revision({ dontRenameFile: [/^\/favicon.ico$/g, '.html', 'sitemap.xml', 'robots.txt', '.woff', '.eot', '.ttf'] }))
    .pipe(gulp.dest('./dist'))
})

gulp.task('inline', function() {
  return gulp.src('./dist/index.html')
    .pipe(inlineCss())
    .pipe(gulp.dest('./dist/index.html'))
})

// Development server with browsersync
gulp.task('server', ['pug', 'hugo', 'css', 'js', 'fonts'], () => {
  browserSync.init({
    server: {
      baseDir: './dist'
    }
  })
  gulp.watch('./src/layouts/**/*.pug', ['pug'])
  gulp.watch('./src/js/**/*.js', ['js'])
  gulp.watch('./src/scss/**/*.scss', ['css'])
  gulp.watch('./src/fonts/**/*', ['fonts'])
  gulp.watch('./site/**/*', ['hugo'])
})

gulp.task('clean', () => {
  return del(['./dist/**/*'])
})

/**
 * Run hugo and build the site
 */
function buildSite (cb, options, environment = 'development') {
  const args = options ? hugoArgsDefault.concat(options) : hugoArgsDefault

  process.env.NODE_ENV = environment

  return spawn(hugoBin, args, {stdio: 'inherit'}).on('close', (code) => {
    if (code === 0) {
      browserSync.reload()
      cb()
    } else {
      browserSync.notify('Hugo build failed :(')
      cb('Hugo build failed')
    }
  })
}
