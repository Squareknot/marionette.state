/* global define */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([
      'backbone',
      'backbone.marionette',
      'underscore'
    ], function (Backbone, Marionette, _) {
      return factory(Backbone, Marionette, _);
    });
  }
  else if (typeof exports !== 'undefined') {
    var Backbone = require('backbone');
    var Marionette = require('backbone.marionette');
    var _ = require('underscore');
    module.exports = factory(Backbone, Marionette, _);
  }
  else {
    factory(root.Backbone, root.Backbone.Marionette, root._);
  }
}(this, function (Bb, Mn, _) {
  'use strict';

  // @include marionette.state-service.js

  return Mn.StateService;
}));
