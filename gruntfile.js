module.exports = function (grunt) {

  require('load-grunt-tasks')(grunt);

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      version: '<%= pkg.version %>',
      banner: '// Marionette.State v<%= meta.version %>\n'
    },

    clean: {
      build: 'build'
    },

    preprocess: {
      state: {
        src: 'src/wrapper.js',
        dest: 'build/marionette.state.js'
      }
    },

    concat: {
      options: {
        banner: '<%= meta.banner %>'
      },
      state: {
        src: '<%= preprocess.state.dest %>',
        dest: '<%= preprocess.state.dest %>'
      }
    },

    uglify: {
      options: {
        banner: '<%= meta.banner %>'
      },
      state: {
        src: '<%= preprocess.state.dest %>',
        dest: 'build/marionette.state.min.js',
        options: {
          sourceMap: true
        }
      }
    },

    mochaTest: {
      spec: {
        options: {
          require: 'test/setup/node.js',
          reporter: 'dot',
          clearRequireCache: true,
          mocha: require('mocha')
        },
        src: [
          'test/setup/helpers.js',
          'test/spec/*.js'
        ]
      }
    },

    jshint: {
      state: {
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

  grunt.registerTask('test', 'Test the library', [
    'lint',
    'mochaTest'
  ]);

  grunt.registerTask('build', 'Build the library', [
    'clean',
    'test',
    'preprocess:state',
    'concat',
    'uglify'
  ]);
};
