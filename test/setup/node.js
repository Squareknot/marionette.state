var sinon = require('sinon');
var chai = require('chai');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);

global.expect = chai.expect;
global.sinon = sinon;

if (!global.document || !global.window) {
  var jsdom = require('jsdom').jsdom;

  global.document = jsdom('<html><head><script></script></head><body></body></html>', {
    features: {
      FetchExternalResources:   ['script'],
      ProcessExternalResources: ['script'],
      MutationEvents:           '2.0',
      QuerySelector:            false
    }
  });

  global.window = global.document.defaultView;
  global.navigator = global.window.navigator;

  global.window.Node.prototype.contains = function (node) {
    return this.compareDocumentPosition(node) & 16;
  };
}

global._ = require('underscore');
global.Bb = require('backbone');
global.Bb.$ = require('jquery');
global.Mn = require('backbone.marionette');
require('../../src/state');
require('../../src/state.behavior');
require('../../src/state.functions');
