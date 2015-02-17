module.exports = function (grunt) {

  require('load-grunt-tasks')(grunt);

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      version: '<%= pkg.version %>',
      banner: '// Marionette.StateService v<%= meta.version %>\n'
    },

    preprocess: {
      stateService: {
        src: 'src/wrapper.js',
        dest: 'build/marionette.state-service.js'
      }
    },

    concat: {
      options: {
        banner: '<%= meta.banner %>'
      },
      stateService: {
        src: '<%= preprocess.stateService.dest %>',
        dest: '<%= preprocess.stateService.dest %>'
      }
    },

    uglify: {
      options: {
        banner: '<%= meta.banner %>'
      },
      stateService: {
        src: '<%= preprocess.stateService.dest %>',
        dest: 'build/marionette.stateService.min.js',
        options: {
          sourceMap: true
        }
      }
    },

    jshint: {
      stateService: {
        options: {
          jshintrc: '.jshintrc'
        },
        src: ['gruntfile.js', 'src/*.js']
      }
    },

    jscs: {
      options: {
        config: '.jscsrc'
      },
      all: ['gruntfile.js', 'src/*.js']
    }
  });

  grunt.registerTask('lint', 'Lint the library', [
    'jshint',
    'jscs'
  ]);

  grunt.registerTask('build', 'Build the library', [
    'lint',
    'preprocess:stateService',
    'concat',
    'uglify'
  ]);

  grunt.registerTask('default', 'An alias of build', [
    'build'
  ]);
};
