global.chai = require('chai');
global.sinon = require('sinon');
global.chai.use(require('sinon-chai'));

var jsdom = require('jsdom').jsdom;
global.document = jsdom('<html><head><script></script></head><body></body></html>');
global.window = global.document.defaultView;
global.navigator = global.window.navigator;

require('babel/register');
require('./setup')();
