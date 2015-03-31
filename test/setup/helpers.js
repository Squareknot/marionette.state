function setupTestHelpers() {
  beforeEach(function () {
    this.sinon = global.sinon.sandbox.create();
    global.stub = _.bind(this.sinon.stub, this.sinon);
    global.spy  = _.bind(this.sinon.spy, this.sinon);
  });

  afterEach(function () {
    this.sinon.restore();
    delete global.stub;
    delete global.spy;
  });
}

// When running in node
if (typeof exports !== 'undefined') {
  setupTestHelpers();
}

// When running in the browser
else {
  this.global = window;
  window.mocha.setup('bdd');

  window.expect = window.chai.expect;

  window.onload = function () {
    window.mocha.checkLeaks();
    window.mocha.globals(['stub', 'spy']);
    window.mocha.run();
    setupTestHelpers();
  };
}
