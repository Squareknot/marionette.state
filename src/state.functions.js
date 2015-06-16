import _ from 'underscore';
import Backbone from 'backbone';
import Mn from 'backbone.marionette';
import State from './state';

var changeMatcher = /^change:(.+)/;
var spaceMatcher = /\s+/;

// Call all handlers optionally with a value (given a named attribute 'attr')
function callHandlers(target, entity, handlers, attr) {
  var value = attr ? entity.get(attr) : undefined;

  if (_.isFunction(handlers)) {
    handlers.call(target, entity, value);
  } else {
    var handlerKeys = handlers.split(spaceMatcher);
    _.each(handlerKeys, (handlerKey) => {
      target[handlerKey](entity, value);
    });
  }
}

// Sync 'target' with event 'event1' and its handlers 'handler1 handler2', depending on event
// and entity type.  Call value handlers for Backbone.Model 'change:attr' events, and call generic
// handlers for Backbone.Model 'change', 'all' or Backbone.Collection 'change', 'all', or 'reset'.
function syncBinding(target, entity, event, handlers) {
  var changeMatch;
  if (event === 'change' || event === 'all' ||
      (entity instanceof Backbone.Collection && event === 'reset')) {
    callHandlers(target, entity, handlers);
  } else if (
      (entity instanceof Backbone.Model || entity instanceof State) &&
      (changeMatch = event.match(changeMatcher))) {
    var attr = changeMatch[1];
    callHandlers(target, entity, handlers, attr);
  }
}

// Sync 'target' with an array of events ['event1', 'event2'] and their handlers
// 'handler1 handler2'.
function syncBindings(target, entity, events, handlers) {
  _.each(events, (event) => {
    syncBinding(target, entity, event, handlers);
  });
}

// Sync 'target' with the bindings hash { 'event1 event 2': 'handler1 handler2' }.
function sync(target, entity, bindings) {
  _.each(bindings, (handlers, eventStr) => {
    var events = eventStr.split(spaceMatcher);
    syncBindings(target, entity, events, handlers);
  });
}

function Syncing(target, entity, bindings) {
  this.target = target;
  this.entity = entity;
  this.bindings = bindings;
}

Syncing.prototype.when = function (eventObj, event) {
  if (!event) {
    event = eventObj;
    eventObj = this.target;
  }
  this.eventObj = eventObj;
  this.event = event;
  this.handler = () => {
    sync(this.target, this.entity, this.bindings);
  };
  this.target.listenTo(this.eventObj, this.event, this.handler);
  return this;
};

Syncing.prototype.now = function () {
  sync(this.target, this.entity, this.bindings);
  return this;
};

Syncing.stop = function () {
  this.target.stopListening(this.eventObj, this.event, this.handler);
};

var stateFunctions = {

  // Binds 'bindings' handlers located on 'target' to 'entity' using
  // Marionette.bindEntityEvents, but then initializes state by calling handlers:
  //   Backbone.Model
  //     'all'          (model)
  //     'change'       (model)
  //     'change:value' (model, value)
  //   Backbone.Collection
  //     'all'          (collection)
  //     'reset'        (collection)
  //     'change'       (collection)
  //
  // Handlers are called immediately unless 'event' is supplied, in which case handlers will be
  // called every time 'target' triggers 'event'. Views will automatically sync on 'render'
  // unless this argument is supplied.
  //
  // For event mappings with multiple matching events, all handlers are called for each event.
  // For example, the following mapping:
  //   { 'change:foo change:bar': 'doSomething doSomethingElse' }
  // will call:
  //   doSomething(model, model.get('foo'))
  //   doSomethingElse(model, model.get('foo'))
  //   doSomething(model, model.get('bar'))
  //   doSomethingElse(model, model.get('bar'))
  syncEntityEvents(target, entity, bindings, event) {
    Mn.bindEntityEvents(target, entity, bindings);
    var syncing = new Syncing(target, entity, bindings);
    if (event) {
      syncing.when(event);
    } else {
      syncing.now();
    }
  },

  // Ceases syncing entity events.
  // TODO
  stopSyncingEntityEvents(target, entity, bindings, event) {
    target = entity = bindings = event; // Suppress unused
  }
};

export default stateFunctions;
