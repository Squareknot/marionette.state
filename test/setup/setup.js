var _ = require('underscore');
var $ = require('jquery');
var Bb = require('backbone');
Bb.$ = $;
var Mn = require('backbone.marionette');
var State = require('../../src/');

global._ = _;
global.$ = $;
global.Bb = Bb;
global.Mn = Mn;
global.Mn.State = State;

export default function() {
  global.expect = global.chai.expect;

  beforeEach(function() {
    this.sandbox = global.sinon.sandbox.create();
    global.stub = this.sandbox.stub.bind(this.sandbox);
    global.spy = this.sandbox.spy.bind(this.sandbox);
  });

  afterEach(function() {
    delete global.stub;
    delete global.spy;
    this.sandbox.restore();
  });
}
