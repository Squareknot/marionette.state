/* global define */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([
      'backbone',
      'marionette',
      'underscore'
    ], function (Backbone, Marionette, _) {
      return factory(Backbone, Marionette, _);
    });
  }
  else if (typeof exports !== 'undefined') {
    var Backbone = require('backbone');
    var Marionette = require('marionette');
    var _ = require('underscore');
    module.exports = factory(Backbone, Marionette, _);
  }
  else {
    factory(root.Backbone, root.Backbone.Marionette, root._);
  }
}(this, function (Bb, Mn, _) {
  'use strict';

  // @include state.js
  // @include state.behavior.js
  // @include state.functions.js

  return Mn.State;
}));
