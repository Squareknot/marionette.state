;(function (Bb, Mn, _) {
  var changeMatcher = /^change:(.+)/;
  var spaceMatcher = /\s+/;

  // Call all handlers optionally with a value (given a named attribute 'attr')
  function callHandlers(target, entity, handlers, attr) {
    var value = attr ? entity.get(attr) : undefined;

    if (_.isFunction(handlers)) {
      handlers.call(target, entity, value);
    }
    else {
      var handlerKeys = handlers.split(spaceMatcher);
      _.each(handlerKeys, function (handlerKey) {
        target[handlerKey](entity, value);
      });
    }
  }

  // Sync 'target' with event 'event1' and its handlers 'handler1 handler2', depending on event
  // and entity type.  Call value handlers for Backbone.Model 'change:attr' events, and call generic
  // handlers for Backbone.Model 'change', 'all' or Backbone.Collection 'change', 'all', or 'reset'.
  function syncBinding(target, entity, event, handlers) {
    var changeMatch;
    if (event === 'change' || event === 'all'
        || (entity instanceof Bb.Collection && event === 'reset')) {
      callHandlers(target, entity, handlers);
    }
    else if (entity instanceof Bb.Model && (changeMatch = event.match(changeMatcher))) {
      var attr = changeMatch[1];
      callHandlers(target, entity, handlers, attr);
    }
  }

  // Sync 'target' with an array of events ['event1', 'event2'] and their handlers
  // 'handler1 handler2'.
  function syncBindings(target, entity, events, handlers) {
    _.each(events, function (event) {
      syncBinding(target, entity, event, handlers);
    });
  }

  // Sync 'target' with the bindings hash { 'event1 event 2': 'handler1 handler2' }.
  function syncBindingsHash(target, entity, bindings) {
    _.each(bindings, function (handlers, eventStr) {
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
    this.event = event;
    this.eventObj = eventObj;
    this.syncBindingsHash = _.partial(syncBindingsHash, this.target, this.entity, this.bindings);
    this.when = true;

    this.target.__syncingEntityEvents = this.target.__syncingEntityEvents || [];
    this.target.__syncingEntityEvents.push(this);
    this.target.listenTo(this.eventObj, this.event, this.syncBindingsHash);
    return this;
  };

  Syncing.prototype.now = function () {
    syncBindingsHash(this.target, this.entity, this.bindings);
    return this;
  };

  _.extend(Mn.State, {

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
    syncEntityEvents: function (target, entity, bindings, event) {
      Mn.bindEntityEvents(target, entity, bindings);
      var syncing = new Syncing(target, entity, bindings);
      if (event) {
        syncing.when(event);
      } else {
        syncing.now();
      }
    },

    // Ceases syncing entity events.
    stopSyncingEntityEvents: function (target, entity, bindings) {
      Mn.unbindEntityEvents(target, entity, bindings);
      if (!target.__syncingEntityEvents) {
        return;
      }
      _.each(target.__syncingEntityEvents, function (syncing) {
        if (syncing.when) {
          target.stopListening(syncing.eventObj, syncing.event, syncing.handler);
        }
      });
    }
  });
})(Bb, Mn, _);
