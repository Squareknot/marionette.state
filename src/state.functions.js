import _ from 'underscore';
import Mn from 'backbone.marionette';
import Bb from 'backbone';
import State from './state';

const modelEventMatcher = /^(?:all|change|change:(.+))$/;
const collectionEventMatcher = /^(?:all|reset)$/;
const spaceMatcher = /\s+/;

// Sync individual event binding 'event1' => 'handler1 handler2'.
function syncBinding(target, entity, event, handlers) {
  var changeOpts = { syncing: true };
  var modelEventMatch;

  // Only certain model/collection events are syncable.
  var collectionMatch =
      entity instanceof Bb.Collection &&
      event.match(collectionEventMatcher);
  var modelMatch =
      (entity instanceof Bb.Model || entity instanceof State) &&
      (modelEventMatch = event.match(modelEventMatcher));
  if (!collectionMatch && !modelMatch) { return; }

  // Collect change event arguments.
  var changeArgs = [entity];
  var changeAttr;
  if (modelEventMatch && (changeAttr = modelEventMatch[1])) {
    changeArgs.push(entity.get(changeAttr));
  }
  changeArgs.push(changeOpts);

  // Call change event handler.
  if (_.isFunction(handlers)) {
    handlers.apply(target, changeArgs);
  } else {
    var handlerKeys = handlers.split(spaceMatcher);
    for (var i = 0; i < handlerKeys.length; i++) {
      var handlerKey = handlerKeys[i];
      target[handlerKey].apply(target, changeArgs);
    }
  }
}

// Sync bindings hash { 'event1 event 2': 'handler1 handler2' }.
export function sync(target, entity, bindings) {
  if (!entity) { throw new Mn.Error('`entity` must be provided.'); }
  if (!bindings) { throw new Mn.Error('`bindings` must be provided.'); }
  for (var eventStr in bindings) {
    var handlers = bindings[eventStr];
    var events = eventStr.split(spaceMatcher);
    for (var i = 0; i < events.length; i++) {
      var event = events[i];
      syncBinding(target, entity, event, handlers);
    }
  }
}

// A stoppable handle on the syncing listener
class Syncing {

  constructor(target, entity, bindings) {
    this.target = target;
    this.entity = entity;
    this.bindings = bindings;
  }

  stop() {
    Mn.unbindEntityEvents(this.target, this.entity, this.bindings);
    this.target.off(this.event, this.handler);
    this.event = this.handler = null;
  }

  _when(event) {
    Mn.bindEntityEvents(this.target, this.entity, this.bindings);
    this.event = event;
    this.handler = _.bind(sync, this, this.target, this.entity, this.bindings);
    this.target
      .on(this.event, this.handler)
      .on('destroy', _.bind(this.stop, this));
  }

  _now() {
    Mn.bindEntityEvents(this.target, this.entity, this.bindings);
    sync(this.target, this.entity, this.bindings);
  }
}

// Binds events handlers located on target to an entity using Marionette.bindEntityEvents, and
// also "syncs" initial state either immediately or whenever target fires a specific event.
//
// Initial state is synced by calling certain handlers at a precise moment.  Only the following
// entity events will sync their handlers: 'all', 'change', 'change:attr', and 'reset'.
//
// Returns a Syncing instance.  While syncing handlers are unbound on target destroy, the syncing
// instance has a single public method stop() for ceasing syncing on target events early.
export function syncEntityEvents(target, entity, bindings, event) {
  var syncing = new Syncing(target, entity, bindings);
  if (event) {
    syncing._when(event);
  } else {
    syncing._now();
  }
  return syncing;
}

// Determine if any of the passed attributes were changed during the last modification of `model`.
export function hasAnyChanged(model, ...attrs) {
  // Support Marionette.State or Backbone.Model performantly.
  if (model._model) { model = model._model; }
  return !!_.chain(model.changed)
    .keys()
    .intersection(attrs)
    .size()
    .value();
}
